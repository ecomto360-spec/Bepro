import type { APIRoute } from "astro";
export const GET: APIRoute = ({ url }) => new Response(`User-agent: *\nAllow: /\nDisallow: /checkout\nDisallow: /cart\nDisallow: /merci\nDisallow: /thank-you\nDisallow: /track-order\nSitemap: ${new URL("/sitemap.xml", url.origin).href}\n`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
