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
