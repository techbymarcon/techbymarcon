import { Icon, M3Button } from "@/components/m3";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Dark / light mode toggle. Floating variant is used on mobile where there is no rail. */
export function ThemeToggle({ floating = false }: { floating?: boolean }) {
  const { theme, toggle } = useTheme();
  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  if (floating) {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        title={label}
        className={cn(
          "m3-transition fixed right-4 top-4 z-50 grid size-12 place-items-center rounded-2xl",
          "border border-border bg-surface-container text-foreground shadow-elevation-2",
          "active:scale-95 md:hidden",
        )}
      >
        <Icon name={theme === "dark" ? "light_mode" : "dark_mode"} />
      </button>
    );
  }

  return (
    <M3Button variant="icon" aria-label={label} title={label} onClick={toggle}>
      <Icon name={theme === "dark" ? "light_mode" : "dark_mode"} />
    </M3Button>
  );
}
