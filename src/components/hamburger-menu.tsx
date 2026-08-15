import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Icon } from "@/components/m3";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Home", icon: "home" },
  { to: "/articles", label: "Articles", icon: "article" },
  { to: "/forum", label: "Forum", icon: "forum" },
  { to: "/socials", label: "Socials", icon: "share" },
  { to: "/login", label: "Account", icon: "person" },
];

export function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { isDeveloper, isModerator } = useAuth() as {
    isDeveloper?: boolean;
    isModerator?: boolean;
  };

  useEffect(() => {
    setOpen(false);
  }, [path]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const items = [
    ...links,
    ...(isDeveloper || isModerator
      ? [
          { to: "/accounts", label: "Accounts", icon: "manage_accounts" },
          ...(isDeveloper
            ? [{ to: "/moderators", label: "Moderators", icon: "shield" }]
            : []),
        ]
      : []),
  ];

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
        className={cn(
          "fixed inset-0 z-[60] bg-background/40 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setOpen(false)}
      />

      <nav
        aria-hidden={!open}
        className={cn(
          "fixed top-4 left-4 z-[65] origin-top-left overflow-hidden border border-border/60 glass-strong elevation-3",
          "transition-[width,height,border-radius,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open
            ? "h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] rounded-[44px] opacity-100"
            : "pointer-events-none size-12 rounded-[18px] opacity-0",
        )}
      >
        <ul className="flex h-full flex-col justify-center gap-2 px-8 pt-16 pb-8 sm:px-14">
          {items.map((item, i) => (
            <li
              key={item.to}
              className={cn(
                "m3-transition",
                open ? "animate-menu-fly" : "opacity-0",
              )}
              style={{ animationDelay: open ? `${0.1 + i * 0.1}s` : undefined }}
            >
              <Link
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-4 rounded-[24px] px-4 py-3 font-display text-3xl font-medium m3-transition hover:bg-foreground/8 sm:text-5xl",
                  (item.to === "/" ? path === "/" : path.startsWith(item.to))
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                <Icon name={item.icon} className="text-[28px] sm:text-[32px]" />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
