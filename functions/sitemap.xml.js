import { init } from '../lib/db.js';

export async function onRequestGet({ env, request }) {
  await init(env);
  const origin = new URL(request.url).origin;
  const { results } = await env.DB.prepare("SELECT data FROM docs WHERE col IN ('products','pages')").all();
  const urls = ['/', '/about', '/mission-vision', '/values', '/brands', '/supremlite', '/ston', '/catalogue', '/wholesale', '/contact', '/privacy', '/terms'];
  for (const r of results) {
    const d = JSON.parse(r.data);
    if (d.status === 'active' && d.slug && d.sku !== undefined) urls.push('/product?s=' + encodeURIComponent(d.slug));
    else if (d.status === 'published' && d.slug) urls.push('/page?s=' + encodeURIComponent(d.slug));
  }
  const esc = (s) => s.replace(/&/g, '&amp;');
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `<url><loc>${esc(origin + u)}</loc></url>`).join('\n') + '\n</urlset>\n';
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}
