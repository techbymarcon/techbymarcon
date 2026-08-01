import { Link, useRouterState } from "@tanstack/react-router";
import { Icon, M3Button } from "@/components/m3";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Home", icon: "home" },
  { to: "/articles", label: "Articles", icon: "article" },
  { to: "/about", label: "About", icon: "person" },
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
            ? "bg-secondary-container text-on-secondary-container"
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
  const { session, isDeveloper } = useAuth();
  const isActive = (to: string) => (to === "/" ? path === "/" : path.startsWith(to));

  return (
    <>
      {/* Desktop rail */}
      <nav className="fixed inset-y-0 left-0 z-40 hidden w-[90px] flex-col items-center gap-2 border-r border-border bg-surface-container py-5 md:flex">
        <Link to="/" className="mb-4 grid size-11 place-items-center rounded-2xl bg-primary">
          <span className="font-display text-lg font-medium text-primary-foreground">M</span>
        </Link>
        {items.map((i) => (
          <NavItem key={i.to} {...i} active={isActive(i.to)} />
        ))}
        <div className="mt-auto flex flex-col items-center gap-2">
          <ThemeToggle />
          <Link to="/login" aria-label="Account">
            <span
              className={cn(
                "m3-transition grid size-12 place-items-center rounded-full hover:bg-foreground/8",
                isDeveloper ? "text-primary" : "text-foreground",
              )}
            >
              <Icon name={session ? "account_circle" : "login"} filled={!!session} />
            </span>
          </Link>
        </div>
      </nav>

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border bg-surface-container px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] md:hidden">
        {items.map((i) => (
          <NavItem key={i.to} {...i} active={isActive(i.to)} compact />
        ))}
        <ThemeToggle floating />
        <Link to="/login" className="m3-transition flex flex-1 flex-col items-center gap-1 py-2">
          <span
            className={cn(
              "flex h-8 w-16 items-center justify-center rounded-[16px]",
              path.startsWith("/login")
                ? "bg-secondary-container text-on-secondary-container"
                : "text-muted-foreground",
            )}
          >
            <Icon name={session ? "account_circle" : "login"} filled={!!session} />
          </span>
          <span className="text-[11px] font-medium text-muted-foreground">Account</span>
        </Link>
      </nav>
    </>
  );
}
