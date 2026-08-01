import { createServerFn } from "@tanstack/react-start";
import {
  currentIdentity,
  db,
  getGateSession,
  hashPassword,
  isDeveloperSession,
  passwordMatches,
  requireDeveloper,
  requireIdentity,
  setUserSession,
  verifyPassword,
} from "./content.server";

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
};

export type PublicProfile = {
  handle: string;
  display_name: string;
  avatar_url: string;
  tier: string;
};

const publicProfile = (row: ProfileRow | null | undefined): PublicProfile | null =>
  row
    ? {
        handle: row.handle,
        display_name: row.display_name,
        avatar_url: row.avatar_url ?? "",
        tier: row.tier,
      }
    : null;

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

async function profileByEmail(email: string) {
  const supabase = await db();
  const { data } = await supabase.from("profiles").select("*").eq("email", email).maybeSingle();
  return (data as ProfileRow | null) ?? null;
}

/** Session state — identity always comes from the httpOnly cookie, never the client. */
export const getSessionInfo = createServerFn({ method: "GET" }).handler(async () => {
  const id = await currentIdentity();
  if (!id.email) return { signedIn: false as const, developer: false, profile: null };
  const row = await profileByEmail(id.email);
  return { signedIn: true as const, developer: id.developer, profile: publicProfile(row) };
});

export const getDeveloperProfile = createServerFn({ method: "GET" }).handler(async () => ({
  profile: publicProfile(await profileByEmail(DEV_EMAIL)),
}));

export const userSignUp = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; password: string; displayName?: string }) => data)
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    const password = data.password ?? "";
    if (!isEmail(email)) return { ok: false as const, error: "Enter a valid email address." };
    if (password.length < 8) {
      return { ok: false as const, error: "Password must be at least 8 characters." };
    }
    const supabase = await db();
    const existing = await profileByEmail(email);
    if (existing) return { ok: false as const, error: "That email already has an account." };

    let handle = slugHandle(email);
    if (handle === "techbymarcon") handle = `${handle}_fan`;
    const { data: clash } = await supabase
      .from("profiles")
      .select("handle")
      .eq("handle", handle)
      .maybeSingle();
    if (clash) handle = `${handle}${Math.floor(Math.random() * 900 + 100)}`;

    const { data: created, error } = await supabase
      .from("profiles")
      .insert({
        email,
        handle,
        display_name: data.displayName?.trim().slice(0, 40) || handle,
        avatar_url: "",
        tier: "blue",
        password_hash: await hashPassword(password),
      })
      .select("*")
      .single();
    if (error) return { ok: false as const, error: "Could not create that account." };
    await setUserSession(email);
    return { ok: true as const, profile: publicProfile(created as ProfileRow) };
  });

export const userSignIn = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    const row = await profileByEmail(email);
    const ok = row ? await verifyPassword(data.password ?? "", row.password_hash) : false;
    if (!row || !ok || row.tier === "gold") {
      return { ok: false as const, error: "Wrong email or password." };
    }
    await setUserSession(email);
    return { ok: true as const, profile: publicProfile(row) };
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

    return { ok: true as const, profile: publicProfile(row as ProfileRow) };
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
    return (rows ?? []).map((c) => ({
      id: c.id as string,
      article_id: c.article_id as string,
      handle: c.handle as string,
      display_name: c.display_name as string,
      avatar_url: (c.avatar_url as string) ?? "",
      tier: c.tier as string,
      body: c.body as string,
      created_at: c.created_at as string,
      mine: Boolean(id.email && c.author_email === id.email),
    }));
  });

export const addComment = createServerFn({ method: "POST" })
  .inputValidator((data: { articleId: string; body: string }) => data)
  .handler(async ({ data }) => {
    const { email } = await requireIdentity();
    const body = data.body.trim().slice(0, 2000);
    if (!body) return { ok: false as const, error: "Write something first." };

    const supabase = await db();
    const profile = await profileByEmail(email);
    if (!profile) return { ok: false as const, error: "Sign in to comment." };

    const { error } = await supabase.from("comments").insert({
      article_id: data.articleId,
      author_email: email,
      handle: profile.handle,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      tier: profile.tier,
      body,
    });
    if (error) return { ok: false as const, error: "Could not post that comment." };
    return { ok: true as const };
  });

export const deleteComment = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { email, developer } = await requireIdentity();
    const supabase = await db();
    const query = supabase.from("comments").delete().eq("id", data.id);
    const { error } = developer ? await query : await query.eq("author_email", email);
    if (error) throw new Error("Could not delete that comment.");
    return { ok: true as const };
  });

export const editComment = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; body: string }) => data)
  .handler(async ({ data }) => {
    const { email, developer } = await requireIdentity();
    const body = data.body.trim().slice(0, 2000);
    if (!body) return { ok: false as const, error: "Write something first." };
    const supabase = await db();
    const query = supabase.from("comments").update({ body }).eq("id", data.id);
    const { error } = developer ? await query : await query.eq("author_email", email);
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
    return { ok: true as const, url, profile: publicProfile(row as ProfileRow) };
  });
