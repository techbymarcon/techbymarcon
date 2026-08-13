import { createServerFn } from "@tanstack/react-start";
import { currentIdentity, db } from "./content.server";

export type NotificationItem = {
  id: string;
  kind: string;
  title: string;
  body: string;
  link: string;
  actor_handle: string;
  actor_avatar: string;
  actor_tier: string;
  read: boolean;
  created_at: string;
};

export const listNotifications = createServerFn({ method: "GET" }).handler(async () => {
  const id = await currentIdentity();
  if (!id.email) return { items: [] as NotificationItem[], unread: 0 };
  const supabase = await db();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_email", id.email)
    .order("created_at", { ascending: false })
    .limit(40);
  const items = (data ?? []) as unknown as NotificationItem[];
  return { items, unread: items.filter((n) => !n.read).length };
});

export const markNotificationsRead = createServerFn({ method: "POST" }).handler(async () => {
  const id = await currentIdentity();
  if (!id.email) return { ok: false as const };
  const supabase = await db();
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("recipient_email", id.email)
    .eq("read", false);
  return { ok: true as const };
});

export const clearNotifications = createServerFn({ method: "POST" }).handler(async () => {
  const id = await currentIdentity();
  if (!id.email) return { ok: false as const };
  const supabase = await db();
  await supabase.from("notifications").delete().eq("recipient_email", id.email);
  return { ok: true as const };
});
