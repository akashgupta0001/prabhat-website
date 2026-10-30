// Dropbox folder support: lists the photos inside a shared Dropbox folder link and serves resized copies.
// Uses a Dropbox app connection (key, secret and refresh token) stored privately in the database.
import { getDoc, putStmt } from './db.js';

const TOKEN_KEY = 'https://cache.internal/dbx-token';
const IMG_EXT = /\.(jpe?g|png|gif|webp|bmp|tiff?)$/i;
const SIZES = { 480: 'w480h320', 960: 'w1024h768', 1600: 'w2048h1536' };
export const sizeFor = (w) => SIZES[w] || SIZES[1600];

const asciiArg = (o) => JSON.stringify(o).replace(/[\u007f-￿]/g, (c) => '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4));

export const getCreds = (env) => getDoc(env, 'site', '_dropbox');
export const authUrl = (key) => 'https://www.dropbox.com/oauth2/authorize?client_id=' + encodeURIComponent(key) + '&response_type=code&token_access_type=offline';

async function tokenRequest(params) {
  const r = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error_description || j.error || 'Dropbox refused the request (' + r.status + ')');
  return j;
}

// Called once from the admin panel with the code Dropbox shows after you allow access.
export async function connect(env, { key, secret, code }) {
  const j = await tokenRequest({ code, grant_type: 'authorization_code', client_id: key, client_secret: secret });
  if (!j.refresh_token) throw new Error('Dropbox did not send a refresh token. Use the authorization link from this page and try again.');
  await putStmt(env, 'site', '_dropbox', { key, secret, refresh: j.refresh_token, connected: new Date().toISOString() }).run();
  try { await caches.default.delete(new Request(TOKEN_KEY)); } catch { /* ignore */ }
}

async function accessToken(env) {
  const cache = caches.default;
  const hit = await cache.match(new Request(TOKEN_KEY)).catch(() => null);
  if (hit) { const t = await hit.text(); if (t) return t; }
  const c = await getCreds(env);
  if (!c || !c.refresh) throw Object.assign(new Error('Dropbox is not connected yet.'), { status: 503 });
  const j = await tokenRequest({ grant_type: 'refresh_token', refresh_token: c.refresh, client_id: c.key, client_secret: c.secret });
  const ttl = Math.max(60, (j.expires_in || 14400) - 300);
  await cache.put(new Request(TOKEN_KEY), new Response(j.access_token, { headers: { 'cache-control': 'max-age=' + ttl } })).catch(() => {});
  return j.access_token;
}

const natural = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

// Names of the photos at the top level of a shared folder link, in natural order.
export async function listPhotos(env, url) {
  const token = await accessToken(env);
  const headers = { authorization: 'Bearer ' + token, 'content-type': 'application/json' };
  let r = await fetch('https://api.dropboxapi.com/2/files/list_folder', { method: 'POST', headers, body: JSON.stringify({ path: '', shared_link: { url }, limit: 500 }) });
  const names = [];
  for (let n = 0; n < 6; n++) {
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error((j.error_summary || 'Dropbox could not open this folder link.')), { status: r.status === 409 ? 404 : 502 });
    for (const e of j.entries || []) if (e['.tag'] === 'file' && IMG_EXT.test(e.name)) names.push(e.name);
    if (!j.has_more) break;
    r = await fetch('https://api.dropboxapi.com/2/files/list_folder/continue', { method: 'POST', headers, body: JSON.stringify({ cursor: j.cursor }) });
  }
  return names.sort(natural).slice(0, 60);
}

// A resized JPEG of one photo (falls back to the original file if Dropbox cannot make a thumbnail).
export async function photo(env, url, name, w) {
  const token = await accessToken(env);
  const resource = { '.tag': 'link', url, path: '/' + name };
  let r = await fetch('https://content.dropboxapi.com/2/files/get_thumbnail_v2', {
    method: 'POST', headers: { authorization: 'Bearer ' + token, 'Dropbox-API-Arg': asciiArg({ resource, format: 'jpeg', size: sizeFor(w) }) },
  });
  if (r.ok) return { body: r.body, type: 'image/jpeg' };
  r = await fetch('https://content.dropboxapi.com/2/sharing/get_shared_link_file', {
    method: 'POST', headers: { authorization: 'Bearer ' + token, 'Dropbox-API-Arg': asciiArg({ url, path: '/' + name }) },
  });
  if (!r.ok) return null;
  return { body: r.body, type: r.headers.get('content-type') || 'image/jpeg' };
}

export const isFolderLink = (u) => {
  try { const x = new URL(u); return /(^|\.)dropbox\.com$/.test(x.hostname) && /^\/(scl\/fo|sh)\//.test(x.pathname); } catch { return false; }
};
