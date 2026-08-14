import { createFileRoute } from "@tanstack/react-router";

const SITE = "https://techmymarcon.world";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const urls: { loc: string; lastmod?: string }[] = [
          { loc: `${SITE}/` },
          { loc: `${SITE}/articles` },
          { loc: `${SITE}/forum` },
          { loc: `${SITE}/socials` },
          { loc: `${SITE}/login` },
        ];

        try {
          const { db } = await import("@/lib/content.server");
          const supabase = await db();
          const { data: articles } = await supabase
            .from("articles")
            .select("id, updated_at, date")
            .order("date", { ascending: false });
          for (const a of articles ?? []) {
            urls.push({
              loc: `${SITE}/articles/${encodeURIComponent(a.id as string)}`,
              lastmod: ((a.updated_at as string) || (a.date as string) || "").slice(0, 10),
            });
          }
          const { data: posts } = await supabase
            .from("forum_posts")
            .select("id, created_at")
            .order("created_at", { ascending: false })
            .limit(500);
          for (const p of posts ?? []) {
            urls.push({
              loc: `${SITE}/forum/${encodeURIComponent(p.id as string)}`,
              lastmod: ((p.created_at as string) || "").slice(0, 10),
            });
          }
        } catch {
          // fall back to the static routes above
        }

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`,
  )
  .join("\n")}
</urlset>`;

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
