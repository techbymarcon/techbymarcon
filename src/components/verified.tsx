import { Icon } from "@/components/m3";
import { cn } from "@/lib/utils";

export type Tier = string;

export function VerifiedBadge({ tier, className }: { tier: Tier; className?: string }) {
  const gold = tier === "gold";
  return (
    <span
      title={gold ? "Verified developer — Tech by Marcon" : "Verified member"}
      aria-label={gold ? "Verified developer" : "Verified member"}
      className={cn(
        "inline-grid size-[18px] shrink-0 place-items-center rounded-full",
        gold
          ? "bg-[oklch(0.78_0.15_85)] text-[oklch(0.25_0.05_85)]"
          : "bg-[oklch(0.62_0.16_250)] text-white",
        className,
      )}
    >
      <Icon name="check" filled className="text-[13px] font-bold" />
    </span>
  );
}

export function Avatar({
  src,
  name,
  size = 40,
  className,
}: {
  src?: string | undefined;
  name: string;
  size?: number;
  className?: string;
}) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return src ? (
    <img
      src={src}
      alt={`${name} profile picture`}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={cn("shrink-0 rounded-full object-cover", className)}
    />
  ) : (
    <span
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-secondary-container font-medium text-on-secondary-container",
        className,
      )}
    >
      {initial}
    </span>
  );
}

export function VerifiedInfo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[28px] bg-surface-container p-6 elevation-1 md:p-7",
        className,
      )}
    >
      <h3 className="font-display text-[20px] font-medium">Verified checkmarks</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
        Every signed-in account gets a verified badge next to its name, so you always know who
        you're reading.
      </p>
      <ul className="mt-4 space-y-3 text-[15px]">
        <li className="flex items-center gap-3">
          <VerifiedBadge tier="gold" />
          <span>
            <strong>Golden check</strong> — @techbymarcon, the developer and author of this site.
          </span>
        </li>
        <li className="flex items-center gap-3">
          <VerifiedBadge tier="blue" />
          <span>
            <strong>Blue check</strong> — verified members who signed up to comment.
          </span>
        </li>
      </ul>
    </div>
  );
}
