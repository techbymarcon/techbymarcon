import { forwardRef, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Icon({
  name,
  filled,
  className,
}: {
  name: string;
  filled?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("material-symbols-rounded leading-none", filled && "filled", className)}
    >
      {name}
    </span>
  );
}

function addRipple(e: MouseEvent<HTMLElement>) {
  const host = e.currentTarget;
  const rect = host.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const span = document.createElement("span");
  span.className = "m3-ripple";
  span.style.width = span.style.height = `${size}px`;
  span.style.left = `${e.clientX - rect.left - size / 2}px`;
  span.style.top = `${e.clientY - rect.top - size / 2}px`;
  host.appendChild(span);
  window.setTimeout(() => span.remove(), 600);
}

type Variant = "filled" | "tonal" | "outlined" | "text" | "icon" | "fab";

const variants: Record<Variant, string> = {
  filled:
    "text-primary-foreground px-7 h-14 bg-[image:var(--gradient-brand)] elevation-2 hover:glow-ring hover:-translate-y-0.5",
  tonal: "bg-secondary-container text-on-secondary-container px-6 h-14 hover:elevation-2 hover:-translate-y-0.5",
  outlined: "border border-border text-primary px-6 h-14 hover:bg-primary/8 hover:-translate-y-0.5",
  text: "text-primary px-4 h-11 hover:bg-primary/8",
  icon: "size-12 rounded-full text-foreground hover:bg-foreground/8",
  fab: "size-14 rounded-2xl bg-tertiary-container text-on-tertiary-container elevation-2 hover:elevation-3",
};

export const M3Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; children?: ReactNode }
>(function M3Button({ variant = "filled", className, onClick, children, ...props }, ref) {
  return (
    <button
      ref={ref}
      onClick={(e) => {
        addRipple(e);
        onClick?.(e);
      }}
      className={cn(
        "ripple-host m3-transition inline-flex items-center justify-center gap-2 rounded-[28px] text-[15px] font-medium tracking-[0.01em]",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-[0.98]",
        "disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
