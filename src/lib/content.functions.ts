import { createServerFn } from "@tanstack/react-start";
import {
  currentIdentity,
  currentStaff,
  db,
  effectiveTier,
  getGateSession,
  hashPassword,
  isDeveloperSession,
  isModerator,
  passwordMatches,
  requireDeveloper,
  requireIdentity,
  requireStaff,
  setUserSession,
  verifyPassword,
} from "./content.server";
import { notify, welcomeNotification } from "./notifications.server";


export const getDeveloperStatus = createServerFn({ method: "GET" }).handler(async () => ({
  developer: await isDeveloperSession(),
}));

export const developerSignIn = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => data)
  .handler(async ({ data }) => {
    const expected = process.env["DEVELOPER_PASSWORD"];
    if (!expected) throw new Error("Developer password is not configured");
    if (!data.password || !passwordMatches(data.password, expected)) {
      return { ok: false as const };
    }
    const session = await getGateSession();
    await session.update({ developer: true, email: "developer" });
    await welcomeNotification("developer", false);
    return { ok: true as const };
  });

export const developerSignOut = createServerFn({ method: "POST" }).handler(async () => {
  const session = await getGateSession();
  await session.clear();
  return { ok: true as const };
});

export const listArticles = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = await db();
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .order("date", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const upsertArticle = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string;
      title: string;
      description: string;
      body: string;
      category: string;
      date: string;
      readingTime: string;
      cover: string;
      featured: boolean;
      downloadUrl?: string;
      downloadName?: string;
      downloadSize?: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireDeveloper();
    const supabase = await db();
    const { error } = await supabase.from("articles").upsert({
      id: data.id,
      title: data.title,
      description: data.description,
      body: data.body,
      category: data.category,
      date: data.date,
      reading_time: data.readingTime,
      cover: data.cover,
      featured: data.featured,
      download_url: data.downloadUrl ?? "",
      download_name: data.downloadName ?? "",
      download_size: data.downloadSize ?? 0,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteArticle = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await requireDeveloper();
    const supabase = await db();
    const { error } = await supabase.from("articles").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const getSiteContent = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = await db();
  const { data, error } = await supabase
    .from("site_content")
    .select("value")
    .eq("key", "main")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return { json: JSON.stringify(data?.value ?? {}) };
});

export const saveSiteContent = createServerFn({ method: "POST" })
  .inputValidator((data: { json: string }) => data)
  .handler(async ({ data }) => {
    await requireDeveloper();
    const supabase = await db();
    const { error } = await supabase
      .from("site_content")
      .upsert({
        key: "main",
        value: JSON.parse(data.json),
        updated_at: new Date().toISOString(),
      });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

const DEV_EMAIL = "developer";

const slugHandle = (raw: string) =>
  raw
    .toLowerCase()
    .replace(/@.*$/, "")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20) || `user${Math.random().toString(36).slice(2, 8)}`;

type ProfileRow = {
  email: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  tier: string;
  password_hash?: string | null;
  login_code?: string | null;
};

export type PublicProfile = {
  handle: string;
  display_name: string;
  avatar_url: string;
  tier: string;
};

const publicProfile = (
  row: ProfileRow | null | undefined,
  tierOverride?: string,
): PublicProfile | null =>
  row
    ? {
        handle: row.handle,
        display_name: row.display_name,
        avatar_url: row.avatar_url ?? "",
        tier: tierOverride ?? row.tier,
      }
    : null;

/** Usernames are the only identifier we collect — no email addresses, for privacy. */
const normalizeUsername = (value: string) =>
  value.trim().toLowerCase().replace(/^@/, "").replace(/[^a-z0-9_]/g, "");
const isUsername = (value: string) => /^[a-z0-9_]{3,20}$/.test(value);

/** `email` is the legacy account-key column; it now stores the username. */
async function profileByEmail(email: string) {
  const supabase = await db();
  const { data } = await supabase.from("profiles").select("*").eq("email", email).maybeSingle();
  return (data as ProfileRow | null) ?? null;
}


/** Session state — identity always comes from the httpOnly cookie, never the client. */
export const getSessionInfo = createServerFn({ method: "GET" }).handler(async () => {
  const id = await currentIdentity();
  if (!id.email) {
    return {
      signedIn: false as const,
      developer: false,
      moderator: false,
      profile: null,
      loginCode: "",
    };
  }
  const row = await profileByEmail(id.email);
  return {
    signedIn: true as const,
    developer: id.developer,
    moderator: id.developer ? true : await isModerator(id.email),
    profile: publicProfile(row, await effectiveTier(id.email, row?.tier)),
    loginCode: row?.login_code ?? "",
  };
});


/** Code accounts: a random 5-digit code is the only credential. */
export const codeSignUp = createServerFn({ method: "POST" }).handler(async () => {
  const supabase = await db();
  for (let attempt = 0; attempt < 25; attempt++) {
    const code = String(Math.floor(Math.random() * 100000)).padStart(5, "0");
    if (code === "99999") continue;

    const { data: taken } = await supabase
      .from("profiles")
      .select("email")
      .eq("login_code", code)
      .maybeSingle();
    if (taken) continue;

    const username = `code_${code}`;
    if (await profileByEmail(username)) continue;
    const handle = `member${code}`;
    const { data: created, error } = await supabase
      .from("profiles")
      .insert({
        email: username,
        handle,
        display_name: handle,
        avatar_url: "",
        tier: "blue",
        password_hash: null,
        login_code: code,
      } as never)
      .select("*")
      .single();
    if (error) continue;
    await setUserSession(username);
    await welcomeNotification(username, true);
    const tier = await effectiveTier(username, (created as ProfileRow).tier);
    return { ok: true as const, code, profile: publicProfile(created as ProfileRow, tier) };
  }
  return { ok: false as const, error: "Could not create a code right now. Try again." };
});

export const codeSignIn = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string }) => data)
  .handler(async ({ data }) => {
    const code = (data.code ?? "").replace(/\D/g, "");
    if (code.length !== 5) return { ok: false as const, error: "Enter your 5-digit code." };
    if (code === "99999") {
      const session = await getGateSession();
      await session.update({ developer: true, email: DEV_EMAIL });
      return { ok: true as const, profile: publicProfile(await profileByEmail(DEV_EMAIL)) };
    }
    const supabase = await db();
    const { data: row } = await supabase
      .from("profiles")
      .select("*")
      .eq("login_code", code)
      .maybeSingle();
    if (!row) return { ok: false as const, error: "That code doesn't match an account." };

    await setUserSession((row as ProfileRow).email);
    await welcomeNotification((row as ProfileRow).email, false);
    return { ok: true as const, profile: publicProfile(row as ProfileRow) };
  });


export const getDeveloperProfile = createServerFn({ method: "GET" }).handler(async () => {
  const row = await profileByEmail(DEV_EMAIL);
  return { profile: publicProfile(row, await effectiveTier(DEV_EMAIL, row?.tier)) };
});

export const userSignUp = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string; password: string; displayName?: string }) => data)
  .handler(async ({ data }) => {
    try {
      const username = normalizeUsername(data.username ?? "");
      const password = data.password ?? "";
      if (!isUsername(username)) {
        return {
          ok: false as const,
          error: "Username must be 3–20 characters: letters, numbers or underscores.",
        };
      }
      if (username === "developer" || username === "techbymarcon") {
        return { ok: false as const, error: "That username is reserved." };
      }
      const supabase = await db();
      const existing = await profileByEmail(username);
      if (existing) return { ok: false as const, error: "That username is taken." };

      const { data: clash } = await supabase
        .from("profiles")
        .select("handle")
        .eq("handle", username)
        .maybeSingle();
      if (clash) return { ok: false as const, error: "That username is taken." };

      const { data: created, error } = await supabase
        .from("profiles")
        .insert({
          email: username,
          handle: username,
          display_name: data.displayName?.trim().slice(0, 40) || username,
          avatar_url: "",
          tier: "blue",
          password_hash: await hashPassword(password),
        })
        .select("*")
        .single();
      if (error) {
        return {
          ok: false as const,
          error: /duplicate|unique/i.test(error.message)
            ? "That username is taken."
            : `Could not create that account: ${error.message}`,
        };
      }
      await setUserSession(username);
      await welcomeNotification(username, true);
      const tier = await effectiveTier(username, (created as ProfileRow).tier);
      return { ok: true as const, profile: publicProfile(created as ProfileRow, tier) };
    } catch (err) {
      return {
        ok: false as const,
        error: `Sign-up failed: ${err instanceof Error ? err.message : "unknown error"}`,
      };
    }
  });

export const userSignIn = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string; password: string }) => data)
  .handler(async ({ data }) => {
    const username = normalizeUsername(data.username ?? "");
    const row = await profileByEmail(username);
    const ok = row ? await verifyPassword(data.password ?? "", row.password_hash) : false;
    if (!row || !ok || row.tier === "gold") {
      return { ok: false as const, error: "Wrong username or password." };
    }
    await setUserSession(username);
    await welcomeNotification(username, false);
    return { ok: true as const, profile: publicProfile(row, await effectiveTier(username, row.tier)) };
  });


export const updateProfile = createServerFn({ method: "POST" })
  .inputValidator((data: { displayName: string; handle: string; avatarUrl: string }) => data)
  .handler(async ({ data }) => {
    const { email, developer } = await requireIdentity();
    const supabase = await db();
    const handle = slugHandle(data.handle);
    if (!handle) return { ok: false as const, error: "Invalid handle." };
    if (handle === "techbymarcon" && !developer) {
      return { ok: false as const, error: "That handle is reserved." };
    }
    const { data: clash } = await supabase
      .from("profiles")
      .select("email")
      .eq("handle", handle)
      .maybeSingle();
    if (clash && clash.email !== email) {
      return { ok: false as const, error: "Handle already taken." };
    }

    const { data: row, error } = await supabase
      .from("profiles")
      .update({
        handle,
        display_name: data.displayName.trim().slice(0, 40) || handle,
        avatar_url: data.avatarUrl.trim().slice(0, 500),
      })
      .eq("email", email)
      .select("*")
      .single();
    if (error || !row) return { ok: false as const, error: "Could not save your profile." };

    await supabase
      .from("comments")
      .update({ handle: row.handle, display_name: row.display_name, avatar_url: row.avatar_url })
      .eq("author_email", email);

    const tier = await effectiveTier(email, (row as ProfileRow).tier);
    return { ok: true as const, profile: publicProfile(row as ProfileRow, tier) };
  });

export const listComments = createServerFn({ method: "POST" })
  .inputValidator((data: { articleId: string }) => data)
  .handler(async ({ data }) => {
    const supabase = await db();
    const id = await currentIdentity();
    const { data: rows, error } = await supabase
      .from("comments")
      .select("*")
      .eq("article_id", data.articleId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return await Promise.all(
      (rows ?? []).map(async (c) => ({
        id: c.id as string,
        article_id: c.article_id as string,
        handle: c.handle as string,
        display_name: c.display_name as string,
        avatar_url: (c.avatar_url as string) ?? "",
        tier: await effectiveTier(c.author_email as string, c.tier as string),
        body: c.body as string,
        image_url: ((c as Record<string, unknown>)["image_url"] as string) ?? "",
        parent_id: (((c as Record<string, unknown>)["parent_id"] as string) ?? null) as
          | string
          | null,
        created_at: c.created_at as string,
        mine: Boolean(id.email && c.author_email === id.email),
      })),
    );
  });

export const addComment = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      articleId: string;
      body: string;
      imageUrl?: string;
      parentId?: string | null;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { email } = await requireIdentity();
    const body = data.body.trim().slice(0, 2000);
    const imageUrl = (data.imageUrl ?? "").trim().slice(0, 500);
    if (!body && !imageUrl) return { ok: false as const, error: "Write something first." };

    const supabase = await db();
    if (data.articleId.startsWith("forum:")) {
      const { data: post } = await supabase
        .from("forum_posts")
        .select("locked")
        .eq("id", data.articleId.slice(6))
        .maybeSingle();
      if (post?.locked) return { ok: false as const, error: "This thread is locked." };
    }
    const profile = await profileByEmail(email);
    if (!profile) return { ok: false as const, error: "Sign in to comment." };
    const tier = await effectiveTier(email, profile.tier);

    const { error } = await supabase.from("comments").insert({
      article_id: data.articleId,
      author_email: email,
      handle: profile.handle,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url ?? "",
      tier,
      body,
      image_url: imageUrl,
      parent_id: data.parentId ?? null,
    } as never);
    if (error) return { ok: false as const, error: "Could not post that comment." };

    // Tell the person being answered: parent comment author, thread author, or the developer.
    let recipient: string | null = null;
    let title = "New reply";
    let link = `/articles/${data.articleId}`;
    const isForum = data.articleId.startsWith("forum:");
    if (isForum) link = `/forum/${data.articleId.slice(6)}`;
    if (data.parentId) {
      const { data: parent } = await supabase
        .from("comments")
        .select("author_email")
        .eq("id", data.parentId)
        .maybeSingle();
      recipient = (parent as { author_email?: string } | null)?.author_email ?? null;
      title = "Someone replied to you";
    } else if (isForum) {
      const { data: post } = await supabase
        .from("forum_posts")
        .select("author_email, title")
        .eq("id", data.articleId.slice(6))
        .maybeSingle();
      const row = post as { author_email?: string; title?: string } | null;
      recipient = row?.author_email ?? null;
      title = `New comment on "${row?.title ?? "your post"}"`;
    } else {
      recipient = DEV_EMAIL;
      title = "New comment on an article";
    }
    if (recipient && recipient !== email) {
      await notify({
        recipient,
        kind: "comment",
        title,
        body: `@${profile.handle}: ${body || "sent an image"}`,
        link,
        actorHandle: profile.handle,
        actorAvatar: profile.avatar_url ?? "",
        actorTier: tier,
      });
    }
    return { ok: true as const };
  });


export const deleteComment = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const staff = await currentStaff();
    if (!staff.signedIn) throw new Error("Unauthorized");
    const supabase = await db();
    const query = supabase.from("comments").delete().eq("id", data.id);
    const { error } =
      staff.developer || staff.moderator ? await query : await query.eq("author_email", staff.email);
    if (error) throw new Error("Could not delete that comment.");
    return { ok: true as const };
  });

export const editComment = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; body: string }) => data)
  .handler(async ({ data }) => {
    const staff = await currentStaff();
    if (!staff.signedIn) throw new Error("Unauthorized");
    const body = data.body.trim().slice(0, 2000);
    if (!body) return { ok: false as const, error: "Write something first." };
    const supabase = await db();
    const query = supabase.from("comments").update({ body }).eq("id", data.id);
    const { error } =
      staff.developer || staff.moderator ? await query : await query.eq("author_email", staff.email);

    if (error) return { ok: false as const, error: "Could not save that comment." };
    return { ok: true as const };
  });

export const uploadAvatar = createServerFn({ method: "POST" })
  .inputValidator((data: { dataUrl: string }) => data)
  .handler(async ({ data }) => {
    const { email } = await requireIdentity();

    const match = /^data:(image\/(png|jpeg|jpg|gif|webp));base64,([A-Za-z0-9+/=]+)$/.exec(
      data.dataUrl,
    );
    if (!match) return { ok: false as const, error: "Use a PNG, JPG, GIF or WEBP image." };
    const contentType = match[1]!;
    const bytes = Buffer.from(match[3]!, "base64");
    if (bytes.byteLength > 5 * 1024 * 1024) {
      return { ok: false as const, error: "Image must be smaller than 5 MB." };
    }
    const ext = contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1]!;
    const name = `${slugHandle(email) || "user"}-${Date.now()}.${ext}`;

    const supabase = await db();
    const { error } = await supabase.storage
      .from("avatars")
      .upload(name, bytes, { contentType, upsert: true });
    if (error) return { ok: false as const, error: "Could not upload that image." };

    const url = `/api/public/avatars/${name}`;
    const { data: row } = await supabase
      .from("profiles")
      .update({ avatar_url: url })
      .eq("email", email)
      .select("*")
      .single();
    await supabase.from("comments").update({ avatar_url: url }).eq("author_email", email);
    const tier = await effectiveTier(email, (row as ProfileRow).tier);
    return { ok: true as const, url, profile: publicProfile(row as ProfileRow, tier) };
  });

export const uploadArticleImage = createServerFn({ method: "POST" })
  .inputValidator((data: { dataUrl: string }) => data)
  .handler(async ({ data }) => {
    await requireDeveloper();

    const match = /^data:(image\/(png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(data.dataUrl);
    if (!match) return { ok: false as const, error: "Use a PNG, JPG or JPEG image." };
    const contentType = match[1]!;
    const bytes = Buffer.from(match[3]!, "base64");
    if (bytes.byteLength > 5 * 1024 * 1024) {
      return { ok: false as const, error: "Image must be smaller than 5 MB." };
    }
    const ext = contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1]!;
    const name = `cover-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const supabase = await db();
    const { error } = await supabase.storage
      .from("avatars")
      .upload(name, bytes, { contentType, upsert: true });
    if (error) return { ok: false as const, error: "Could not upload that image." };

    return { ok: true as const, url: `/api/public/avatars/${name}` };
  });

export const uploadCommentImage = createServerFn({ method: "POST" })
  .inputValidator((data: { dataUrl: string }) => data)
  .handler(async ({ data }) => {
    const { email } = await requireIdentity();

    const match = /^data:(image\/(png|jpeg|jpg|gif|webp));base64,([A-Za-z0-9+/=]+)$/.exec(
      data.dataUrl,
    );
    if (!match) return { ok: false as const, error: "Use a PNG, JPG, GIF or WEBP image." };
    const contentType = match[1]!;
    const bytes = Buffer.from(match[3]!, "base64");
    if (bytes.byteLength > 5 * 1024 * 1024) {
      return { ok: false as const, error: "Image must be smaller than 5 MB." };
    }
    const ext = contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1]!;
    const name = `comment-${slugHandle(email) || "user"}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;

    const supabase = await db();
    const { error } = await supabase.storage
      .from("avatars")
      .upload(name, bytes, { contentType, upsert: true });
    if (error) return { ok: false as const, error: "Could not upload that image." };

    return { ok: true as const, url: `/api/public/avatars/${name}` };
  });

export const createDownloadUpload = createServerFn({ method: "POST" })
  .inputValidator((data: { fileName: string; size: number }) => data)
  .handler(async ({ data }) => {
    await requireDeveloper();
    if (!data.fileName) return { ok: false as const, error: "Missing file name." };
    if (data.size > 1024 * 1024 * 1024) {
      return { ok: false as const, error: "File must be 1 GB or smaller." };
    }
    const supabase = await db();
    await supabase.storage.updateBucket("downloads", {
      public: false,
      fileSizeLimit: 1024 * 1024 * 1024,
    });
    const safe = data.fileName.replace(/[^A-Za-z0-9._-]+/g, "-").slice(-80);
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
    const { data: signed, error } = await supabase.storage
      .from("downloads")
      .createSignedUploadUrl(path);
    if (error || !signed) return { ok: false as const, error: "Could not start the upload." };
    return { ok: true as const, path, token: signed.token };
  });

export const getArticleDownload = createServerFn({ method: "POST" })
  .inputValidator((data: { path: string }) => data)
  .handler(async ({ data }) => {
    const identity = await currentIdentity();
    if (!identity.email) {
      return { ok: false as const, error: "Sign in or sign up to download this file." };
    }
    const supabase = await db();
    const { data: signed, error } = await supabase.storage
      .from("downloads")
      .createSignedUrl(data.path, 60, { download: true });
    if (error || !signed) return { ok: false as const, error: "This file is no longer available." };
    return { ok: true as const, url: signed.signedUrl };
  });

/** Read-only public profile lookup — anyone can view a member card, nobody can change it. */
export const getProfileByHandle = createServerFn({ method: "POST" })
  .inputValidator((data: { handle: string }) => data)
  .handler(async ({ data }) => {
    const handle = slugHandle(data.handle ?? "");
    if (!handle) return { profile: null, stats: null };
    const supabase = await db();
    const { data: row } = await supabase
      .from("profiles")
      .select("*")
      .eq("handle", handle)
      .maybeSingle();
    if (!row) return { profile: null, stats: null };
    const email = (row as ProfileRow).email;
    const tier = await effectiveTier(email, (row as ProfileRow).tier);
    const { count: posts } = await supabase
      .from("forum_posts")
      .select("id", { count: "exact", head: true })
      .eq("author_email", email);
    const { count: comments } = await supabase
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("author_email", email);
    return {
      profile: publicProfile(row as ProfileRow, tier),
      stats: {
        posts: posts ?? 0,
        comments: comments ?? 0,
        joined: (row as unknown as { created_at?: string }).created_at ?? "",
        moderator: tier === "green",
        developer: tier === "gold",
      },
    };
  });
