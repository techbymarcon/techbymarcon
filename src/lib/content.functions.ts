import { createServerFn } from "@tanstack/react-start";
import {
  db,
  getGateSession,
  isDeveloperSession,
  passwordMatches,
  requireDeveloper,
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
    await session.update({ developer: true });
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

export const getProfile = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string }) => data)
  .handler(async ({ data }) => {
    const supabase = await db();
    const { data: row, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", data.email.trim().toLowerCase())
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { profile: row ?? null };
  });

export const ensureProfile = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; displayName?: string }) => data)
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    const supabase = await db();
    if (email === DEV_EMAIL) {
      await requireDeveloper();
      const { data: dev } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", DEV_EMAIL)
        .maybeSingle();
      return { profile: dev };
    }
    const { data: existing } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", email)
      .maybeSingle();
    if (existing) return { profile: existing };

    let handle = slugHandle(email);
    if (handle === "techbymarcon") handle = `${handle}_fan`;
    const { data: clash } = await supabase.from("profiles").select("handle").eq("handle", handle).maybeSingle();
    if (clash) handle = `${handle}${Math.floor(Math.random() * 900 + 100)}`;

    const { data: created, error } = await supabase
      .from("profiles")
      .insert({
        email,
        handle,
        display_name: data.displayName?.trim() || handle,
        avatar_url: "",
        tier: "blue",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { profile: created };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { email: string; displayName: string; handle: string; avatarUrl: string }) => data,
  )
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    if (email === DEV_EMAIL) await requireDeveloper();
    const supabase = await db();
    const handle = slugHandle(data.handle);
    if (!handle) return { ok: false as const, error: "Invalid handle." };
    if (handle === "techbymarcon" && email !== DEV_EMAIL) {
      return { ok: false as const, error: "That handle is reserved." };
    }
    const { data: clash } = await supabase
      .from("profiles")
      .select("email")
      .eq("handle", handle)
      .maybeSingle();
    if (clash && clash.email !== email) return { ok: false as const, error: "Handle already taken." };

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
    if (error) return { ok: false as const, error: error.message };

    await supabase
      .from("comments")
      .update({ handle: row.handle, display_name: row.display_name, avatar_url: row.avatar_url })
      .eq("author_email", email);

    return { ok: true as const, profile: row };
  });

export const listComments = createServerFn({ method: "POST" })
  .inputValidator((data: { articleId: string }) => data)
  .handler(async ({ data }) => {
    const supabase = await db();
    const { data: rows, error } = await supabase
      .from("comments")
      .select("*")
      .eq("article_id", data.articleId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const addComment = createServerFn({ method: "POST" })
  .inputValidator((data: { articleId: string; email: string; body: string }) => data)
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    const body = data.body.trim().slice(0, 2000);
    if (!body) return { ok: false as const, error: "Write something first." };
    if (email === DEV_EMAIL) await requireDeveloper();

    const supabase = await db();
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", email)
      .maybeSingle();
    if (!profile) return { ok: false as const, error: "Sign in to comment." };
    if (profile.tier === "gold" && !(await isDeveloperSession())) {
      return { ok: false as const, error: "Not allowed." };
    }

    const { error } = await supabase.from("comments").insert({
      article_id: data.articleId,
      author_email: email,
      handle: profile.handle,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      tier: profile.tier,
      body,
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const deleteComment = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; email: string }) => data)
  .handler(async ({ data }) => {
    const supabase = await db();
    const isDev = await isDeveloperSession();
    const query = supabase.from("comments").delete().eq("id", data.id);
    const { error } = isDev
      ? await query
      : await query.eq("author_email", data.email.trim().toLowerCase());
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
