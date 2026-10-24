import type { APIRoute } from "astro";

// Blocks crawlers on the temporary domain; PUBLIC_INDEXABLE=true (build time) opens it up.
export const GET: APIRoute = ({ site }) => {
  const indexable = import.meta.env.PUBLIC_INDEXABLE === "true";
  const body = indexable
    ? `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /client/\nDisallow: /api/\n\nSitemap: ${new URL("/sitemap-index.xml", site).href}\n`
    : "User-agent: *\nDisallow: /\n";
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
