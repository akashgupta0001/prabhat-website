import { init } from '../../lib/db.js';
import { json } from '../../lib/util.js';
import { configured, safeEqual, makeSessionCookie, sameOriginWrite, tooManyAttempts, recordAttempt, clearAttempts } from '../../lib/auth.js';

export async function onRequestPost({ request, env }) {
  if (!configured(env)) {
    return json({ error: 'Admin login is not set up yet. Add the ADMIN_USER and ADMIN_PASSWORD secrets in Cloudflare (see SETUP.md).' }, 503);
  }
  if (!sameOriginWrite(request)) return json({ error: 'Request blocked.' }, 403);
  await init(env);
  if (await tooManyAttempts(env, request, 'login', 8, 15 * 60)) {
    return json({ error: 'Too many failed attempts. Please wait 15 minutes and try again.' }, 429);
  }
  let body = {};
  try { body = await request.json(); } catch { /* handled below */ }
  const okUser = await safeEqual(String(body.username || '').trim().toLowerCase(), String(env.ADMIN_USER).trim().toLowerCase());
  const okPass = await safeEqual(body.password || '', env.ADMIN_PASSWORD);
  if (!(okUser && okPass)) {
    await recordAttempt(env, request, 'login');
    await new Promise((r) => setTimeout(r, 500));
    return json({ error: 'Incorrect username or password.' }, 401);
  }
  await clearAttempts(env, request, 'login');
  const secure = new URL(request.url).protocol === 'https:';
  return json({ ok: true, name: String(env.ADMIN_USER) }, 200, { 'set-cookie': await makeSessionCookie(env, String(env.ADMIN_USER), secure) });
}
