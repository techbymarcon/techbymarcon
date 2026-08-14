/**
 * Account moderation: bans, timeouts (temporary mutes) and warnings.
 * Every sanction lives in `account_sanctions` and is only ever read/written
 * through trusted server code.
 */
import { db } from "./content.server";

export type SanctionRow = {
  id: string;
  username: string;
  kind: "ban" | "timeout" | "warning";
  reason: string;
  issued_by: string;
  expires_at: string | null;
  lifted: boolean;
  created_at: string;
};

export type SanctionState = {
  banned: boolean;
  banReason: string;
  mutedUntil: string | null;
  muteReason: string;
  warnings: number;
  lastWarning: string;
};

export const EMPTY_SANCTION: SanctionState = {
  banned: false,
  banReason: "",
  mutedUntil: null,
  muteReason: "",
  warnings: 0,
  lastWarning: "",
};

export async function sanctionsFor(usernames: string[]) {
  const map = new Map<string, SanctionState>();
  for (const u of usernames) map.set(u, { ...EMPTY_SANCTION });
  if (!usernames.length) return map;
  const supabase = await db();
  const { data } = await supabase
    .from("account_sanctions")
    .select("*")
    .in("username", usernames)
    .order("created_at", { ascending: false });
  const now = Date.now();
  for (const raw of (data ?? []) as SanctionRow[]) {
    const state = map.get(raw.username);
    if (!state) continue;
    if (raw.kind === "warning") {
      state.warnings += 1;
      if (!state.lastWarning) state.lastWarning = raw.reason;
      continue;
    }
    if (raw.lifted) continue;
    if (raw.kind === "ban" && !state.banned) {
      state.banned = true;
      state.banReason = raw.reason;
    }
    if (raw.kind === "timeout" && raw.expires_at && new Date(raw.expires_at).getTime() > now) {
      if (!state.mutedUntil || new Date(raw.expires_at) > new Date(state.mutedUntil)) {
        state.mutedUntil = raw.expires_at;
        state.muteReason = raw.reason;
      }
    }
  }
  return map;
}

export async function sanctionState(username: string | null | undefined) {
  if (!username) return { ...EMPTY_SANCTION };
  const map = await sanctionsFor([username]);
  return map.get(username) ?? { ...EMPTY_SANCTION };
}

/** Returns an error message when the member is not allowed to post right now. */
export async function postingBlock(username: string | null | undefined) {
  const state = await sanctionState(username);
  if (state.banned) {
    return state.banReason
      ? `Your account has been banned. Reason: ${state.banReason}`
      : "Your account has been banned.";
  }
  if (state.mutedUntil) {
    const secs = Math.max(1, Math.ceil((new Date(state.mutedUntil).getTime() - Date.now()) / 1000));
    const mins = Math.ceil(secs / 60);
    return `You're timed out for another ${mins} minute${mins === 1 ? "" : "s"}.${
      state.muteReason ? ` Reason: ${state.muteReason}` : ""
    }`;
  }
  return null;
}
