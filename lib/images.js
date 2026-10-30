// Photo storage. Uses Cloudflare R2 (binding IMAGES) when it is connected,
// otherwise stores photos in the D1 database. Each uploaded photo is kept as an
// HD master (id) plus smaller copies (id-480, id-960, id-1600) for phones and
// product cards, so every screen gets a sharp image without loading more than it needs.

export const WIDTHS = [480, 960, 1600];
export const MAX_R2 = 12 * 1024 * 1024; // per file, when R2 is connected
export const MAX_D1 = 1400 * 1024; // per file in D1 (kept under D1's 2 MB value limit after encoding)

export const hasR2 = (env) => !!(env.IMAGES && typeof env.IMAGES.put === 'function');
export const maxBytes = (env) => (hasR2(env) ? MAX_R2 : MAX_D1);

const b64 = (buf) => {
  let s = '';
  const a = new Uint8Array(buf);
  for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode(...a.subarray(i, i + 0x8000));
  return btoa(s);
};
const unb64 = (str) => {
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

export async function putImage(env, key, mime, buf) {
  if (hasR2(env)) {
    await env.IMAGES.put('img/' + key, buf, { httpMetadata: { contentType: mime, cacheControl: 'public, max-age=31536000, immutable' } });
  } else {
    await env.DB.prepare('INSERT OR REPLACE INTO images (id, mime, data, bytes, created) VALUES (?, ?, ?, ?, ?)')
      .bind(key, mime, b64(buf), buf.byteLength, new Date().toISOString()).run();
    return;
  }
  // keep a size record in D1 so the panel's storage meter stays accurate
  await env.DB.prepare('INSERT OR REPLACE INTO images (id, mime, data, bytes, created) VALUES (?, ?, ?, ?, ?)')
    .bind(key, mime, 'r2', buf.byteLength, new Date().toISOString()).run();
}

// Returns { mime, body } or null.
export async function getImage(env, key) {
  if (hasR2(env)) {
    const o = await env.IMAGES.get('img/' + key);
    if (o) return { mime: (o.httpMetadata && o.httpMetadata.contentType) || 'application/octet-stream', body: o.body };
  }
  const r = await env.DB.prepare('SELECT mime, data FROM images WHERE id = ?').bind(key).first();
  if (!r || r.data === 'r2') return null;
  return { mime: r.mime, body: unb64(r.data) };
}

// Removes a photo and its smaller copies, but only when nothing on the site still uses it.
// Returns true when it was removed.
export async function deleteImageIfUnused(env, id) {
  const used = await env.DB.prepare('SELECT 1 AS x FROM docs WHERE instr(data, ?) > 0 LIMIT 1').bind('"' + id + '"').first();
  if (used) return false;
  const keys = [id, ...WIDTHS.map((w) => id + '-' + w)];
  if (hasR2(env)) await Promise.all(keys.map((k) => env.IMAGES.delete('img/' + k).catch(() => {})));
  await env.DB.batch(keys.map((k) => env.DB.prepare('DELETE FROM images WHERE id = ?').bind(k)));
  return true;
}
