import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Icon } from "@/components/m3";
import { Avatar, VerifiedBadge } from "@/components/verified";
import { BouncingText } from "@/components/bouncing-text";
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

export function NotificationsPanel({ onNavigate }: { onNavigate?: () => void }) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (!session) {
      setItems([]);
      return;
    }
    let active = true;
    listNotifications()
      .then((res) => {
        if (!active) return;
        setItems(res.items.map((n) => ({ ...n, read: true })));
        void markNotificationsRead().catch(() => undefined);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [session]);

  if (!session) {
    return (
      <p className="px-1 text-sm text-muted-foreground">Sign in to see your notifications.</p>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {items.length > 0 && (
        <button
          type="button"
          className="self-end px-1 pb-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          onClick={async () => {
            setItems([]);
            await clearNotifications().catch(() => undefined);
          }}
        >
          Clear all
        </button>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto pb-1">
        {items.length === 0 ? (
          <p className="px-1 text-sm text-muted-foreground">
            Nothing yet. Replies and upvotes will show up here.
          </p>
        ) : (
          items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => {
                onNavigate?.();
                if (n.link) void navigate({ to: n.link });
              }}
              className={cn(
                "m3-transition flex w-full gap-3 rounded-[18px] px-2 py-2 text-left hover:bg-foreground/6",
              )}
            >
              <span className="relative shrink-0">
                <Avatar src={n.actor_avatar || undefined} name={n.actor_handle} size={32} />
                <VerifiedBadge tier={n.actor_tier} size={12} className="absolute -right-1 -bottom-1" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <Icon name={iconFor(n.kind)} className="text-[16px] text-muted-foreground" />
                  <span className="truncate text-sm font-medium">
                    <BouncingText>{n.title}</BouncingText>
                  </span>
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
  );
}
