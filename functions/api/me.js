import { json } from '../../lib/util.js';
import { getUser, configured } from '../../lib/auth.js';

export async function onRequestGet({ request, env }) {
  const u = await getUser(request, env);
  return json({ user: u, configured: configured(env) });
}
