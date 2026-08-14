import { createFileRoute } from "@tanstack/react-router";
import {
  caller,
  deletePost,
  getPost,
  preflight,
  readJson,
  unauthorized,
  updatePost,
} from "@/lib/mobile-api.server";

/**
 * GET    /api/public/forum/$postId -> { post }
 * PATCH  /api/public/forum/$postId -> edit (own post, or any post for green/gold; pinned/locked need moderation)
 * DELETE /api/public/forum/$postId -> delete (own post, or any post for green/gold)
 */
export const Route = createFileRoute("/api/public/forum/$postId")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ request, params }) => getPost(params.postId, await caller(request)),
      PATCH: async ({ request, params }) => {
        const who = await caller(request);
        return who ? updatePost(params.postId, who, await readJson(request)) : unauthorized();
      },
      DELETE: async ({ request, params }) => {
        const who = await caller(request);
        return who ? deletePost(params.postId, who) : unauthorized();
      },
    },
  },
});
