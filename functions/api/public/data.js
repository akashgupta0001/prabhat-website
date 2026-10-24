import { init } from '../../../lib/db.js';
import { json } from '../../../lib/util.js';

const CACHE_KEY = 'https://cache.internal/public-data';

export async function onRequestGet({ env, waitUntil }) {
  const cache = caches.default;
  const key = new Request(CACHE_KEY);
  const hit = await cache.match(key);
  if (hit) return new Response(hit.body, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=20', 'x-cache': 'hit' } });

  await init(env);
  const { results } = await env.DB.prepare(
    "SELECT col, id, data FROM docs WHERE col IN ('cats','vars','feats','brands','products','pages','menu','site') AND substr(id,1,1) <> '_'"
  ).all();
  const by = {};
  for (const r of results) (by[r.col] = by[r.col] || []).push({ ...JSON.parse(r.data), id: r.id });
  const site = Object.fromEntries((by.site || []).map((d) => [d.id, d]));
  const settings = site.settings || {};
  const order = (a, b) => (a.order ?? 1e9) - (b.order ?? 1e9) || String(a.name || a.label || '').localeCompare(String(b.name || b.label || ''));
  const act = (x) => x.active !== false;

  const products = (by.products || []).filter((p) => p.status === 'active').map((p) => {
    const o = {
      id: p.id, name: p.name, sku: p.sku, slug: p.slug, brand: p.brand, catIds: p.catIds || [], varIds: p.varIds || [], featIds: p.featIds || [],
      desc: p.desc || '', img: p.img || '', gallery: p.gallery || [], sizes: p.sizes || [], colours: p.colours || [], material: p.material || '',
      featured: !!p.featured, home: !!p.home, created: p.created || '', seoTitle: p.seoTitle || '', seoDesc: p.seoDesc || '',
    };
    if (settings.showPrices) { o.mrp = p.mrp ?? ''; o.price = p.price ?? ''; }
    return o;
  });

  const body = JSON.stringify({
    settings: {
      company: settings.company, phone: settings.phone, whatsapp: settings.whatsapp, location: settings.location, email: settings.email,
      showPrices: !!settings.showPrices, seoTitle: settings.seoTitle, seoDesc: settings.seoDesc, siteUrl: settings.siteUrl,
    },
    home: site.home_live || null,
    cats: (by.cats || []).filter(act).sort(order),
    vars: (by.vars || []).filter(act).sort(order),
    feats: (by.feats || []).filter(act).sort(order),
    brands: (by.brands || []).filter(act).sort(order),
    menu: (by.menu || []).filter(act).sort(order),
    pages: (by.pages || []).filter((p) => p.status === 'published'),
    products,
  });
  const res = new Response(body, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=20, s-maxage=60' } });
  waitUntil(cache.put(key, res.clone()));
  return res;
}
