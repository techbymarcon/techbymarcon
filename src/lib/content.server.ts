import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

type GateSession = { developer?: boolean; email?: string };

const sessionConfig = () => ({
  password: process.env["SESSION_SECRET"]!,
  name: "tbm-dev",
  maxAge: 60 * 60 * 24 * 30,
  // SameSite=None so the session cookie survives the embedded preview iframe
  // (cross-site context); Secure is required alongside it.
  cookie: { httpOnly: true, secure: true, sameSite: "none" as const, path: "/" },
});

export async function getGateSession() {
  return useSession<GateSession>(sessionConfig());
}

export function passwordMatches(input: string, expected: string) {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

export async function isDeveloperSession() {
  const session = await getGateSession();
  return session.data.developer === true;
}

export async function requireDeveloper() {
  if (!(await isDeveloperSession())) throw new Error("Unauthorized");
}

export type ArticleRow = {
  id: string;
  title: string;
  description: string;
  body: string;
  category: string;
  date: string;
  reading_time: string;
  cover: string;
  featured: boolean;
};

export type ArticleInput = Omit<ArticleRow, "reading_time"> & { readingTime: string };

export async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type Identity = { developer: boolean; email: string | null };

export async function currentIdentity(): Promise<Identity> {
  const session = await getGateSession();
  if (session.data.developer === true) return { developer: true, email: "developer" };
  return { developer: false, email: session.data.email ?? null };
}

export async function requireIdentity(): Promise<{ developer: boolean; email: string }> {
  const id = await currentIdentity();
  if (!id.email) throw new Error("Unauthorized");
  return { developer: id.developer, email: id.email };
}

export async function setUserSession(email: string) {
  const session = await getGateSession();
  await session.update({ developer: false, email });
}

const enc = new TextEncoder();

async function pbkdf2(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations: 120000, hash: "SHA-256" },
    key,
    256,
  );
  return new Uint8Array(bits);
}

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

const fromHex = (hex: string) =>
  new Uint8Array((hex.match(/.{1,2}/g) ?? []).map((b) => parseInt(b, 16)));

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derived = await pbkdf2(password, salt);
  return `pbkdf2$120000$${toHex(salt)}$${toHex(derived)}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined) {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const derived = await pbkdf2(password, fromHex(parts[2]!));
  const expected = fromHex(parts[3]!);
  if (derived.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < derived.length; i++) diff |= derived[i]! ^ expected[i]!;
  return diff === 0;
}
