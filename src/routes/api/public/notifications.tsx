import { createFileRoute } from "@tanstack/react-router";
import { caller, json, preflight, readJson, unauthorized } from "@/lib/mobile-api.server";
import { db } from "@/lib/content.server";

/**
 * GET   /api/public/notifications            -> { notifications: [...], unread: n }
 * PATCH /api/public/notifications  { id? }   -> mark one (or all) as read
 * DELETE /api/public/notifications           -> clear all
 * All require: Authorization: Bearer <key>
 */
export const Route = createFileRoute("/api/public/notifications")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ request }) => {
        const who = await caller(request);
        if (!who) return unauthorized();
        const supabase = await db();
        const { data } = await supabase
          .from("notifications")
          .select("*")
          .eq("recipient_email", who.username)
          .order("created_at", { ascending: false })
          .limit(100);
        const rows = (data ?? []) as { read: boolean }[];
        return json({ notifications: rows, unread: rows.filter((r) => !r.read).length });
      },
      PATCH: async ({ request }) => {
        const who = await caller(request);
        if (!who) return unauthorized();
        const body = await readJson(request);
        const supabase = await db();
        let query = supabase
          .from("notifications")
          .update({ read: true } as never)
          .eq("recipient_email", who.username);
        if (body["id"]) query = query.eq("id", String(body["id"]));
        const { error } = await query;
        return error ? json({ error: "Could not update." }, 400) : json({ ok: true });
      },
      DELETE: async ({ request }) => {
        const who = await caller(request);
        if (!who) return unauthorized();
        const supabase = await db();
        const { error } = await supabase
          .from("notifications")
          .delete()
          .eq("recipient_email", who.username);
        return error ? json({ error: "Could not clear." }, 400) : json({ ok: true });
      },
    },
  },
});
