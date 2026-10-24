export function onRequestGet({ request }) {
  const origin = new URL(request.url).origin;
  return new Response(`User-agent: *\nDisallow: /admin/\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`, {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  });
}
