import { createServerFn } from "@tanstack/react-start";
import { forumRules, keyAllows } from "./access-key.server";
import { currentStaff, db, effectiveTier, requireDeveloper, requireIdentity } from "./content.server";
import { actorFor, notify } from "./notifications.server";
import { postingBlock } from "./moderation.server";
import { PROFANITY_REJECTION, hasProfanity } from "./profanity";

export type ForumPost = {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string;
  tier: string;
  title: string;
  body: string;
  image_url: string;
  pinned: boolean;
  locked: boolean;
  created_at: string;
  updated_at: string;
  mine: boolean;
  canManage: boolean;
  upvotes: number;
  downvotes: number;
  score: number;
  myVote: number;
};

type VoteRow = { post_id: string; voter_email: string; value: number };

/** Tally votes per post plus the caller's own vote. */
async function voteTally(postIds: string[], email: string) {
  const tally = new Map<string, { up: number; down: number; mine: number }>();
  for (const id of postIds) tally.set(id, { up: 0, down: 0, mine: 0 });
  if (!postIds.length) return tally;
  const supabase = await db();
  const { data } = await supabase
    .from("forum_votes")
    .select("post_id, voter_email, value")
    .in("post_id", postIds);
  for (const raw of (data ?? []) as VoteRow[]) {
    const entry = tally.get(raw.post_id);
    if (!entry) continue;
    if (raw.value > 0) entry.up += 1;
    else if (raw.value < 0) entry.down += 1;
    if (email && raw.voter_email === email) entry.mine = raw.value > 0 ? 1 : -1;
  }
  return tally;
}

const shape = async (
  row: Record<string, unknown>,
  email: string,
  staff: boolean,
  votes?: { up: number; down: number; mine: number },
): Promise<ForumPost> => ({
  id: row["id"] as string,
  handle: row["handle"] as string,
  display_name: row["display_name"] as string,
  avatar_url: (row["avatar_url"] as string) ?? "",
  tier: await effectiveTier(row["author_email"] as string, (row["tier"] as string) ?? "blue"),
  title: row["title"] as string,
  body: (row["body"] as string) ?? "",
  image_url: (row["image_url"] as string) ?? "",
  pinned: Boolean(row["pinned"]),
  locked: Boolean(row["locked"]),
  created_at: row["created_at"] as string,
  updated_at: row["updated_at"] as string,
  mine: Boolean(email && row["author_email"] === email),
  canManage: staff || Boolean(email && row["author_email"] === email),
  upvotes: votes?.up ?? 0,
  downvotes: votes?.down ?? 0,
  score: (votes?.up ?? 0) - (votes?.down ?? 0),
  myVote: votes?.mine ?? 0,
});


export const listForumPosts = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = await db();
  const me = await currentStaff();
  const staff = me.developer || me.moderator;
  const { data, error } = await supabase
    .from("forum_posts")
    .select("*")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Record<string, unknown>[];
  const tally = await voteTally(rows.map((r) => r["id"] as string), me.email);
  return await Promise.all(
    rows.map((row) => shape(row, me.email, staff, tally.get(row["id"] as string))),
  );
});

export const getForumPost = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const supabase = await db();
    const me = await currentStaff();
    const staff = me.developer || me.moderator;
    const { data: row } = await supabase
      .from("forum_posts")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) return { post: null };
    const tally = await voteTally([data.id], me.email);
    return {
      post: await shape(row as Record<string, unknown>, me.email, staff, tally.get(data.id)),
    };
  });

/** One vote per member per post; sending the same value again clears it. */
export const voteForumPost = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; value: number }) => data)
  .handler(async ({ data }) => {
    const me = await currentStaff();
    if (!me.signedIn) return { ok: false as const, error: "Sign in to vote." };
    const value = data.value > 0 ? 1 : data.value < 0 ? -1 : 0;
    const supabase = await db();
    const { data: existing } = await supabase
      .from("forum_votes")
      .select("id, value")
      .eq("post_id", data.id)
      .eq("voter_email", me.email)
      .maybeSingle();
    const current = existing as { id: string; value: number } | null;

    if (value === 0 || (current && current.value === value)) {
      if (current) await supabase.from("forum_votes").delete().eq("id", current.id);
    } else if (current) {
      await supabase.from("forum_votes").update({ value }).eq("id", current.id);
    } else {
      const { error } = await supabase
        .from("forum_votes")
        .insert({ post_id: data.id, voter_email: me.email, value } as never);
      if (error) return { ok: false as const, error: "Could not record that vote." };
    }
    if (value > 0 && (!current || current.value !== value)) {
      const { data: post } = await supabase
        .from("forum_posts")
        .select("author_email, title")
        .eq("id", data.id)
        .maybeSingle();
      const row = post as { author_email?: string; title?: string } | null;
      if (row?.author_email && row.author_email !== me.email) {
        const actor = await actorFor(me.email);
        await notify({
          recipient: row.author_email,
          kind: "upvote",
          title: `@${actor.handle} upvoted your post`,
          body: row.title ?? "",
          link: `/forum/${data.id}`,
          actorHandle: actor.handle,
          actorAvatar: actor.avatar,
          actorTier: actor.tier,
        });
      }
    }
    const tally = await voteTally([data.id], me.email);
    const t = tally.get(data.id)!;
    return { ok: true as const, upvotes: t.up, downvotes: t.down, score: t.up - t.down, myVote: t.mine };
  });


export const createForumPost = createServerFn({ method: "POST" })
  .inputValidator((data: { title: string; body: string; imageUrl?: string }) => data)
  .handler(async ({ data }) => {
    const { email } = await requireIdentity();
    const blocked = await postingBlock(email);
    if (blocked) return { ok: false as const, error: blocked };
    if (!(await keyAllows("forum:post"))) {
      return { ok: false as const, error: "Your key does not allow posting in the forum." };
    }
    const title = data.title.trim().slice(0, 140);
    const body = data.body.trim().slice(0, 8000);
    if (!title) return { ok: false as const, error: "Give your post a title." };
    // No swearing: the post is dropped before it ever reaches the forum.
    if (hasProfanity(title, body)) return { ok: false as const, error: PROFANITY_REJECTION };

    const supabase = await db();

    // Posting limits set by moderators (0 = off). Staff keys are exempt.
    if (!(await keyAllows("forum:moderate"))) {
      const rules = await forumRules();
      if (rules.postCooldownSeconds > 0 || rules.maxPostsPerDay > 0) {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: recent } = await supabase
          .from("forum_posts")
          .select("created_at")
          .eq("author_email", email)
          .gte("created_at", since)
          .order("created_at", { ascending: false });
        const rows = (recent ?? []) as { created_at: string }[];
        if (rules.maxPostsPerDay > 0 && rows.length >= rules.maxPostsPerDay) {
          return {
            ok: false as const,
            error: `Daily limit reached — members can post ${rules.maxPostsPerDay} times per day.`,
          };
        }
        const last = rows[0] ? new Date(rows[0]!.created_at).getTime() : 0;
        const wait = Math.ceil((rules.postCooldownSeconds * 1000 - (Date.now() - last)) / 1000);
        if (last && wait > 0) {
          return { ok: false as const, error: `Slow down — you can post again in ${wait}s.` };
        }
      }
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", email)
      .maybeSingle();
    if (!profile) return { ok: false as const, error: "Sign in to post." };

    const { data: created, error } = await supabase
      .from("forum_posts")
      .insert({
        author_email: email,
        handle: profile.handle,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url ?? "",
        tier: await effectiveTier(email, profile.tier),
        title,
        body,
        image_url: (data.imageUrl ?? "").trim().slice(0, 500),
      } as never)
      .select("id")
      .single();
    if (error || !created) return { ok: false as const, error: "Could not publish that post." };
    return { ok: true as const, id: (created as { id: string }).id };
  });

export const updateForumPost = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; title: string; body: string; imageUrl?: string }) => data)
  .handler(async ({ data }) => {
    const me = await currentStaff();
    if (!me.signedIn) return { ok: false as const, error: "Sign in first." };
    const title = data.title.trim().slice(0, 140);
    if (!title) return { ok: false as const, error: "Give your post a title." };
    if (hasProfanity(title, data.body)) {
      const supabase = await db();
      let del = supabase.from("forum_posts").delete().eq("id", data.id);
      if (!me.developer && !me.moderator) del = del.eq("author_email", me.email);
      await del;
      await supabase.from("comments").delete().eq("article_id", `forum:${data.id}`);
      return { ok: false as const, error: PROFANITY_REJECTION, deleted: true as const };
    }
    const supabase = await db();
    let query = supabase
      .from("forum_posts")
      .update({
        title,
        body: data.body.trim().slice(0, 8000),
        image_url: (data.imageUrl ?? "").trim().slice(0, 500),
      })
      .eq("id", data.id);
    if (!me.developer && !me.moderator) query = query.eq("author_email", me.email);
    const { error } = await query;
    if (error) return { ok: false as const, error: "Could not save that post." };
    return { ok: true as const };
  });

export const deleteForumPost = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const me = await currentStaff();
    if (!me.signedIn) return { ok: false as const, error: "Sign in first." };
    const supabase = await db();
    let query = supabase.from("forum_posts").delete().eq("id", data.id);
    // Only green and gold keys can remove someone else's post.
    if (!(await keyAllows("forum:delete:any"))) query = query.eq("author_email", me.email);
    const { error } = await query;
    if (error) return { ok: false as const, error: "Could not delete that post." };
    await supabase.from("comments").delete().eq("article_id", `forum:${data.id}`);
    return { ok: true as const };
  });

/** Pin and lock are moderation-only controls. */
export const moderateForumPost = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; pinned?: boolean; locked?: boolean }) => data)
  .handler(async ({ data }) => {
    const me = await currentStaff();
    if (!me.developer && !me.moderator) return { ok: false as const, error: "Not allowed." };
    const patch: { pinned?: boolean; locked?: boolean } = {};
    if (typeof data.pinned === "boolean") patch.pinned = data.pinned;
    if (typeof data.locked === "boolean") patch.locked = data.locked;
    const supabase = await db();
    const { error } = await supabase.from("forum_posts").update(patch).eq("id", data.id);
    if (error) return { ok: false as const, error: "Could not update that post." };
    return { ok: true as const };
  });

/** Developer-only moderator roster. */
export const listMembers = createServerFn({ method: "GET" }).handler(async () => {
  await requireDeveloper();
  const supabase = await db();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("email, handle, display_name, avatar_url, tier")
    .order("created_at", { ascending: false });
  const { data: roles } = await supabase
    .from("user_roles")
    .select("username, role")
    .in("role", ["moderator", "developer"]);
  const rows = (roles ?? []) as { username: string; role: string }[];
  const mods = new Set(rows.filter((r) => r.role === "moderator").map((r) => r.username));
  const devs = new Set(rows.filter((r) => r.role === "developer").map((r) => r.username));
  return await Promise.all(
    (profiles ?? []).map(async (p) => ({
      username: p.email as string,
      handle: p.handle as string,
      display_name: p.display_name as string,
      avatar_url: (p.avatar_url as string) ?? "",
      tier: await effectiveTier(p.email as string, p.tier as string),
      developer: devs.has(p.email as string) || p.email === "developer",
      moderator: mods.has(p.email as string),
    })),
  );
});


export const setModerator = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string; moderator: boolean }) => data)
  .handler(async ({ data }) => {
    await requireDeveloper();
    const supabase = await db();
    if (data.moderator) {
      const { error } = await supabase
        .from("user_roles")
        .upsert({ username: data.username, role: "moderator" } as never, {
          onConflict: "username,role",
        });
      if (error) return { ok: false as const, error: "Could not grant that role." };
    } else {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("username", data.username)
        .eq("role", "moderator");
      if (error) return { ok: false as const, error: "Could not remove that role." };
    }
    // Keep the stored badge in sync so old posts and comments show the right check.
    const tier = data.moderator ? "green" : "blue";
    if (data.username !== "developer" && data.username !== "techbymarcon") {
      await supabase.from("profiles").update({ tier }).eq("email", data.username);
      await supabase.from("forum_posts").update({ tier }).eq("author_email", data.username);
      await supabase.from("comments").update({ tier }).eq("author_email", data.username);
    }
    return { ok: true as const };
  });
