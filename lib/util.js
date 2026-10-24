export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });

export const bad = (msg, status = 400) => json({ error: msg }, status);

export const COLLECTIONS = ['cats', 'vars', 'feats', 'brands', 'products', 'pages', 'menu', 'enq', 'activity', 'site', 'notes'];
export const ID_RE = /^[A-Za-z0-9_-]{1,80}$/;

export function randomId(len = 12) {
  const b = new Uint8Array(len);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => 'abcdefghijklmnopqrstuvwxyz0123456789'[x % 36]).join('');
}

export function clientIp(request) {
  return request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'local';
}

export function cleanText(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);
}
