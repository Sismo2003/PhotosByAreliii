import type { APIRoute } from "astro";

// Blocks crawlers on the temporary domain; PUBLIC_INDEXABLE=true (build time) opens it up.
// The portals, the sign-in page and the API are never crawled (they are also noindex/behind auth).
export const GET: APIRoute = ({ site }) => {
  const indexable = import.meta.env.PUBLIC_INDEXABLE === "true";
  const body = indexable
    ? [
        "User-agent: *",
        "Allow: /",
        "Disallow: /admin/",
        "Disallow: /client/",
        "Disallow: /login",
        "Disallow: /api/",
        "",
        `Sitemap: ${new URL("/sitemap-index.xml", site).href}`,
        "",
      ].join("\n")
    : "User-agent: *\nDisallow: /\n";
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
