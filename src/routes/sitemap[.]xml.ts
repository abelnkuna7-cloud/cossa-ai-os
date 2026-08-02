import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const baseUrl = (process.env.PUBLIC_SITE_URL ?? "https://growth.cossanexusholdings.co.za").replace(/\/$/, "");
        const publicPages = ["/", "/construction-growth", "/facility-services-growth", "/sme-growth"];
        const urls = publicPages.map((path) => {
          const priority = path === "/" ? "1.0" : "0.8";
          return `  <url>\n    <loc>${baseUrl}${path}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
        });
        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
