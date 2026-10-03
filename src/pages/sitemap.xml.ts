import { guide, places, shops, site } from "../data";

// Every page, so a search for a shop or "Mullana festivals" can find it.
export function GET() {
  const paths = ["/", ...guide.map((g) => `/${g.slug}/`), ...shops.map((s) => `/shop/${s.slug}/`), ...places.map((p) => `/place/${p.slug}/`)];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `<url><loc>${site.url}${p}</loc></url>`).join("\n")}
</urlset>`;
  return new Response(body, { headers: { "Content-Type": "application/xml" } });
}
