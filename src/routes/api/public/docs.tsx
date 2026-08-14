import { createFileRoute } from "@tanstack/react-router";
import { CORS } from "@/lib/mobile-api.server";

/** GET /api/public/docs -> machine-readable contract for native clients. */
const DOCS = {
  base: "https://techmymarcon.world",
  auth: {
    scheme: "Bearer",
    header: "Authorization: Bearer <key>",
    note:
      "The key is the same encrypted access key the website mints at sign-in. " +
      "It is opaque, tier-encoded and server-verified. Store it securely (EncryptedSharedPreferences) " +
      "and drop it on sign-out. It stays valid until the server secret rotates; a 401 means re-login.",
    tiers: {
      blue: ["forum:post", "forum:delete:own"],
      green: [
        "forum:post",
        "forum:delete:own",
        "forum:delete:any",
        "forum:moderate",
        "forum:ratelimit",
      ],
      gold: [
        "forum:post",
        "forum:delete:own",
        "forum:delete:any",
        "forum:moderate",
        "forum:ratelimit",
        "article:write",
        "site:write",
        "roles:manage",
      ],
    },
  },
  endpoints: [
    { method: "POST", path: "/api/public/auth/login", body: "{username,password} | {username:'developer',password}", auth: false },
    { method: "POST", path: "/api/public/auth/register", body: "{username,password,displayName?}", auth: false },
    { method: "GET", path: "/api/public/auth/me", auth: true },
    { method: "PATCH", path: "/api/public/auth/me", body: "{displayName?,avatarUrl?,handle?}", auth: true },
    { method: "GET", path: "/api/public/forum?limit&offset", auth: "optional" },
    { method: "POST", path: "/api/public/forum", body: "{title,body,imageUrl?}", auth: true, scope: "forum:post" },
    { method: "GET", path: "/api/public/forum/{postId}", auth: "optional" },
    { method: "PATCH", path: "/api/public/forum/{postId}", body: "{title?,body?,imageUrl?,pinned?,locked?}", auth: true },
    { method: "DELETE", path: "/api/public/forum/{postId}", auth: true },
    { method: "POST", path: "/api/public/forum/{postId}/vote", body: "{value:1|-1|0}", auth: true },
    { method: "GET", path: "/api/public/forum/rules", auth: false },
    { method: "POST", path: "/api/public/forum/rules", body: "{postCooldownSeconds,maxPostsPerDay}", auth: true, scope: "forum:ratelimit" },
    { method: "GET", path: "/api/public/comments?thread=|articleId=|postId=", auth: "optional" },
    { method: "POST", path: "/api/public/comments", body: "{thread|articleId|postId, body, imageUrl?, parentId?}", auth: true },
    { method: "PATCH", path: "/api/public/comments", body: "{id,body}", auth: true },
    { method: "DELETE", path: "/api/public/comments?id=", auth: true },
    { method: "GET", path: "/api/public/notifications", auth: true },
    { method: "PATCH", path: "/api/public/notifications", body: "{id?}", auth: true },
    { method: "DELETE", path: "/api/public/notifications", auth: true },
    { method: "GET", path: "/api/public/profiles/{handle}", auth: false },
    { method: "GET", path: "/api/public/articles", auth: false },
    { method: "POST|PATCH|DELETE", path: "/api/public/articles", auth: "x-api-key (admin write key)" },
  ],
  shapes: {
    session: {
      key: "tbm_blue_…",
      tier: "blue|green|gold",
      scopes: ["forum:post"],
      developer: false,
      moderator: false,
      username: "connie",
      profile: { handle: "connie", display_name: "Connie", avatar_url: "", tier: "blue" },
    },
    post: {
      id: "uuid",
      handle: "connie",
      display_name: "Connie",
      avatar_url: "",
      tier: "blue",
      title: "",
      body: "",
      image_url: "",
      pinned: false,
      locked: false,
      created_at: "ISO-8601",
      updated_at: "ISO-8601",
      mine: false,
      can_edit: false,
      can_delete: false,
      upvotes: 0,
      downvotes: 0,
      score: 0,
      my_vote: 0,
    },
    comment: {
      id: "uuid",
      thread: "articleId or forum:<postId>",
      parent_id: null,
      handle: "connie",
      display_name: "Connie",
      avatar_url: "",
      tier: "blue",
      body: "",
      image_url: "",
      created_at: "ISO-8601",
      updated_at: "ISO-8601",
      mine: false,
      can_edit: false,
      can_delete: false,
    },
  },
  errors: {
    "400": "bad input",
    "401": "missing/invalid key",
    "403": "key lacks the scope, or the row is not yours",
    "404": "not found",
    "429": "forum rate limit (cooldown or daily cap)",
  },
};

export const Route = createFileRoute("/api/public/docs")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () =>
        new Response(JSON.stringify(DOCS, null, 2), {
          headers: { "content-type": "application/json", ...CORS },
        }),
    },
  },
});
