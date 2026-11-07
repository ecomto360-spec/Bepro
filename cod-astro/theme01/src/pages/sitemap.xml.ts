import type { APIRoute } from "astro";
import { fetchCategoriesRaw, fetchProductsRaw } from "@/core/api/client";

export const GET: APIRoute = async ({ url }) => {
  const [products, categories] = await Promise.all([fetchProductsRaw({ limit: 100 }), fetchCategoriesRaw()]);
  const paths = ["/", "/products", ...categories.map((c) => `/category/${c.slug}`), ...products.map((p) => `/products/${p.handle}`)];
  const urls = paths.flatMap((path) => {
    const href = new URL(path, url.origin).href;
    const ar = new URL(href); ar.searchParams.set("lang", "ar");
    return [`  <url><loc>${href}</loc><xhtml:link rel="alternate" hreflang="fr-DZ" href="${href}"/><xhtml:link rel="alternate" hreflang="ar-DZ" href="${ar.href}"/><changefreq>weekly</changefreq></url>`];
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join("\n")}\n</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
};
