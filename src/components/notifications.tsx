import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Icon } from "@/components/m3";
import { Avatar, VerifiedBadge } from "@/components/verified";
import { useAuth } from "@/lib/auth";
import {
  clearNotifications,
  listNotifications,
  markNotificationsRead,
  type NotificationItem,
} from "@/lib/notifications.functions";
import { cn } from "@/lib/utils";

const ago = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
};

const iconFor = (kind: string) =>
  kind === "upvote" ? "thumb_up" : kind === "welcome" ? "waving_hand" : "chat_bubble";

export function NotificationsButton() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const res = await listNotifications();
      setItems(res.items);
      setUnread(res.unread);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (!session) {
      setItems([]);
      setUnread(0);
      return;
    }
    void load();
    const timer = window.setInterval(() => void load(), 45000);
    return () => window.clearInterval(timer);
  }, [session]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (!session) return null;

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      await load();
      if (unread > 0) {
        setUnread(0);
        setItems((prev) => prev.map((n) => ({ ...n, read: true })));
        await markNotificationsRead().catch(() => undefined);
      }
    }
  };

  return (
    <div ref={wrap} className="fixed right-5 top-5 z-50 flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => void toggle()}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        className="m3-transition relative grid size-12 place-items-center rounded-full border border-border/60 glass text-foreground elevation-2 hover:scale-105"
      >
        <Icon name="notifications" filled={unread > 0} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-primary px-1 text-[10px] font-semibold leading-[18px] text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="w-[min(360px,calc(100vw-2.5rem))] overflow-hidden rounded-[24px] border border-border/70 glass elevation-3">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="font-display text-base font-medium">Notifications</span>
            {items.length > 0 && (
              <button
                type="button"
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
                onClick={async () => {
                  setItems([]);
                  setUnread(0);
                  await clearNotifications().catch(() => undefined);
                }}
              >
                Clear all
              </button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto pb-2">
            {items.length === 0 ? (
              <p className="px-4 pb-4 text-sm text-muted-foreground">
                Nothing yet. Replies and upvotes will show up here.
              </p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    if (n.link) void navigate({ to: n.link });
                  }}
                  className={cn(
                    "m3-transition flex w-full gap-3 px-4 py-3 text-left hover:bg-foreground/6",
                    !n.read && "bg-secondary-container/40",
                  )}
                >
                  <span className="relative shrink-0">
                    <Avatar src={n.actor_avatar || undefined} name={n.actor_handle} size={36} />
                    <VerifiedBadge
                      tier={n.actor_tier}
                      size={13}
                      className="absolute -right-1 -bottom-1"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <Icon name={iconFor(n.kind)} className="text-[16px] text-muted-foreground" />
                      <span className="truncate text-sm font-medium">{n.title}</span>
                    </span>
                    {n.body && (
                      <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                        {n.body}
                      </span>
                    )}
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      {ago(n.created_at)}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
