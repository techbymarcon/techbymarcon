import { createHash } from "node:crypto";
import { currentStaff, db, getGateSession } from "./content.server";

/**
 * Session access keys.
 *
 * When someone signs in the server mints a single opaque key that encodes what
 * that account may do. The payload is AES-256-GCM encrypted with a key derived
 * from SESSION_SECRET, so the string is unreadable and unforgeable on the
 * client. It lives in the httpOnly session cookie and dies on sign out.
 */

export type KeyTier = "blue" | "green" | "gold";

export type Scope =
  | "forum:post"
  | "forum:delete:own"
  | "forum:delete:any"
  | "forum:moderate"
  | "forum:ratelimit"
  | "article:write"
  | "site:write"
  | "roles:manage";

const SCOPES: Record<KeyTier, Scope[]> = {
  blue: ["forum:post", "forum:delete:own"],
  green: ["forum:delete:any", "forum:moderate", "forum:ratelimit"],
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
};

export function scopesFor(tier: KeyTier): Scope[] {
  return SCOPES[tier];
}

type Payload = {
  sub: string;
  tier: KeyTier;
  scopes: Scope[];
  nonce: string;
  iat: number;
};

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const unb64url = (value: string) => {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

async function cryptoKey() {
  const secret = process.env["SESSION_SECRET"];
  if (!secret) throw new Error("SESSION_SECRET is not configured");
  const material = createHash("sha256").update(`${secret}|tbm-access-key-v1`, "utf8").digest();
  return crypto.subtle.importKey("raw", new Uint8Array(material), "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

async function seal(payload: Payload) {
  const key = await cryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(payload));
  const sealed = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as unknown as BufferSource }, key, data),
  );
  const blob = new Uint8Array(iv.length + sealed.length);
  blob.set(iv, 0);
  blob.set(sealed, iv.length);
  return `tbm_${payload.tier}_${b64url(blob)}`;
}

export async function openKey(key: string | null | undefined): Promise<Payload | null> {
  if (!key) return null;
  const match = /^tbm_(blue|green|gold)_([A-Za-z0-9_-]+)$/.exec(key.trim());
  if (!match) return null;
  try {
    const blob = unb64url(match[2]!);
    const iv = blob.subarray(0, 12);
    const body = blob.subarray(12);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as unknown as BufferSource },
      await cryptoKey(),
      body as unknown as BufferSource,
    );
    const payload = JSON.parse(new TextDecoder().decode(plain)) as Payload;
    return payload.tier === match[1] ? payload : null;
  } catch {
    return null;
  }
}

/** The tier the signed-in account should hold right now. */
export async function tierForCurrentSession(): Promise<KeyTier | null> {
  const me = await currentStaff();
  if (!me.signedIn) return null;
  if (me.developer) return "gold";
  return me.moderator ? "green" : "blue";
}

/**
 * Return the session's key, minting one on first use and re-minting whenever
 * the account's powers changed (e.g. it was just made a moderator).
 */
export async function currentKey(): Promise<{ key: string; payload: Payload } | null> {
  const tier = await tierForCurrentSession();
  if (!tier) return null;
  const session = await getGateSession();
  const existing = await openKey(session.data.accessKey);
  const me = await currentStaff();
  if (existing && existing.tier === tier && existing.sub === me.email) {
    return { key: session.data.accessKey!, payload: existing };
  }
  const payload: Payload = {
    sub: me.email,
    tier,
    scopes: scopesFor(tier),
    nonce: b64url(crypto.getRandomValues(new Uint8Array(12))),
    iat: Date.now(),
  };
  const key = await seal(payload);
  await session.update({ ...session.data, accessKey: key });
  return { key, payload };
}

/** True when the signed-in session's key grants a scope. */
export async function keyAllows(scope: Scope) {
  const current = await currentKey();
  return Boolean(current && current.payload.scopes.includes(scope));
}

export async function clearKey() {
  const session = await getGateSession();
  await session.update({ ...session.data, accessKey: undefined });
}

export type ForumRules = { postCooldownSeconds: number; maxPostsPerDay: number };

export const DEFAULT_FORUM_RULES: ForumRules = { postCooldownSeconds: 0, maxPostsPerDay: 0 };

export async function forumRules(): Promise<ForumRules> {
  const supabase = await db();
  const { data } = await supabase
    .from("site_content")
    .select("value")
    .eq("key", "forum_rules")
    .maybeSingle();
  const value = (data?.value ?? {}) as Partial<ForumRules>;
  return {
    postCooldownSeconds: Math.max(0, Number(value.postCooldownSeconds) || 0),
    maxPostsPerDay: Math.max(0, Number(value.maxPostsPerDay) || 0),
  };
}

export async function saveForumRules(rules: ForumRules) {
  const supabase = await db();
  await supabase
    .from("site_content")
    .upsert({ key: "forum_rules", value: rules } as never, { onConflict: "key" });
}
