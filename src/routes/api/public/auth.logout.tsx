import { createFileRoute } from "@tanstack/react-router";
import { caller, logout, preflight, unauthorized } from "@/lib/mobile-api.server";

/**
 * POST /api/public/auth/logout -> void every key issued to this account.
 * Requires: Authorization: Bearer <key>
 */
export const Route = createFileRoute("/api/public/auth/logout")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      POST: async ({ request }) => {
        const who = await caller(request);
        return who ? logout(who) : unauthorized();
      },
    },
  },
});
