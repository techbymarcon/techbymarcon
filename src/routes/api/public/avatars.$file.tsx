import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/avatars/$file")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const file = String(params.file ?? "");
        if (!/^[a-z0-9._-]+$/i.test(file)) return new Response("Not found", { status: 404 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from("avatars").download(file);
        if (error || !data) return new Response("Not found", { status: 404 });
        return new Response(await data.arrayBuffer(), {
          headers: {
            "content-type": data.type || "application/octet-stream",
            "cache-control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
