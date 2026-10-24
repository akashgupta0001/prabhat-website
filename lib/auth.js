// Username + password login. The credentials live in two Cloudflare secrets
// (ADMIN_USER, ADMIN_PASSWORD). Sessions are signed cookies; the signing key is
// derived from the credentials, so changing the password signs everyone out.
import { json, clientIp } from './util.js';

const enc = new TextEncoder();
const COOKIE = 'pi_session';
const SESSION_SECONDS = 60 * 60 * 12;

const b64url = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function sha256(text) {
  return crypto.subtle.digest('SHA-256', enc.encode(text));
}

async function hmacKey(env) {
  const raw = await sha256(`${env.ADMIN_PASSWORD}|${env.ADMIN_USER}|prabhat-industries-session-v1`);
  return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

async function sign(env, text) {
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(env), enc.encode(text));
  return b64url(sig);
}

// Compare two strings in constant time by hashing both first.
export async function safeEqual(a, b) {
  const [x, y] = await Promise.all([sha256(String(a)), sha256(String(b))]);
  const xa = new Uint8Array(x), ya = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < xa.length; i++) diff |= xa[i] ^ ya[i];
  return diff === 0;
}

export function configured(env) {
  return !!(env.ADMIN_USER && env.ADMIN_PASSWORD);
}

export async function makeSessionCookie(env, user, secure) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const body = b64url(enc.encode(JSON.stringify({ u: user, exp })));
  const sig = await sign(env, body);
  return `${COOKIE}=${body}.${sig}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${secure ? '; Secure' : ''}`;
}

export function clearCookie(secure) {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`;
}

export async function getUser(request, env) {
  if (!configured(env)) return null;
  const m = (request.headers.get('cookie') || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m) return null;
  const [body, sig] = m[1].split('.');
  if (!body || !sig) return null;
  if (!(await safeEqual(sig, await sign(env, body)))) return null;
  try {
    const p = JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/')));
    if (!p.exp || p.exp < Date.now() / 1000) return null;
    return { name: p.u };
  } catch {
    return null;
  }
}

// Writes must come from our own pages: custom header plus same-origin check.
export function sameOriginWrite(request) {
  if (request.method === 'GET' || request.method === 'HEAD') return true;
  if (request.headers.get('x-requested-with') !== 'pi-admin') return false;
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

export async function tooManyAttempts(env, request, kind, limit, windowSec) {
  const since = Math.floor(Date.now() / 1000) - windowSec;
  const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM attempts WHERE ip = ? AND kind = ? AND ts > ?')
    .bind(clientIp(request), kind, since).first();
  return (r && r.n) >= limit;
}

export async function recordAttempt(env, request, kind) {
  const now = Math.floor(Date.now() / 1000);
  await env.DB.batch([
    env.DB.prepare('INSERT INTO attempts (ip, kind, ts) VALUES (?, ?, ?)').bind(clientIp(request), kind, now),
    env.DB.prepare('DELETE FROM attempts WHERE ts < ?').bind(now - 86400),
  ]);
}

export async function clearAttempts(env, request, kind) {
  await env.DB.prepare('DELETE FROM attempts WHERE ip = ? AND kind = ?').bind(clientIp(request), kind).run();
}

export { json };
