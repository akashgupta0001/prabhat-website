import { init, listCol, getDoc, putStmt, delStmt } from '../../../lib/db.js';
import { json, bad, COLLECTIONS, ID_RE, randomId } from '../../../lib/util.js';
import { getUser, sameOriginWrite } from '../../../lib/auth.js';

const MAX_DOC = 900 * 1024;
const MAX_IMAGE = 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

async function bust() {
  try { await caches.default.delete(new Request('https://cache.internal/public-data')); } catch { /* best effort */ }
}

function check(col, id) {
  if (!COLLECTIONS.includes(col)) return 'Unknown collection.';
  if (id !== undefined && !ID_RE.test(id)) return 'Invalid id.';
  return null;
}

const b64 = (buf) => {
  let s = '';
  const a = new Uint8Array(buf);
  for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode(...a.subarray(i, i + 0x8000));
  return btoa(s);
};

export async function onRequest({ request, env, params }) {
  const user = await getUser(request, env);
  if (!user) return bad('Please sign in.', 401);
  if (!sameOriginWrite(request)) return bad('Request blocked.', 403);
  await init(env);

  const p = params.path || [];
  const m = request.method;
  const [a, col, id] = p;

  // ---- read ----
  if (a === 'col' && m === 'GET') {
    const e = check(col); if (e) return bad(e);
    return json({ docs: await listCol(env, col) });
  }
  if (a === 'doc' && m === 'GET') {
    const e = check(col, id); if (e) return bad(e);
    const d = await getDoc(env, col, id);
    return json({ exists: !!d, data: d });
  }
  if (a === 'storage' && m === 'GET') {
    const r = await env.DB.prepare('SELECT COUNT(*) AS files, COALESCE(SUM(bytes),0) AS bytes FROM images').first();
    return json({ usage: { files: r.files, bytes: r.bytes, maxFiles: 100000, maxBytes: 5 * 1024 * 1024 * 1024 } });
  }

  // ---- write ----
  if (a === 'doc' && (m === 'PUT' || m === 'PATCH')) {
    const e = check(col, id); if (e) return bad(e);
    const text = await request.text();
    if (text.length > MAX_DOC) return bad('Record is too large.', 413);
    let data;
    try { data = JSON.parse(text); } catch { return bad('Invalid JSON.'); }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return bad('Record must be an object.');
    if (m === 'PATCH') data = { ...((await getDoc(env, col, id)) || {}), ...data };
    await putStmt(env, col, id, data).run();
    await bust();
    return json({ ok: true });
  }
  if (a === 'doc' && m === 'DELETE') {
    const e = check(col, id); if (e) return bad(e);
    await delStmt(env, col, id).run();
    await bust();
    return json({ ok: true });
  }
  if (a === 'batch' && m === 'POST') {
    let body;
    try { body = await request.json(); } catch { return bad('Invalid JSON.'); }
    const ops = Array.isArray(body.ops) ? body.ops : [];
    if (!ops.length || ops.length > 400) return bad('Send between 1 and 400 operations.');
    const stmts = [];
    for (const o of ops) {
      const e = check(o.col, o.id); if (e) return bad(e);
      if (o.op === 'delete') stmts.push(delStmt(env, o.col, o.id));
      else if (o.op === 'set' && o.data && typeof o.data === 'object') stmts.push(putStmt(env, o.col, o.id, o.data));
      else return bad('Bad operation.');
    }
    for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
    await bust();
    return json({ ok: true, count: stmts.length });
  }
  if (a === 'upload' && m === 'POST') {
    const type = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!IMAGE_TYPES.includes(type)) return bad('Upload a JPG, PNG, WebP or GIF image.');
    const buf = await request.arrayBuffer();
    if (buf.byteLength > MAX_IMAGE) return bad('Image is larger than 1 MB. Please use a smaller image.', 413);
    if (!buf.byteLength) return bad('Empty file.');
    const newId = randomId(16);
    await env.DB.prepare('INSERT INTO images (id, mime, data, bytes, created) VALUES (?, ?, ?, ?, ?)')
      .bind(newId, type, b64(buf), buf.byteLength, new Date().toISOString()).run();
    return json({ id: newId, url: '/img/' + newId });
  }
  return bad('Not found.', 404);
}
