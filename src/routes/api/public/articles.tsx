import { createFileRoute } from "@tanstack/react-router";

/**
 * Public JSON API for the native app.
 *
 *   GET    /api/public/articles          -> list all articles (no key needed)
 *   GET    /api/public/articles?id=...   -> single article (no key needed)
 *   POST   /api/public/articles          -> create (requires x-api-key)
 *   PATCH  /api/public/articles          -> update, body must include id (requires x-api-key)
 *   DELETE /api/public/articles?id=...   -> delete (requires x-api-key)
 */

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type, x-api-key",
  "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...CORS },
  });

function authorized(request: Request) {
  const expected = process.env["APP_API_KEY"];
  if (!expected) return false;
  const provided =
    request.headers.get("x-api-key") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  return provided.length > 0 && provided === expected;
}

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const FIELDS = [
  "title",
  "description",
  "body",
  "category",
  "date",
  "reading_time",
  "cover",
  "featured",
  "download_url",
  "download_name",
  "download_size",
] as const;

function pick(input: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const key of FIELDS) {
    // accept both snake_case and camelCase from the client
    const camel = key.replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase());
    if (input[key] !== undefined) out[key] = input[key];
    else if (input[camel] !== undefined) out[key] = input[camel];
  }
  return out;
}

export const Route = createFileRoute("/api/public/articles")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      GET: async ({ request }) => {
        const id = new URL(request.url).searchParams.get("id");
        const supabase = await db();
        if (id) {
          const { data, error } = await supabase
            .from("articles")
            .select("*")
            .eq("id", id)
            .maybeSingle();
          if (error) return json({ error: "Query failed" }, 500);
          if (!data) return json({ error: "Not found" }, 404);
          return json(data);
        }
        const { data, error } = await supabase
          .from("articles")
          .select("*")
          .order("date", { ascending: false });
        if (error) return json({ error: "Query failed" }, 500);
        return json({ articles: data ?? [] });
      },

      POST: async ({ request }) => {
        if (!authorized(request)) return json({ error: "Unauthorized" }, 401);
        const input = (await request.json().catch(() => null)) as Record<string, unknown> | null;
        if (!input) return json({ error: "Invalid JSON body" }, 400);
        const row = pick(input);
        if (!row["title"]) return json({ error: "title is required" }, 400);
        const supabase = await db();
        const { data, error } = await supabase.from("articles").insert(row as never).select().single();
        if (error) return json({ error: error.message }, 400);
        return json(data, 201);
      },

      PATCH: async ({ request }) => {
        if (!authorized(request)) return json({ error: "Unauthorized" }, 401);
        const input = (await request.json().catch(() => null)) as Record<string, unknown> | null;
        const id = String(input?.["id"] ?? new URL(request.url).searchParams.get("id") ?? "");
        if (!input || !id) return json({ error: "id is required" }, 400);
        const supabase = await db();
        const { data, error } = await supabase
          .from("articles")
          .update(pick(input) as never)
          .eq("id", id)
          .select()
          .maybeSingle();
        if (error) return json({ error: error.message }, 400);
        if (!data) return json({ error: "Not found" }, 404);
        return json(data);
      },

      DELETE: async ({ request }) => {
        if (!authorized(request)) return json({ error: "Unauthorized" }, 401);
        const url = new URL(request.url);
        const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
        const id = String(body?.["id"] ?? url.searchParams.get("id") ?? "");
        if (!id) return json({ error: "id is required" }, 400);
        const supabase = await db();
        const { error } = await supabase.from("articles").delete().eq("id", id);
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true });
      },
    },
  },
});
