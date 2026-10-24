import { init } from '../../lib/db.js';

export async function onRequestGet({ env, params }) {
  const id = String(params.id || '');
  if (!/^[a-z0-9]{8,32}$/.test(id)) return new Response('Not found', { status: 404 });
  await init(env);
  const r = await env.DB.prepare('SELECT mime, data FROM images WHERE id = ?').bind(id).first();
  if (!r) return new Response('Not found', { status: 404 });
  const bin = atob(r.data);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return new Response(out, { headers: { 'content-type': r.mime, 'cache-control': 'public, max-age=31536000, immutable', 'x-content-type-options': 'nosniff' } });
}
