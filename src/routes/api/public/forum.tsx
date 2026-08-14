import { createFileRoute } from "@tanstack/react-router";
import {
  caller,
  createPost,
  listPosts,
  preflight,
  readJson,
  unauthorized,
} from "@/lib/mobile-api.server";

/**
 * GET  /api/public/forum?limit=50&offset=0 -> { posts: [...] }   (key optional; adds my_vote/permissions)
 * POST /api/public/forum                   -> create a post      (requires a key with forum:post)
 */
export const Route = createFileRoute("/api/public/forum")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ request }) => listPosts(request, await caller(request)),
      POST: async ({ request }) => {
        const who = await caller(request);
        return who ? createPost(who, await readJson(request)) : unauthorized();
      },
    },
  },
});
