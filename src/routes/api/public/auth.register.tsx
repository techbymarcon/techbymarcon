import { createFileRoute } from "@tanstack/react-router";
import { preflight, readJson, register, registerWithCode } from "@/lib/mobile-api.server";

/**
 * POST /api/public/auth/register
 *   { username, password, displayName? } -> account + key
 *
 * Code accounts have been removed; { mode: "code" } now returns 410 Gone.
 */
export const Route = createFileRoute("/api/public/auth/register")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      POST: async ({ request }) => {
        const body = await readJson(request);
        if (String(body["mode"] ?? "").toLowerCase() === "code") return registerWithCode();
        return register(body);
      },
    },
  },
});

