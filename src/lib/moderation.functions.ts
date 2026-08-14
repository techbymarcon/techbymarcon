import { createServerFn } from "@tanstack/react-start";
import { currentStaff, db, effectiveTier, isModerator } from "./content.server";
import { sanctionState, sanctionsFor } from "./moderation.server";
import { actorFor, notify } from "./notifications.server";

export type ManagedAccount = {
  username: string;
  handle: string;
  display_name: string;
  avatar_url: string;
  tier: string;
  moderator: boolean;
  banned: boolean;
  banReason: string;
  mutedUntil: string | null;
  muteReason: string;
  warnings: number;
  lastWarning: string;
  canManage: boolean;
};

async function requireStaffMember() {
  const me = await currentStaff();
  if (!me.signedIn || (!me.developer && !me.moderator)) throw new Error("Unauthorized");
  return me;
}

/** The signed-in member's own sanction state (used for the ban screen). */
export const getMySanction = createServerFn({ method: "GET" }).handler(async () => {
  const me = await currentStaff();
  if (!me.signedIn) return { banned: false, banReason: "", mutedUntil: null as string | null };
  const state = await sanctionState(me.email);
  return { banned: state.banned, banReason: state.banReason, mutedUntil: state.mutedUntil };
});

/** Every account with its badge, role and moderation state. Staff only. */
export const listAccounts = createServerFn({ method: "GET" }).handler(async () => {
  const me = await requireStaffMember();
  const supabase = await db();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("email, handle, display_name, avatar_url, tier")
    .order("created_at", { ascending: false });
  const rows = (profiles ?? []) as {
    email: string;
    handle: string;
    display_name: string;
    avatar_url: string | null;
    tier: string;
  }[];
  const { data: roles } = await supabase
    .from("user_roles")
    .select("username")
    .eq("role", "moderator");
  const mods = new Set((roles ?? []).map((r) => (r as { username: string }).username));
  const states = await sanctionsFor(rows.map((r) => r.email));

  return await Promise.all(
    rows.map(async (p) => {
      const state = states.get(p.email)!;
      const isMod = mods.has(p.email);
      const isDev = p.email === "developer" || p.email === "techbymarcon";
      return {
        username: p.email,
        handle: p.handle,
        display_name: p.display_name,
        avatar_url: p.avatar_url ?? "",
        tier: await effectiveTier(p.email, p.tier),
        moderator: isMod,
        banned: state.banned,
        banReason: state.banReason,
        mutedUntil: state.mutedUntil,
        muteReason: state.muteReason,
        warnings: state.warnings,
        lastWarning: state.lastWarning,
        // Moderators can only act on ordinary members; the developer can act on anyone but self.
        canManage:
          p.email !== me.email && !isDev && (me.developer || (!isMod && me.moderator)),
      } satisfies ManagedAccount;
    }),
  );
});

type Action = "ban" | "unban" | "timeout" | "untimeout" | "warn";

/** Ban, unban, time out, clear a timeout, or log a warning against an account. */
export const moderateAccount = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { username: string; action: Action; reason?: string; minutes?: number }) => data,
  )
  .handler(async ({ data }) => {
    const me = await requireStaffMember();
    const target = data.username;
    if (!target || target === me.email) return { ok: false as const, error: "Not allowed." };
    if (target === "developer" || target === "techbymarcon") {
      return { ok: false as const, error: "The developer cannot be moderated." };
    }
    if (!me.developer && (await isModerator(target))) {
      return { ok: false as const, error: "Only the developer can moderate another moderator." };
    }

    const supabase = await db();
    const reason = (data.reason ?? "").trim().slice(0, 400);
    const actor = await actorFor(me.email);
    const alert = async (title: string, body: string) => {
      await notify({
        recipient: target,
        kind: "system",
        title,
        body,
        link: "",
        actorHandle: actor.handle,
        actorAvatar: actor.avatar,
        actorTier: actor.tier,
      });
    };

    if (data.action === "ban") {
      const { error } = await supabase
        .from("account_sanctions")
        .insert({ username: target, kind: "ban", reason, issued_by: me.email } as never);
      if (error) return { ok: false as const, error: "Could not ban that account." };
      await alert("Your account has been banned", reason);
    } else if (data.action === "unban") {
      await supabase
        .from("account_sanctions")
        .update({ lifted: true })
        .eq("username", target)
        .eq("kind", "ban")
        .eq("lifted", false);
      await alert("Your ban has been lifted", reason);
    } else if (data.action === "timeout") {
      const minutes = Math.min(60 * 24 * 30, Math.max(1, Math.round(data.minutes ?? 60)));
      const expires = new Date(Date.now() + minutes * 60_000).toISOString();
      const { error } = await supabase.from("account_sanctions").insert({
        username: target,
        kind: "timeout",
        reason,
        issued_by: me.email,
        expires_at: expires,
      } as never);
      if (error) return { ok: false as const, error: "Could not time out that account." };
      await alert(`You've been timed out for ${minutes} minute${minutes === 1 ? "" : "s"}`, reason);
    } else if (data.action === "untimeout") {
      await supabase
        .from("account_sanctions")
        .update({ lifted: true })
        .eq("username", target)
        .eq("kind", "timeout")
        .eq("lifted", false);
      await alert("Your timeout has been cleared", reason);
    } else if (data.action === "warn") {
      if (!reason) return { ok: false as const, error: "Add a reason for the warning." };
      const { error } = await supabase
        .from("account_sanctions")
        .insert({ username: target, kind: "warning", reason, issued_by: me.email } as never);
      if (error) return { ok: false as const, error: "Could not log that warning." };
      await alert("You received a warning", reason);
    } else {
      return { ok: false as const, error: "Unknown action." };
    }

    return { ok: true as const };
  });

/** Recent forum posts and comments by one member, for the moderation panel. */
export const accountActivity = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string }) => data)
  .handler(async ({ data }) => {
    await requireStaffMember();
    const supabase = await db();
    const { data: posts } = await supabase
      .from("forum_posts")
      .select("id, title, body, created_at")
      .eq("author_email", data.username)
      .order("created_at", { ascending: false })
      .limit(10);
    const { data: comments } = await supabase
      .from("comments")
      .select("id, article_id, body, created_at")
      .eq("author_email", data.username)
      .order("created_at", { ascending: false })
      .limit(10);
    const { data: history } = await supabase
      .from("account_sanctions")
      .select("id, kind, reason, issued_by, expires_at, lifted, created_at")
      .eq("username", data.username)
      .order("created_at", { ascending: false })
      .limit(20);
    return {
      posts: (posts ?? []) as { id: string; title: string; body: string; created_at: string }[],
      comments: (comments ?? []) as {
        id: string;
        article_id: string;
        body: string;
        created_at: string;
      }[],
      history: (history ?? []) as {
        id: string;
        kind: string;
        reason: string;
        issued_by: string;
        expires_at: string | null;
        lifted: boolean;
        created_at: string;
      }[],
    };
  });
