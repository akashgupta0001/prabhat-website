import { init, getDoc } from '../../../lib/db.js';
import { bad } from '../../../lib/util.js';
import { listPhotos, photo, isFolderLink } from '../../../lib/dropbox.js';

// /api/dbx/img?p=<productId>&n=<file name>&w=480|960|1600   (or &i=<index> for the first photo on cards)
export async function onRequestGet({ request, env, waitUntil }) {
  const url = new URL(request.url), pid = url.searchParams.get('p') || '';
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(pid)) return bad('Not found.', 404);
  const cache = caches.default, hit = await cache.match(request).catch(() => null);
  if (hit) return hit;
  await init(env);
  const p = await getDoc(env, 'products', pid);
  if (!p || p.status !== 'active' || !isFolderLink(p.dropboxFolder)) return bad('Not found.', 404);
  try {
    let name = url.searchParams.get('n') || '';
    if (!name) {
      const i = Number(url.searchParams.get('i')) || 0, names = await listPhotos(env, p.dropboxFolder);
      name = names[i] || '';
    }
    if (!name || /[\\/]/.test(name)) return bad('Not found.', 404);
    const r = await photo(env, p.dropboxFolder, name, Number(url.searchParams.get('w')) || 960);
    if (!r) return bad('Photo not found.', 404);
    const res = new Response(r.body, { headers: { 'content-type': r.type, 'cache-control': 'public, max-age=604800' } });
    waitUntil(cache.put(request, res.clone()));
    return res;
  } catch (e) { return bad(e.message || 'Dropbox error', e.status || 502); }
}
