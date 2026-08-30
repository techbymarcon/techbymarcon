import { createServerFn } from "@tanstack/react-start";
import { currentStaff, db, requireDeveloper, requireStaff } from "./content.server";
import { actorFor, notify } from "./notifications.server";

export type ArticleRequest = {
  id: string;
  requester_email: string;
  requester_handle: string;
  title: string;
  description: string;
  body: string;
  category: string;
  cover: string;
  reading_time: string;
  download_url: string;
  download_name: string;
  download_size: number;
  status: string;
  review_note: string;
  reviewed_by: string;
  reviewed_at: string | null;
  created_at: string;
};

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || `article-${Date.now()}`;

/** Moderators (and the developer) propose an article for review. */
export const submitArticleRequest = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      title: string;
      description: string;
      body: string;
      category: string;
      cover: string;
      readingTime: string;
      downloadUrl?: string;
      downloadName?: string;
      downloadSize?: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    const staff = await requireStaff();
    const title = data.title.trim();
    if (!title) return { ok: false as const, error: "A title is required." };
    const supabase = await db();
    const actor = await actorFor(staff.email);
    const { error } = await supabase.from("article_requests").insert({
      requester_email: staff.email,
      requester_handle: actor.handle,
      title: title.slice(0, 160),
      description: data.description.slice(0, 400),
      body: data.body,
      category: data.category,
      cover: data.cover,
      reading_time: data.readingTime || "5 min read",
      download_url: data.downloadUrl ?? "",
      download_name: data.downloadName ?? "",
      download_size: data.downloadSize ?? 0,
    } as never);
    if (error) return { ok: false as const, error: "Could not send the request." };
    await notify({
      recipient: "developer",
      kind: "article_request",
      title: `@${actor.handle} requested an article`,
      body: title,
      link: "/article-requests",
      actorHandle: actor.handle,
      actorAvatar: actor.avatar,
      actorTier: actor.tier,
    });
    return { ok: true as const };
  });

/** Developer sees every request; moderators only see their own. */
export const listArticleRequests = createServerFn({ method: "GET" }).handler(async () => {
  const staff = await currentStaff();
  if (!staff.signedIn || (!staff.developer && !staff.moderator))
    return { developer: false, items: [] as ArticleRequest[] };
  const supabase = await db();
  let query = supabase
    .from("article_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (!staff.developer) query = query.eq("requester_email", staff.email);
  const { data } = await query;
  return { developer: staff.developer, items: (data ?? []) as unknown as ArticleRequest[] };
});

export const withdrawArticleRequest = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const staff = await requireStaff();
    const supabase = await db();
    let query = supabase.from("article_requests").delete().eq("id", data.id);
    if (!staff.developer) query = query.eq("requester_email", staff.email).eq("status", "pending");
    const { error } = await query;
    if (error) return { ok: false as const };
    return { ok: true as const };
  });

/** Developer-only review. Approving publishes the article. */
export const reviewArticleRequest = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; approve: boolean; note?: string }) => data)
  .handler(async ({ data }) => {
    await requireDeveloper();
    const supabase = await db();
    const { data: row } = await supabase
      .from("article_requests")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    const req = row as unknown as ArticleRequest | null;
    if (!req) return { ok: false as const, error: "Request not found." };
    if (req.status !== "pending") return { ok: false as const, error: "Already reviewed." };

    if (data.approve) {
      const id = slug(req.title);
      const { error } = await supabase.from("articles").upsert({
        id,
        title: req.title,
        description: req.description,
        body: req.body,
        category: req.category,
        date: new Date().toISOString().slice(0, 10),
        reading_time: req.reading_time,
        cover: req.cover,
        featured: false,
        download_url: req.download_url,
        download_name: req.download_name,
        download_size: req.download_size,
        updated_at: new Date().toISOString(),
      } as never);
      if (error) return { ok: false as const, error: "Could not publish the article." };
    }

    await supabase
      .from("article_requests")
      .update({
        status: data.approve ? "approved" : "rejected",
        review_note: (data.note ?? "").slice(0, 400),
        reviewed_by: "developer",
        reviewed_at: new Date().toISOString(),
      } as never)
      .eq("id", data.id);

    await notify({
      recipient: req.requester_email,
      kind: "article_request",
      title: data.approve ? "Your article request was approved" : "Your article request was declined",
      body: data.approve ? req.title : `${req.title}${data.note ? ` — ${data.note}` : ""}`,
      link: data.approve ? `/articles/${slug(req.title)}` : "/article-requests",
      actorHandle: "techbymarcon",
      actorTier: "gold",
    });
    return { ok: true as const };
  });
