import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

type GateSession = { developer?: boolean };

const sessionConfig = () => ({
  password: process.env["SESSION_SECRET"]!,
  name: "tbm-dev",
  maxAge: 60 * 60 * 24 * 30,
  cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
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
