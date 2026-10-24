import { init } from '../../lib/db.js';
import { getImage, WIDTHS } from '../../lib/images.js';

// /img/<id>          -> the HD master photo
// /img/<id>?w=960    -> the 960px copy (falls back to the HD master for older photos)
export async function onRequestGet({ request, env, params, waitUntil }) {
  const id = String(params.id || '');
  if (!/^[a-z0-9]{8,32}$/.test(id)) return new Response('Not found', { status: 404 });

  const url = new URL(request.url);
  const w = Number(url.searchParams.get('w')) || 0;
  const width = WIDTHS.includes(w) ? w : 0;

  // Serve from Cloudflare's edge cache when possible (saves database reads).
  const cacheKey = new Request(url.origin + '/img/' + id + (width ? '?w=' + width : ''));
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  if (cache) {
    const hit = await cache.match(cacheKey).catch(() => null);
    if (hit) return hit;
  }

  await init(env);
  let img = width ? await getImage(env, id + '-' + width) : null;
  if (!img) img = await getImage(env, id);
  if (!img) return new Response('Not found', { status: 404 });

  const res = new Response(img.body, {
    headers: {
      'content-type': img.mime,
      'cache-control': 'public, max-age=31536000, immutable',
      'x-content-type-options': 'nosniff',
    },
  });
  if (cache) {
    const copy = res.clone();
    const put = cache.put(cacheKey, copy).catch(() => {});
    if (waitUntil) waitUntil(put);
  }
  return res;
}
