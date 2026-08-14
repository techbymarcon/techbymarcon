import { db } from "./content.server";

/**
 * Login throttling.
 *
 * Every attempt is slowed down, and repeated attempts on the same account
 * trip escalating temporary blocks. State lives in `public.login_attempts`,
 * which only the trusted server can read or write.
 *
 *   delay:  every attempt 2s · from 5 attempts 5s · from 20 attempts 30s
 *   blocks: 5 -> 10s · 10 -> 10s · 20 -> 20s · 40 -> 40s · 60 -> 5 minutes
 */

const DELAYS: { from: number; seconds: number }[] = [
  { from: 20, seconds: 30 },
  { from: 5, seconds: 5 },
  { from: 0, seconds: 2 },
];

const BLOCKS: Record<number, number> = {
  5: 10,
  10: 10,
  20: 20,
  40: 40,
  60: 300,
};

/** Attempts older than this are forgiven. */
const WINDOW_MS = 60 * 60 * 1000;

export const delayForAttempt = (attempts: number) =>
  DELAYS.find((d) => attempts >= d.from)!.seconds;

export const blockForAttempt = (attempts: number) => BLOCKS[attempts] ?? 0;

type Row = {
  identifier: string;
  attempts: number;
  blocked_until: string | null;
  last_attempt_at: string;
};

export type Throttle =
  | { blocked: true; retryAfter: number; error: string }
  | { blocked: false; attempts: number; wait: number; clear: () => Promise<void> };


const humanWait = (seconds: number) =>
  seconds >= 60
    ? `${Math.ceil(seconds / 60)} minute${seconds >= 120 ? "s" : ""}`
    : `${seconds} second${seconds === 1 ? "" : "s"}`;

async function readRow(identifier: string) {
  const supabase = await db();
  const { data } = await supabase
    .from("login_attempts")
    .select("*")
    .eq("identifier", identifier)
    .maybeSingle();
  return (data as Row | null) ?? null;
}

async function writeRow(identifier: string, attempts: number, blockedUntil: string | null) {
  const supabase = await db();
  await supabase.from("login_attempts").upsert(
    {
      identifier,
      attempts,
      blocked_until: blockedUntil,
      last_attempt_at: new Date().toISOString(),
    } as never,
    { onConflict: "identifier" },
  );
}

export async function clearAttempts(identifier: string) {
  const supabase = await db();
  await supabase.from("login_attempts").delete().eq("identifier", identifier);
}

/**
 * Call once at the start of a login attempt. Returns early when the account is
 * blocked; otherwise it counts the attempt, waits out the delay, and hands back
 * a `clear()` to call when the credentials turn out to be correct.
 */
export async function throttleLogin(rawIdentifier: string): Promise<Throttle> {
  const identifier = (rawIdentifier || "unknown").toLowerCase().slice(0, 80);
  let row: Row | null = null;
  try {
    row = await readRow(identifier);
  } catch {
    // If the throttle store is unavailable, never lock people out of the app.
    await sleep(2000);
    return { blocked: false, attempts: 1, clear: async () => {} };
  }

  const now = Date.now();

  if (row?.blocked_until) {
    const until = new Date(row.blocked_until).getTime();
    if (until > now) {
      const retryAfter = Math.ceil((until - now) / 1000);
      return {
        blocked: true,
        retryAfter,
        error: `Too many sign-in attempts. Try again in ${humanWait(retryAfter)}.`,
      };
    }
  }

  const stale = row ? now - new Date(row.last_attempt_at).getTime() > WINDOW_MS : true;
  const attempts = (stale ? 0 : (row?.attempts ?? 0)) + 1;

  const blockSeconds = blockForAttempt(attempts);
  const blockedUntil = blockSeconds
    ? new Date(now + blockSeconds * 1000).toISOString()
    : null;

  await writeRow(identifier, attempts, blockedUntil).catch(() => {});
  await sleep(delayForAttempt(attempts) * 1000);

  return { blocked: false, attempts, clear: () => clearAttempts(identifier) };
}
