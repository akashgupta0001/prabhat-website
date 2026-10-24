import { json } from '../../lib/util.js';
import { clearCookie } from '../../lib/auth.js';

export async function onRequestPost({ request }) {
  return json({ ok: true }, 200, { 'set-cookie': clearCookie(new URL(request.url).protocol === 'https:') });
}
