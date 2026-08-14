import { createFileRoute } from "@tanstack/react-router";
import { caller, preflight, readJson, unauthorized, votePost } from "@/lib/mobile-api.server";

/** POST /api/public/forum/$postId/vote  { value: 1 | -1 | 0 } -> tallies. Same value again clears it. */
export const Route = createFileRoute("/api/public/forum/$postId/vote")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      POST: async ({ request, params }) => {
        const who = await caller(request);
        return who ? votePost(params.postId, who, await readJson(request)) : unauthorized();
      },
    },
  },
});
