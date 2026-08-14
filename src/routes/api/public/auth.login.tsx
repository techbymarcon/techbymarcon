import { createFileRoute } from "@tanstack/react-router";
import { login, preflight, readJson } from "@/lib/mobile-api.server";

/** POST /api/public/auth/login -> { key, tier, scopes, profile } */
export const Route = createFileRoute("/api/public/auth/login")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      POST: async ({ request }) => login(await readJson(request)),
    },
  },
});
