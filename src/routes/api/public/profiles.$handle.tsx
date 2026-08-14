import { createFileRoute } from "@tanstack/react-router";
import { getProfile, preflight } from "@/lib/mobile-api.server";

/** GET /api/public/profiles/$handle -> public profile card + post/comment counts (no key needed). */
export const Route = createFileRoute("/api/public/profiles/$handle")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ params }) => getProfile(params.handle),
    },
  },
});
