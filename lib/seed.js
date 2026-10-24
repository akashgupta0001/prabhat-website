// Starting content. Written once, the first time the site runs.
// Everything here can be edited or deleted in the admin panel afterwards.

const tax = (names, extra = {}) =>
  names.map((n, i) => {
    const [name, slug] = Array.isArray(n) ? n : [n, n.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')];
    return { id: slug, data: { name, slug, desc: '', image: '', order: i, active: true, filterVisible: true, ...extra } };
  });

export const HOME = {
  heading: 'Footwear for Every Step.',
  sub: 'Discover a versatile range of footwear from PRABHAT INDUSTRIES, a footwear manufacturing and trading business established in 2015 in Bahadurgarh, Haryana.',
  order: ['hero', 'categories', 'featured', 'brands', 'about', 'testimonials'],
  slides: [
    { id: 's1', title: 'Footwear for every step.', subtitle: 'Discover a versatile range of footwear from PRABHAT INDUSTRIES, established in 2015 in Bahadurgarh, Haryana.', btnLabel: 'Explore catalogue', btnUrl: '/catalogue', img: '', active: true, eyebrow: 'Supremlite | Ston' },
    { id: 's2', title: 'SUPREMLITE', subtitle: 'Explore footwear models available under SUPREMLITE. Enquire about specifications, available sizes, colours and order requirements.', btnLabel: 'View brand', btnUrl: '/supremlite', img: '', active: true, eyebrow: 'Brand' },
    { id: 's3', title: 'STON', subtitle: 'Discover footwear available under STON. Explore the current catalogue and contact our team for product information and availability.', btnLabel: 'View brand', btnUrl: '/ston', img: '', active: true, eyebrow: 'Brand' },
  ],
  sec: {
    brands: { on: true, heading: 'Two brands. One catalogue.', desc: '' },
    categories: { on: true, heading: 'Explore our footwear collection', desc: "Find footwear across men's, women's, kids', sports and slippers. Browse available models by brand and category.", count: 6 },
    featured: { on: true, heading: 'Featured models', desc: 'A selection from the current catalogue.', count: 8, mode: 'featured' },
    about: { on: true, heading: 'Know PRABHAT INDUSTRIES', text: "Established in 2015 and based in Bahadurgarh, Haryana, PRABHAT INDUSTRIES is engaged in footwear manufacturing and trading.\n\nThe company offers a product portfolio covering men's footwear, women's footwear, kids' footwear, sports shoes, slippers and sandals under its brands SUPREMLITE and STON.", img: '' },
    testimonials: { on: false, heading: 'What customers say', items: [] },
  },
  footer: { text: '© PRABHAT INDUSTRIES. All rights reserved.' },
};

export function seedDocs() {
  const d = [];
  const add = (col, list) => list.forEach((x) => d.push({ col, ...x }));

  add('cats', tax([
    ["Men's Footwear", 'mens-footwear'], ["Women's Footwear", 'womens-footwear'], ["Kids' Footwear", 'kids-footwear'],
    ['Sports Shoes', 'sports-shoes'], ['Slippers', 'slippers'], ['Sandals', 'sandals'],
    ['Formal Shoes', 'formal-shoes'], ['Casual Shoes', 'casual-shoes'], ['Boots', 'boots'], ['Other Footwear', 'other-footwear'],
  ]));
  add('vars', tax(['Running', 'Walking', 'Training', 'Casual', 'Formal', 'Sandals', 'Slippers', 'Canvas', 'Leather', 'Mesh']));
  add('feats', tax(['Lightweight', 'Breathable', 'Waterproof', 'Anti-slip', 'Shock Absorbent', 'Durable', 'Flexible', 'Comfort Fit', 'Eco-Friendly', 'Premium Finish']));

  add('brands', [
    { id: 'supremlite', data: { name: 'SUPREMLITE', slug: 'supremlite', tagline: '', desc: 'Explore footwear models available under SUPREMLITE. Browse the collection and enquire about product specifications, available sizes, colours and order requirements.', logo: '', order: 0, active: true } },
    { id: 'ston', data: { name: 'STON', slug: 'ston', tagline: '', desc: 'Discover footwear available under STON. Explore the current catalogue and contact our team for product information and availability.', logo: '', order: 1, active: true } },
  ]);

  const nav = [['Home', '/'], ['About', '/about'], ['Brands', '/brands'], ['Catalogue', '/catalogue']];
  add('menu', nav.map(([label, url], i) => ({ id: 'm' + (i + 1), data: { label, type: 'path', url, pageId: '', parent: '', order: i, active: true } })));

  d.push({ col: 'site', id: 'settings', data: {
    company: 'PRABHAT INDUSTRIES', phone: '9818185161', whatsapp: '9818185161', location: 'Bahadurgarh, Haryana, India',
    email: '', siteUrl: 'https://supremlite.com', showPrices: false, inventory: false,
    seoTitle: 'PRABHAT INDUSTRIES | SUPREMLITE and STON Footwear', seoDesc: "Footwear manufacturing and trading since 2015 in Bahadurgarh, Haryana. Explore men's, women's, kids' footwear, sports shoes, slippers and sandals.",
  } });
  d.push({ col: 'site', id: 'home_draft', data: HOME });
  d.push({ col: 'site', id: 'home_live', data: { ...HOME, publishedAt: new Date().toISOString() } });
  d.push({ col: 'activity', id: 'a1', data: { text: 'Website created with starter content', ts: new Date().toISOString(), who: 'System' } });
  return d;
}
