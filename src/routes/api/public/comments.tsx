import { createFileRoute } from "@tanstack/react-router";
import {
  caller,
  createComment,
  deleteComment,
  json,
  listComments,
  preflight,
  readJson,
  unauthorized,
  updateComment,
} from "@/lib/mobile-api.server";

/**
 * Comments and forum replies share one table.
 *   thread = "<articleId>" for articles, "forum:<postId>" for forum replies.
 *
 * GET    /api/public/comments?thread=...        (or ?articleId=... / ?postId=...)
 * POST   /api/public/comments   { thread|articleId|postId, body, imageUrl?, parentId? }
 * PATCH  /api/public/comments   { id, body }
 * DELETE /api/public/comments?id=...            (own comment; moderators can delete any)
 */
export const Route = createFileRoute("/api/public/comments")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ request }) => listComments(request, await caller(request)),
      POST: async ({ request }) => {
        const who = await caller(request);
        return who ? createComment(who, await readJson(request)) : unauthorized();
      },
      PATCH: async ({ request }) => {
        const who = await caller(request);
        if (!who) return unauthorized();
        const body = await readJson(request);
        const id = String(body["id"] ?? "");
        if (!id) return json({ error: "id is required" }, 400);
        return updateComment(id, who, body);
      },
      DELETE: async ({ request }) => {
        const who = await caller(request);
        if (!who) return unauthorized();
        const body = await readJson(request);
        const id = String(body["id"] ?? new URL(request.url).searchParams.get("id") ?? "");
        if (!id) return json({ error: "id is required" }, 400);
        return deleteComment(id, who);
      },
    },
  },
});
