import { createFileRoute } from "@tanstack/react-router";
import { caller, getRules, preflight, readJson, setRules, unauthorized } from "@/lib/mobile-api.server";

/**
 * GET  /api/public/forum/rules -> { postCooldownSeconds, maxPostsPerDay }  (0 = off)
 * POST /api/public/forum/rules -> update limits (green/gold keys only)
 */
export const Route = createFileRoute("/api/public/forum/rules")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async () => getRules(),
      POST: async ({ request }) => {
        const who = await caller(request);
        return who ? setRules(who, await readJson(request)) : unauthorized();
      },
    },
  },
});
