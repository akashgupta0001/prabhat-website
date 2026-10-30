import { init, getDoc } from '../../../lib/db.js';
import { json, bad } from '../../../lib/util.js';
import { listPhotos, isFolderLink } from '../../../lib/dropbox.js';

// /api/dbx/list?p=<productId> -> the photos in that product's Dropbox folder
export async function onRequestGet({ request, env, waitUntil }) {
  const url = new URL(request.url), pid = url.searchParams.get('p') || '';
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(pid)) return bad('Not found.', 404);
  const key = new Request(url.origin + '/api/dbx/list?p=' + pid), cache = caches.default;
  const hit = await cache.match(key).catch(() => null);
  if (hit) return hit;
  await init(env);
  const p = await getDoc(env, 'products', pid);
  if (!p || p.status !== 'active' || !isFolderLink(p.dropboxFolder)) return bad('Not found.', 404);
  try {
    const names = await listPhotos(env, p.dropboxFolder);
    const res = json({ images: names.map((n) => '/api/dbx/img?p=' + pid + '&n=' + encodeURIComponent(n)) }, 200, { 'cache-control': 'public, max-age=300' });
    waitUntil(cache.put(key, res.clone()));
    return res;
  } catch (e) { return bad(e.message || 'Dropbox error', e.status || 502); }
}
