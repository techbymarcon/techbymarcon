import { db, effectiveTier } from "./content.server";

export type NotifyInput = {
  recipient: string;
  kind: string;
  title: string;
  body?: string;
  link?: string;
  actorHandle?: string;
  actorAvatar?: string;
  actorTier?: string;
};

/** Fire-and-forget notification insert; never blocks the caller's action. */
export async function notify(input: NotifyInput) {
  try {
    if (!input.recipient) return;
    const supabase = await db();
    await supabase.from("notifications").insert({
      recipient_email: input.recipient,
      kind: input.kind,
      title: input.title.slice(0, 160),
      body: (input.body ?? "").slice(0, 400),
      link: input.link ?? "",
      actor_handle: input.actorHandle ?? "",
      actor_avatar: input.actorAvatar ?? "",
      actor_tier: input.actorTier ?? "blue",
    } as never);
  } catch {
    /* notifications must never break the underlying action */
  }
}

/** Look up a profile's public bits for use as the notification actor. */
export async function actorFor(email: string) {
  const supabase = await db();
  const { data } = await supabase
    .from("profiles")
    .select("handle, display_name, avatar_url, tier")
    .eq("email", email)
    .maybeSingle();
  const row = data as
    | { handle: string; display_name: string; avatar_url: string; tier: string }
    | null;
  return {
    handle: row?.handle ?? "someone",
    displayName: row?.display_name ?? "Someone",
    avatar: row?.avatar_url ?? "",
    tier: await effectiveTier(email, row?.tier),
  };
}

/** A greeting from techbymarcon, at most once every 12 hours per member. */
export async function welcomeNotification(email: string, firstTime: boolean) {
  try {
    if (!email) return;
    const supabase = await db();
    if (!firstTime) {
      const since = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      const { data: recent } = await supabase
        .from("notifications")
        .select("id")
        .eq("recipient_email", email)
        .eq("kind", "welcome")
        .gte("created_at", since)
        .maybeSingle();
      if (recent) return;
    }
    const dev = await actorFor("developer");
    await notify({
      recipient: email,
      kind: "welcome",
      title: firstTime ? "Welcome to Tech by Marcon!" : "Welcome back!",
      body: firstTime
        ? "Thanks for joining. Explore the articles, jump into the forum and say hi — Marcon."
        : "Good to see you again. Check what's new in the forum and the latest articles — Marcon.",
      link: "/articles",
      actorHandle: dev.handle || "techbymarcon",
      actorAvatar: dev.avatar,
      actorTier: "gold",
    });
  } catch {
    /* ignore */
  }
}
