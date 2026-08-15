import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Icon } from "@/components/m3";
import { Avatar, VerifiedBadge } from "@/components/verified";
import { NotificationsPanel } from "@/components/notifications";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

type Item =
  | { kind: "link"; to: string; label: string; icon: string }
  | { kind: "action"; label: string; icon: string; onSelect: () => void };

export function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const [notif, setNotif] = useState(false);
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { theme, toggle } = useTheme();

  useEffect(() => {
    setOpen(false);
  }, [path]);

  useEffect(() => {
    if (!open) setNotif(false);
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { session, profile, isDeveloper } = useAuth();

  const items: Item[] = [
    { kind: "link", to: "/", label: "Home", icon: "home" },
    { kind: "link", to: "/articles", label: "Articles", icon: "article" },
    { kind: "link", to: "/forum", label: "Forum", icon: "forum" },
    { kind: "link", to: "/socials", label: "Socials", icon: "share" },
    {
      kind: "link",
      to: "/login",
      label: session ? `@${profile?.handle ?? "you"}` : "Profile",
      icon: "person",
    },
    {
      kind: "action",
      label: "Notifications",
      icon: "notifications",
      onSelect: () => setNotif(true),
    },
    {
      kind: "action",
      label: theme === "dark" ? "Light Mode" : "Dark Mode",
      icon: theme === "dark" ? "light_mode" : "dark_mode",
      onSelect: toggle,
    },
  ];

  const itemClass = (active?: boolean) =>
    cn(
      "flex w-full items-center gap-3 rounded-[20px] px-3 py-2 text-left font-display text-lg font-medium m3-transition hover:bg-foreground/8",
      active ? "text-foreground" : "text-muted-foreground",
    );

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="fixed top-4 left-4 z-[70] grid size-12 place-items-center rounded-[18px] border border-border/60 glass elevation-2 text-foreground m3-transition hover:scale-105 active:scale-95"
      >
        <Icon name={open ? "close" : "menu"} />
      </button>

      <div
        aria-hidden={!open}
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-[60] bg-background/20 transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <nav
        aria-hidden={!open}
        className={cn(
          "fixed top-4 left-4 z-[65] origin-top-left overflow-hidden border border-border/60 glass elevation-2",
          "transition-[width,height,border-radius,opacity] duration-[550ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
          open
            ? notif
              ? "h-[min(30rem,calc(100vh-2rem))] w-[min(23rem,calc(100vw-2rem))] rounded-[32px] opacity-100"
              : "h-[430px] w-[min(19rem,calc(100vw-2rem))] rounded-[32px] opacity-100"
            : "pointer-events-none size-12 rounded-[18px] opacity-0",
        )}
      >
        <ul
          className={cn(
            "flex h-full flex-col justify-center gap-0.5 px-4 pt-14 pb-4 transition-opacity duration-300",
            notif && "pointer-events-none opacity-0",
          )}
        >
          {items.map((item, i) => (
            <li
              key={item.label}
              className={open ? "animate-menu-fly" : "opacity-0"}
              style={{ animationDelay: open ? `${0.1 + i * 0.1}s` : undefined }}
            >
              {item.kind === "link" ? (
                <Link
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={itemClass(
                    item.to === "/" ? path === "/" : path.startsWith(item.to),
                  )}
                >
                  {item.to === "/login" && session ? (
                    <span className="relative grid size-[26px] place-items-center">
                      <Avatar
                        src={profile?.avatar_url || undefined}
                        name={profile?.display_name || "Member"}
                        size={26}
                      />
                      <VerifiedBadge
                        tier={profile?.tier ?? (isDeveloper ? "gold" : "blue")}
                        size={12}
                        className="absolute -right-0.5 -bottom-0.5"
                      />
                    </span>
                  ) : (
                    <Icon name={item.icon} className="text-[22px]" />
                  )}
                  {item.label}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    item.onSelect();
                    if (item.icon !== "notifications") setOpen(false);
                  }}
                  className={itemClass()}
                >
                  <Icon name={item.icon} className="text-[22px]" />
                  {item.label}
                </button>
              )}
            </li>
          ))}
        </ul>
        <div
          className={cn(
            "absolute inset-0 flex flex-col px-4 pt-14 pb-4 transition-opacity duration-300",
            notif ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <div className="mb-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setNotif(false)}
              aria-label="Back to menu"
              className="grid size-8 place-items-center rounded-full text-muted-foreground m3-transition hover:bg-foreground/8 hover:text-foreground"
            >
              <Icon name="arrow_back" className="text-[20px]" />
            </button>
            <span
              className={cn(
                "font-display text-lg font-medium transition-transform duration-500 ease-out",
                notif ? "translate-y-0" : "translate-y-40",
              )}
            >
              Notifications
            </span>
          </div>
          <div className="min-h-0 flex-1">{notif && <NotificationsPanel onNavigate={() => setOpen(false)} />}</div>
        </div>
      </nav>

    </>
  );
}
