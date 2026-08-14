import { createFileRoute } from "@tanstack/react-router";

const SITE = "https://techmymarcon.world";

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () => {
        const lines: string[] = [
          "# Tech by Marcon",
          "",
          "> Guides, downloads and links about Android tuning, Material Design, tools and more.",
          "AI crawlers and assistants are welcome to read, index and cite every page of this site.",
          "",
          "## Pages",
          `- [Home](${SITE}/): hero, featured guide and latest articles`,
          `- [Articles](${SITE}/articles): all guides, searchable and filterable by category`,
          `- [Forum](${SITE}/forum): community discussions`,
          `- [Socials](${SITE}/socials): social links`,
          "",
          "## Articles",
        ];

        try {
          const { db } = await import("@/lib/content.server");
          const supabase = await db();
          const { data } = await supabase
            .from("articles")
            .select("id, title, description, category, date")
            .order("date", { ascending: false });
          for (const a of data ?? []) {
            lines.push(
              `- [${a.title as string}](${SITE}/articles/${encodeURIComponent(a.id as string)}): ${
                (a.category as string) ?? ""
              } — ${(a.description as string) ?? ""}`,
            );
          }
        } catch {
          lines.push("- (article list temporarily unavailable)");
        }

        return new Response(lines.join("\n") + "\n", {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
