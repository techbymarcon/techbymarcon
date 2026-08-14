/**
 * Bearer-token API for native clients (Android/Kotlin).
 *
 * The website itself authenticates with an httpOnly cookie, which a native app
 * cannot use. These helpers back the `/api/public/*` routes and accept the very
 * same encrypted access key as an `Authorization: Bearer <key>` header instead.
 */
import {
  DEFAULT_FORUM_RULES,
  forumRules,
  issueKeyForAccount,
  openKey,
  scopesFor,
  tierForAccount,
  type KeyTier,
  type Scope,
} from "./access-key.server";
import { db, effectiveTier, hashPassword, passwordMatches, verifyPassword } from "./content.server";
import { actorFor, notify, welcomeNotification } from "./notifications.server";

export const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type, authorization, x-api-key",
  "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...CORS },
  });

export const preflight = () => new Response(null, { status: 204, headers: CORS });

export const readJson = async (request: Request) =>
  ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;

export type Caller = {
  username: string;
  tier: KeyTier;
  scopes: Scope[];
  developer: boolean;
  moderator: boolean;
};

/** Resolve the caller from the bearer key. Tier is re-derived so role changes apply instantly. */
export async function caller(request: Request): Promise<Caller | null> {
  const raw =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ??
    request.headers.get("x-access-key")?.trim() ??
    "";
  const payload = await openKey(raw);
  if (!payload) return null;
  const tier = await tierForAccount(payload.sub);
  return {
    username: payload.sub,
    tier,
    scopes: scopesFor(tier),
    developer: tier === "gold",
    moderator: tier === "green" || tier === "gold",
  };
}

export const can = (who: Caller | null, scope: Scope) => Boolean(who?.scopes.includes(scope));

export const unauthorized = () =>
  json({ error: "Unauthorized", detail: "Send Authorization: Bearer <access key>." }, 401);

export const forbidden = (detail: string) => json({ error: "Forbidden", detail }, 403);

type ProfileRow = {
  email: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  tier: string;
  password_hash?: string | null;
  login_code?: string | null;
};

export async function profileFor(username: string) {
  const supabase = await db();
  const { data } = await supabase.from("profiles").select("*").eq("email", username).maybeSingle();
  return (data as ProfileRow | null) ?? null;
}

export const publicProfile = (row: ProfileRow | null, tier?: string) =>
  row
    ? {
        handle: row.handle,
        display_name: row.display_name,
        avatar_url: row.avatar_url ?? "",
        tier: tier ?? row.tier,
      }
    : null;

const normalizeUsername = (value: string) =>
  value.trim().toLowerCase().replace(/^@/, "").replace(/[^a-z0-9_]/g, "");
const isUsername = (value: string) => /^[a-z0-9_]{3,20}$/.test(value);

async function session(username: string) {
  const { key, tier, scopes } = await issueKeyForAccount(username);
  const row = await profileFor(username);
  return {
    key,
    tier,
    scopes,
    developer: tier === "gold",
    moderator: tier !== "blue",
    username,
    profile: publicProfile(row, tier),
  };
}

/* ------------------------------------------------------------------ auth */

export async function login(body: Record<string, unknown>) {
  const mode = String(body["mode"] ?? "").toLowerCase();
  const username = normalizeUsername(String(body["username"] ?? ""));
  const password = String(body["password"] ?? "");

  // Developer sign-in: username "developer" + the developer password.
  if (mode === "developer" || username === "developer") {
    const expected = process.env["DEVELOPER_PASSWORD"];
    if (!expected) return json({ error: "Developer login is not configured" }, 500);
    if (!password || !passwordMatches(password, expected)) {
      return json({ error: "Invalid credentials" }, 401);
    }
    await welcomeNotification("developer", false);
    return json(await session("developer"));
  }

  // Code-based sign-in has been removed: username + password is the only path.
  if (mode === "code" || body["code"] !== undefined) {
    return json({ error: "Code sign-in has been removed. Use your username and password." }, 410);
  }


  if (!isUsername(username)) return json({ error: "Invalid credentials" }, 401);
  const row = await profileFor(username);
  if (!row || !(await verifyPassword(password, row.password_hash))) {
    return json({ error: "Invalid credentials" }, 401);
  }
  await welcomeNotification(username, false);
  return json(await session(username));
}

export async function register(body: Record<string, unknown>) {
  const username = normalizeUsername(String(body["username"] ?? ""));
  const password = String(body["password"] ?? "");
  const displayName = String(body["displayName"] ?? body["display_name"] ?? "").trim();

  if (!isUsername(username)) {
    return json({ error: "Username must be 3–20 characters: letters, numbers or underscores." }, 400);
  }
  if (username === "developer" || username === "techbymarcon") {
    return json({ error: "That username is reserved." }, 400);
  }
  if (!password) return json({ error: "Pick a password." }, 400);

  const supabase = await db();
  if (await profileFor(username)) return json({ error: "That username is taken." }, 409);
  const { data: clash } = await supabase
    .from("profiles")
    .select("handle")
    .eq("handle", username)
    .maybeSingle();
  if (clash) return json({ error: "That username is taken." }, 409);

  const { error } = await supabase.from("profiles").insert({
    email: username,
    handle: username,
    display_name: displayName || username,
    avatar_url: String(body["avatarUrl"] ?? body["avatar_url"] ?? ""),
    tier: "blue",
    password_hash: await hashPassword(password),
  } as never);
  if (error) return json({ error: "Could not create that account." }, 400);
  await welcomeNotification(username, true);
  return json(await session(username), 201);
}

/** Code accounts have been removed — registration is username + password only. */
export async function registerWithCode() {
  return json(
    { error: "Code accounts have been removed. Register with a username and password." },
    410,
  );
}


export async function me(who: Caller) {
  const row = await profileFor(who.username);
  return json({
    username: who.username,
    tier: who.tier,
    scopes: who.scopes,
    developer: who.developer,
    moderator: who.moderator,
    profile: publicProfile(row, who.tier),
  });
}

/** Update the caller's own display name / avatar. */
export async function updateMe(who: Caller, body: Record<string, unknown>) {
  const patch: Record<string, unknown> = {};
  const display = String(body["displayName"] ?? body["display_name"] ?? "").trim();
  const avatar = String(body["avatarUrl"] ?? body["avatar_url"] ?? "").trim();
  const handle = normalizeUsername(String(body["handle"] ?? ""));
  if (display) patch["display_name"] = display.slice(0, 60);
  if (avatar) patch["avatar_url"] = avatar.slice(0, 500);
  if (handle) {
    if (!isUsername(handle)) return json({ error: "Invalid handle." }, 400);
    const supabase = await db();
    const { data: clash } = await supabase
      .from("profiles")
      .select("email")
      .eq("handle", handle)
      .maybeSingle();
    if (clash && (clash as { email: string }).email !== who.username) {
      return json({ error: "That handle is taken." }, 409);
    }
    patch["handle"] = handle;
  }
  if (!Object.keys(patch).length) return json({ error: "Nothing to update." }, 400);
  const supabase = await db();
  const { error } = await supabase.from("profiles").update(patch as never).eq("email", who.username);
  if (error) return json({ error: "Could not save that profile." }, 400);
  return json({ ok: true, profile: publicProfile(await profileFor(who.username), who.tier) });
}

/* ----------------------------------------------------------------- forum */

type Tally = { up: number; down: number; mine: number };

async function tallies(ids: string[], username: string) {
  const map = new Map<string, Tally>();
  for (const id of ids) map.set(id, { up: 0, down: 0, mine: 0 });
  if (!ids.length) return map;
  const supabase = await db();
  const { data } = await supabase
    .from("forum_votes")
    .select("post_id, voter_email, value")
    .in("post_id", ids);
  for (const raw of (data ?? []) as { post_id: string; voter_email: string; value: number }[]) {
    const entry = map.get(raw.post_id);
    if (!entry) continue;
    if (raw.value > 0) entry.up += 1;
    else if (raw.value < 0) entry.down += 1;
    if (username && raw.voter_email === username) entry.mine = raw.value > 0 ? 1 : -1;
  }
  return map;
}

async function shapePost(row: Record<string, unknown>, who: Caller | null, votes?: Tally) {
  const author = row["author_email"] as string;
  const mine = Boolean(who && author === who.username);
  return {
    id: row["id"] as string,
    handle: row["handle"] as string,
    display_name: row["display_name"] as string,
    avatar_url: (row["avatar_url"] as string) ?? "",
    tier: await effectiveTier(author, (row["tier"] as string) ?? "blue"),
    title: row["title"] as string,
    body: (row["body"] as string) ?? "",
    image_url: (row["image_url"] as string) ?? "",
    pinned: Boolean(row["pinned"]),
    locked: Boolean(row["locked"]),
    created_at: row["created_at"] as string,
    updated_at: row["updated_at"] as string,
    mine,
    can_edit: mine || Boolean(who?.moderator),
    can_delete: mine || can(who, "forum:delete:any"),
    upvotes: votes?.up ?? 0,
    downvotes: votes?.down ?? 0,
    score: (votes?.up ?? 0) - (votes?.down ?? 0),
    my_vote: votes?.mine ?? 0,
  };
}

export async function listPosts(request: Request, who: Caller | null) {
  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
  const supabase = await db();
  const { data, error } = await supabase
    .from("forum_posts")
    .select("*")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) return json({ error: "Query failed" }, 500);
  const rows = (data ?? []) as Record<string, unknown>[];
  const map = await tallies(rows.map((r) => r["id"] as string), who?.username ?? "");
  return json({
    posts: await Promise.all(rows.map((r) => shapePost(r, who, map.get(r["id"] as string)))),
  });
}

export async function getPost(id: string, who: Caller | null) {
  const supabase = await db();
  const { data } = await supabase.from("forum_posts").select("*").eq("id", id).maybeSingle();
  if (!data) return json({ error: "Not found" }, 404);
  const map = await tallies([id], who?.username ?? "");
  return json({ post: await shapePost(data as Record<string, unknown>, who, map.get(id)) });
}

export async function createPost(who: Caller, body: Record<string, unknown>) {
  if (!can(who, "forum:post")) return forbidden("Your key does not allow posting in the forum.");
  const title = String(body["title"] ?? "").trim().slice(0, 140);
  const text = String(body["body"] ?? "").trim().slice(0, 8000);
  if (!title) return json({ error: "Give your post a title." }, 400);

  const supabase = await db();
  if (!can(who, "forum:moderate")) {
    const rules = await forumRules().catch(() => DEFAULT_FORUM_RULES);
    if (rules.postCooldownSeconds > 0 || rules.maxPostsPerDay > 0) {
      const since = new Date(Date.now() - 86400000).toISOString();
      const { data: recent } = await supabase
        .from("forum_posts")
        .select("created_at")
        .eq("author_email", who.username)
        .gte("created_at", since)
        .order("created_at", { ascending: false });
      const rows = (recent ?? []) as { created_at: string }[];
      if (rules.maxPostsPerDay > 0 && rows.length >= rules.maxPostsPerDay) {
        return json(
          { error: `Daily limit reached — members can post ${rules.maxPostsPerDay} times per day.` },
          429,
        );
      }
      const last = rows[0] ? new Date(rows[0]!.created_at).getTime() : 0;
      const wait = Math.ceil((rules.postCooldownSeconds * 1000 - (Date.now() - last)) / 1000);
      if (last && wait > 0) return json({ error: `Slow down — you can post again in ${wait}s.` }, 429);
    }
  }

  const profile = await profileFor(who.username);
  if (!profile) return json({ error: "No profile for this key." }, 400);
  const { data: created, error } = await supabase
    .from("forum_posts")
    .insert({
      author_email: who.username,
      handle: profile.handle,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url ?? "",
      tier: who.tier,
      title,
      body: text,
      image_url: String(body["imageUrl"] ?? body["image_url"] ?? "").trim().slice(0, 500),
    } as never)
    .select("*")
    .single();
  if (error || !created) return json({ error: "Could not publish that post." }, 400);
  return json({ post: await shapePost(created as Record<string, unknown>, who) }, 201);
}

export async function updatePost(id: string, who: Caller, body: Record<string, unknown>) {
  const supabase = await db();
  const patch: Record<string, unknown> = {};
  if (body["title"] !== undefined) {
    const title = String(body["title"]).trim().slice(0, 140);
    if (!title) return json({ error: "Give your post a title." }, 400);
    patch["title"] = title;
  }
  if (body["body"] !== undefined) patch["body"] = String(body["body"]).trim().slice(0, 8000);
  if (body["imageUrl"] !== undefined || body["image_url"] !== undefined) {
    patch["image_url"] = String(body["imageUrl"] ?? body["image_url"] ?? "").trim().slice(0, 500);
  }
  // pin/lock are moderation-only
  if (body["pinned"] !== undefined || body["locked"] !== undefined) {
    if (!can(who, "forum:moderate")) return forbidden("Only green and gold keys can pin or lock.");
    if (body["pinned"] !== undefined) patch["pinned"] = Boolean(body["pinned"]);
    if (body["locked"] !== undefined) patch["locked"] = Boolean(body["locked"]);
  }
  if (!Object.keys(patch).length) return json({ error: "Nothing to update." }, 400);

  let query = supabase.from("forum_posts").update(patch as never).eq("id", id);
  if (!who.moderator) query = query.eq("author_email", who.username);
  const { data, error } = await query.select("*").maybeSingle();
  if (error) return json({ error: "Could not save that post." }, 400);
  if (!data) return forbidden("That post is not yours.");
  return json({ post: await shapePost(data as Record<string, unknown>, who) });
}

export async function deletePost(id: string, who: Caller) {
  const supabase = await db();
  let query = supabase.from("forum_posts").delete().eq("id", id);
  if (!can(who, "forum:delete:any")) query = query.eq("author_email", who.username);
  const { data, error } = await query.select("id");
  if (error) return json({ error: "Could not delete that post." }, 400);
  if (!data?.length) return forbidden("That post is not yours.");
  await supabase.from("comments").delete().eq("article_id", `forum:${id}`);
  return json({ ok: true });
}

export async function votePost(id: string, who: Caller, body: Record<string, unknown>) {
  const raw = Number(body["value"] ?? 0);
  const value = raw > 0 ? 1 : raw < 0 ? -1 : 0;
  const supabase = await db();
  const { data: existing } = await supabase
    .from("forum_votes")
    .select("id, value")
    .eq("post_id", id)
    .eq("voter_email", who.username)
    .maybeSingle();
  const current = existing as { id: string; value: number } | null;

  if (value === 0 || (current && current.value === value)) {
    if (current) await supabase.from("forum_votes").delete().eq("id", current.id);
  } else if (current) {
    await supabase.from("forum_votes").update({ value }).eq("id", current.id);
  } else {
    const { error } = await supabase
      .from("forum_votes")
      .insert({ post_id: id, voter_email: who.username, value } as never);
    if (error) return json({ error: "Could not record that vote." }, 400);
  }

  if (value > 0 && (!current || current.value !== value)) {
    const { data: post } = await supabase
      .from("forum_posts")
      .select("author_email, title")
      .eq("id", id)
      .maybeSingle();
    const row = post as { author_email?: string; title?: string } | null;
    if (row?.author_email && row.author_email !== who.username) {
      const actor = await actorFor(who.username);
      await notify({
        recipient: row.author_email,
        kind: "upvote",
        title: `@${actor.handle} upvoted your post`,
        body: row.title ?? "",
        link: `/forum/${id}`,
        actorHandle: actor.handle,
        actorAvatar: actor.avatar,
        actorTier: actor.tier,
      });
    }
  }
  const t = (await tallies([id], who.username)).get(id)!;
  return json({ ok: true, upvotes: t.up, downvotes: t.down, score: t.up - t.down, my_vote: t.mine });
}

/* -------------------------------------------------------------- comments */

/** Comments live in one table; forum replies use the thread id `forum:<postId>`. */
async function shapeComment(row: Record<string, unknown>, who: Caller | null) {
  const author = row["author_email"] as string;
  const mine = Boolean(who && author === who.username);
  return {
    id: row["id"] as string,
    thread: row["article_id"] as string,
    parent_id: (row["parent_id"] as string) ?? null,
    handle: row["handle"] as string,
    display_name: row["display_name"] as string,
    avatar_url: (row["avatar_url"] as string) ?? "",
    tier: await effectiveTier(author, (row["tier"] as string) ?? "blue"),
    body: (row["body"] as string) ?? "",
    image_url: (row["image_url"] as string) ?? "",
    created_at: row["created_at"] as string,
    updated_at: row["updated_at"] as string,
    mine,
    can_edit: mine,
    can_delete: mine || Boolean(who?.moderator),
  };
}

export async function listComments(request: Request, who: Caller | null) {
  const url = new URL(request.url);
  const thread =
    url.searchParams.get("thread") ??
    url.searchParams.get("articleId") ??
    (url.searchParams.get("postId") ? `forum:${url.searchParams.get("postId")}` : null);
  if (!thread) return json({ error: "thread (or articleId / postId) is required" }, 400);
  const supabase = await db();
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("article_id", thread)
    .order("created_at", { ascending: true });
  if (error) return json({ error: "Query failed" }, 500);
  return json({
    thread,
    comments: await Promise.all(
      ((data ?? []) as Record<string, unknown>[]).map((r) => shapeComment(r, who)),
    ),
  });
}

export async function createComment(who: Caller, body: Record<string, unknown>) {
  const thread = String(
    body["thread"] ?? body["articleId"] ?? (body["postId"] ? `forum:${body["postId"]}` : ""),
  ).trim();
  const text = String(body["body"] ?? "").trim().slice(0, 4000);
  const image = String(body["imageUrl"] ?? body["image_url"] ?? "").trim().slice(0, 500);
  const parentId = body["parentId"] ?? body["parent_id"] ?? null;
  if (!thread) return json({ error: "thread is required" }, 400);
  if (!text && !image) return json({ error: "Write something first." }, 400);

  const supabase = await db();
  if (thread.startsWith("forum:")) {
    const { data: post } = await supabase
      .from("forum_posts")
      .select("locked, author_email, title")
      .eq("id", thread.slice(6))
      .maybeSingle();
    const row = post as { locked?: boolean } | null;
    if (row?.locked && !who.moderator) return forbidden("That thread is locked.");
  }

  const profile = await profileFor(who.username);
  if (!profile) return json({ error: "No profile for this key." }, 400);
  const { data: created, error } = await supabase
    .from("comments")
    .insert({
      article_id: thread,
      author_email: who.username,
      handle: profile.handle,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url ?? "",
      tier: who.tier,
      body: text,
      image_url: image,
      parent_id: parentId ? String(parentId) : null,
    } as never)
    .select("*")
    .single();
  if (error || !created) return json({ error: "Could not post that comment." }, 400);

  // Notify the thread owner / parent comment author, same as the website.
  const actor = await actorFor(who.username);
  const link = thread.startsWith("forum:") ? `/forum/${thread.slice(6)}` : `/articles/${thread}`;
  let recipient: string | null = null;
  if (parentId) {
    const { data: parent } = await supabase
      .from("comments")
      .select("author_email")
      .eq("id", String(parentId))
      .maybeSingle();
    recipient = (parent as { author_email?: string } | null)?.author_email ?? null;
  } else if (thread.startsWith("forum:")) {
    const { data: post } = await supabase
      .from("forum_posts")
      .select("author_email")
      .eq("id", thread.slice(6))
      .maybeSingle();
    recipient = (post as { author_email?: string } | null)?.author_email ?? null;
  }
  if (recipient && recipient !== who.username) {
    await notify({
      recipient,
      kind: parentId ? "reply" : "comment",
      title: `@${actor.handle} ${parentId ? "replied to you" : "commented"}`,
      body: text.slice(0, 140),
      link,
      actorHandle: actor.handle,
      actorAvatar: actor.avatar,
      actorTier: actor.tier,
    });
  }
  return json({ comment: await shapeComment(created as Record<string, unknown>, who) }, 201);
}

export async function updateComment(id: string, who: Caller, body: Record<string, unknown>) {
  const text = String(body["body"] ?? "").trim().slice(0, 4000);
  if (!text) return json({ error: "Write something first." }, 400);
  const supabase = await db();
  const { data, error } = await supabase
    .from("comments")
    .update({ body: text } as never)
    .eq("id", id)
    .eq("author_email", who.username)
    .select("*")
    .maybeSingle();
  if (error) return json({ error: "Could not save that comment." }, 400);
  if (!data) return forbidden("That comment is not yours.");
  return json({ comment: await shapeComment(data as Record<string, unknown>, who) });
}

export async function deleteComment(id: string, who: Caller) {
  const supabase = await db();
  let query = supabase.from("comments").delete().eq("id", id);
  if (!who.moderator) query = query.eq("author_email", who.username);
  const { data, error } = await query.select("id");
  if (error) return json({ error: "Could not delete that comment." }, 400);
  if (!data?.length) return forbidden("That comment is not yours.");
  return json({ ok: true });
}

/* ------------------------------------------------------- forum settings */

export async function getRules() {
  const rules = await forumRules().catch(() => DEFAULT_FORUM_RULES);
  return json(rules);
}

export async function setRules(who: Caller, body: Record<string, unknown>) {
  if (!can(who, "forum:ratelimit")) return forbidden("Your key does not allow changing post limits.");
  const rules = {
    postCooldownSeconds: Math.min(
      86400,
      Math.max(0, Math.round(Number(body["postCooldownSeconds"]) || 0)),
    ),
    maxPostsPerDay: Math.min(500, Math.max(0, Math.round(Number(body["maxPostsPerDay"]) || 0))),
  };
  const supabase = await db();
  await supabase
    .from("site_content")
    .upsert({ key: "forum_rules", value: rules } as never, { onConflict: "key" });
  return json({ ok: true, rules });
}

/* --------------------------------------------------------------- people */

export async function getProfile(handle: string) {
  const supabase = await db();
  const { data } = await supabase
    .from("profiles")
    .select("email, handle, display_name, avatar_url, tier")
    .eq("handle", handle.replace(/^@/, ""))
    .maybeSingle();
  const row = data as ProfileRow | null;
  if (!row) return json({ error: "Not found" }, 404);
  const tier = await effectiveTier(row.email, row.tier);
  const { count: posts } = await supabase
    .from("forum_posts")
    .select("id", { count: "exact", head: true })
    .eq("author_email", row.email);
  const { count: comments } = await supabase
    .from("comments")
    .select("id", { count: "exact", head: true })
    .eq("author_email", row.email);
  return json({
    profile: publicProfile(row, tier),
    stats: { posts: posts ?? 0, comments: comments ?? 0 },
  });
}
