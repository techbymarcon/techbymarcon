import { Link, useRouterState } from "@tanstack/react-router";
import { Icon, M3Button } from "@/components/m3";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, VerifiedBadge } from "@/components/verified";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Home", icon: "home" },
  { to: "/articles", label: "Articles", icon: "article" },
  { to: "/forum", label: "Forum", icon: "forum" },
  { to: "/socials", label: "Socials", icon: "share" },
];

function NavItem({
  to,
  label,
  icon,
  active,
  compact,
}: {
  to: string;
  label: string;
  icon: string;
  active: boolean;
  compact?: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "group m3-transition flex flex-col items-center gap-1",
        compact ? "flex-1 py-2" : "w-full py-1",
      )}
    >
      <span
        className={cn(
          "m3-transition ripple-host flex h-8 w-16 items-center justify-center rounded-[16px]",
          active
            ? "bg-secondary-container text-on-secondary-container elevation-1"
            : "text-muted-foreground group-hover:bg-foreground/8",
        )}
      >
        <Icon name={icon} filled={active} className="text-[24px]" />
      </span>
      <span
        className={cn(
          "text-[11px] font-medium",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </Link>
  );
}

export function Navigation() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { session, profile, isDeveloper } = useAuth();
  const isActive = (to: string) => (to === "/" ? path === "/" : path.startsWith(to));

  return (
    <>
      {/* Desktop rail */}
      <nav className="fixed inset-y-0 left-0 z-40 hidden w-[90px] flex-col items-center gap-2 border-r border-border/70 glass py-5 md:flex">
        <Link to="/" className="mb-4 grid size-11 place-items-center rounded-2xl bg-[image:var(--gradient-brand)] elevation-2 m3-transition hover:scale-105">
          <span className="font-display text-lg font-medium text-primary-foreground">M</span>
        </Link>
        {items.map((i) => (
          <NavItem key={i.to} {...i} active={isActive(i.to)} />
        ))}
        <div className="mt-auto flex flex-col items-center gap-2">
          <ThemeToggle />
          <Link
            to="/login"
            aria-label={session ? `Account @${profile?.handle ?? ""}` : "Sign in"}
            title={session ? `@${profile?.handle ?? ""}` : "Sign in"}
            className="flex flex-col items-center gap-1"
          >
            {session ? (
              <span className="relative grid size-12 place-items-center rounded-full hover:bg-foreground/8 m3-transition">
                <Avatar
                  src={profile?.avatar_url || undefined}
                  name={profile?.display_name || "Member"}
                  size={36}
                />
                <VerifiedBadge
                  tier={profile?.tier ?? (isDeveloper ? "gold" : "blue")}
                  size={15}
                  className="absolute right-0.5 bottom-0.5"
                />
              </span>
            ) : (
              <span className="m3-transition grid size-12 place-items-center rounded-full text-foreground hover:bg-foreground/8">
                <Icon name="login" />
              </span>
            )}
            <span className="max-w-[76px] truncate text-[11px] font-medium text-muted-foreground">
              {session ? `@${profile?.handle ?? "you"}` : "Sign in"}
            </span>
          </Link>
        </div>
      </nav>

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border/70 glass px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] md:hidden">
        {items.map((i) => (
          <NavItem key={i.to} {...i} active={isActive(i.to)} compact />
        ))}
        <ThemeToggle floating />
        <Link to="/login" className="m3-transition flex flex-1 flex-col items-center gap-1 py-2">
          <span
            className={cn(
              "relative flex h-8 w-16 items-center justify-center rounded-[16px]",
              path.startsWith("/login")
                ? "bg-secondary-container text-on-secondary-container"
                : "text-muted-foreground",
            )}
          >
            {session ? (
              <>
                <Avatar
                  src={profile?.avatar_url || undefined}
                  name={profile?.display_name || "Member"}
                  size={28}
                />
                <VerifiedBadge
                  tier={profile?.tier ?? (isDeveloper ? "gold" : "blue")}
                  size={13}
                  className="absolute right-[14px] bottom-0"
                />
              </>
            ) : (
              <Icon name="login" />
            )}
          </span>
          <span className="max-w-[72px] truncate text-[11px] font-medium text-muted-foreground">
            {session ? `@${profile?.handle ?? "you"}` : "Sign in"}
          </span>
        </Link>
      </nav>
    </>
  );
}
