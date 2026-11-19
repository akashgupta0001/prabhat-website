// Temporary drop box for the private /c page: text and files that disappear 10 minutes after they are added.
import { init } from '../../lib/db.js';
import { json, bad } from '../../lib/util.js';
import { putImage, getImage, hasR2, maxBytes } from '../../lib/images.js';

const TTL = 10 * 60 * 1000;
const MAX_ITEMS = 40;
const MAX_TEXT = 50000;

async function ready(env) {
  await init(env);
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS drops (id TEXT PRIMARY KEY, kind TEXT NOT NULL, name TEXT, mime TEXT, text TEXT, bytes INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL, expires INTEGER NOT NULL)').run();
}

async function purge(env) {
  const now = Date.now();
  const old = await env.DB.prepare("SELECT id FROM drops WHERE expires <= ? AND kind = 'file'").bind(now).all();
  for (const r of old.results || []) await dropFile(env, r.id);
  await env.DB.prepare('DELETE FROM drops WHERE expires <= ?').bind(now).run();
}

async function dropFile(env, id) {
  try { if (hasR2(env)) await env.IMAGES.delete('img/' + id); } catch { /* ignore */ }
  try { await env.DB.prepare('DELETE FROM images WHERE id = ?').bind(id).run(); } catch { /* ignore */ }
}

const view = (r) => ({ id: r.id, kind: r.kind, name: r.name, text: r.text, bytes: r.bytes, expires: r.expires });
const safeName = (n) => String(n || 'file').replace(/[\\/\r\n"<>:*?|]/g, '_').slice(0, 120) || 'file';

export async function onRequest({ request, env }) {
  await ready(env);
  await purge(env);
  const url = new URL(request.url), m = request.method;
  const noStore = { 'cache-control': 'no-store', 'x-robots-tag': 'noindex' };

  if (m === 'GET' && url.searchParams.get('f')) {
    const id = url.searchParams.get('f');
    if (!/^dr[a-f0-9]{16}$/.test(id)) return bad('Not found.', 404);
    const row = await env.DB.prepare("SELECT * FROM drops WHERE id = ? AND kind = 'file'").bind(id).first();
    const img = row && (await getImage(env, id));
    if (!img) return bad('This file has expired.', 404);
    return new Response(img.body, { headers: { 'content-type': 'application/octet-stream', 'content-disposition': 'attachment; filename="' + safeName(row.name).replace(/[^\x20-\x7e]/g, '_') + '"; filename*=UTF-8\'\'' + encodeURIComponent(safeName(row.name)), 'x-content-type-options': 'nosniff', ...noStore } });
  }

  if (m === 'GET') {
    const rows = await env.DB.prepare('SELECT * FROM drops ORDER BY created DESC').all();
    return json({ now: Date.now(), ttl: TTL, items: (rows.results || []).map(view) }, 200, noStore);
  }

  if (m === 'DELETE') {
    const id = url.searchParams.get('id');
    if (url.searchParams.get('all')) {
      const all = await env.DB.prepare("SELECT id FROM drops WHERE kind = 'file'").all();
      for (const r of all.results || []) await dropFile(env, r.id);
      await env.DB.prepare('DELETE FROM drops').run();
    } else if (id && /^dr[a-f0-9]{16}$/.test(id)) {
      await dropFile(env, id);
      await env.DB.prepare('DELETE FROM drops WHERE id = ?').bind(id).run();
    }
    return json({ ok: true }, 200, noStore);
  }

  if (m === 'POST') {
    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM drops').first();
    if (count && count.n >= MAX_ITEMS) return bad('The window is full. Delete something or wait a few minutes.', 429);
    const now = Date.now(), id = 'dr' + [...crypto.getRandomValues(new Uint8Array(8))].map((x) => x.toString(16).padStart(2, '0')).join('');
    const ct = request.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      let b; try { b = await request.json(); } catch { return bad('Invalid request.'); }
      const text = String(b.text || '');
      if (!text.trim()) return bad('Nothing to add.');
      if (text.length > MAX_TEXT) return bad('Text is too long (limit ' + MAX_TEXT + ' characters).');
      await env.DB.prepare('INSERT INTO drops (id, kind, name, mime, text, bytes, created, expires) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(id, 'text', '', 'text/plain', text, text.length, now, now + TTL).run();
      return json({ ok: true, id }, 200, noStore);
    }
    let fd; try { fd = await request.formData(); } catch { return bad('Invalid upload.'); }
    const f = fd.get('file');
    if (!f || typeof f === 'string') return bad('Choose a file first.');
    const limit = maxBytes(env);
    if (f.size > limit) return bad('File is too large (limit ' + Math.floor(limit / 1024 / 1024 * 10) / 10 + ' MB).', 413);
    if (!f.size) return bad('That file is empty.');
    const buf = await f.arrayBuffer();
    await putImage(env, id, 'application/octet-stream', buf);
    await env.DB.prepare('INSERT INTO drops (id, kind, name, mime, text, bytes, created, expires) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(id, 'file', safeName(f.name), 'application/octet-stream', '', buf.byteLength, now, now + TTL).run();
    return json({ ok: true, id }, 200, noStore);
  }
  return bad('Method not allowed.', 405);
}
