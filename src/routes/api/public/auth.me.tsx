import { createFileRoute } from "@tanstack/react-router";
import { caller, me, preflight, readJson, unauthorized, updateMe } from "@/lib/mobile-api.server";

/**
 * GET   /api/public/auth/me   -> identity, tier, scopes, profile
 * PATCH /api/public/auth/me   -> update displayName / avatarUrl / handle
 * Both require: Authorization: Bearer <key>
 */
export const Route = createFileRoute("/api/public/auth/me")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ request }) => {
        const who = await caller(request);
        return who ? me(who) : unauthorized();
      },
      PATCH: async ({ request }) => {
        const who = await caller(request);
        return who ? updateMe(who, await readJson(request)) : unauthorized();
      },
    },
  },
});
