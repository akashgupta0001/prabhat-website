import { init } from '../../lib/db.js';
import { json, cleanText, randomId } from '../../lib/util.js';
import { putStmt } from '../../lib/db.js';
import { tooManyAttempts, recordAttempt } from '../../lib/auth.js';

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'Request blocked.' }, 403);
  let b;
  try { b = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  if (b.website) return json({ ok: true }); // honeypot: pretend success to bots

  const name = cleanText(b.name, 120);
  const phone = cleanText(b.phone, 30);
  const message = cleanText(b.message, 2000);
  if (!name) return json({ error: 'Please enter your name.' }, 400);
  if (!/^[0-9+\-\s()]{7,20}$/.test(phone)) return json({ error: 'Please enter a valid phone number.' }, 400);
  if (message.length < 3) return json({ error: 'Please enter your message.' }, 400);

  await init(env);
  if (await tooManyAttempts(env, request, 'enquiry', 6, 600)) return json({ error: 'Too many enquiries from this connection. Please try again in a few minutes.' }, 429);
  await recordAttempt(env, request, 'enquiry');

  const type = b.type === 'wholesale' ? 'wholesale' : b.productId ? 'product' : 'general';
  const id = randomId(12);
  const now = new Date().toISOString();
  const extra = [];
  if (b.business) extra.push('Business: ' + cleanText(b.business, 160));
  if (b.city) extra.push('City: ' + cleanText(b.city, 80));
  if (b.qty) extra.push('Quantity: ' + cleanText(b.qty, 80));
  if (b.productName) extra.push('Product: ' + cleanText(b.productName, 200) + (b.sku ? ' (' + cleanText(b.sku, 60) + ')' : ''));
  await putStmt(env, 'enq', id, {
    id, name, phone, type, productId: cleanText(b.productId, 80), message: (extra.length ? extra.join('\n') + '\n\n' : '') + message,
    source: 'Website form', status: 'New', notes: '', follow: '', created: now, updated: now,
  }).run();
  return json({ ok: true });
}
