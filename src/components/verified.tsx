import { Link } from "@tanstack/react-router";
import checkBlue from "@/assets/check-blue.png.asset.json";
import checkGold from "@/assets/check-gold.png.asset.json";
import checkGreen from "@/assets/check-green.png";
import { cn } from "@/lib/utils";

export type Tier = string;

export function VerifiedBadge({
  tier,
  className,
  size = 18,
}: {
  tier: Tier;
  className?: string;
  size?: number;
}) {
  const src = tier === "gold" ? checkGold.url : tier === "green" ? checkGreen : checkBlue.url;
  const label =
    tier === "gold"
      ? "Verified developer — Tech by Marcon"
      : tier === "green"
        ? "Moderator"
        : "Verified member";
  return (
    <img
      src={src}
      alt={label}
      title={label}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={cn("inline-block shrink-0 object-contain align-middle", className)}
    />
  );
}

export function TierName({
  tier,
  children,
  className,
  handle,
}: {
  tier: Tier;
  children: React.ReactNode;
  className?: string;
  handle?: string | undefined;
}) {
  const inner = (
    <span
      className={cn(
        tier === "gold" && "tier-name tier-name-gold",
        tier === "green" && "tier-name tier-name-green",
        className,
      )}
    >
      {children}
    </span>
  );
  if (!handle) return inner;
  return (
    <Link
      to="/u/$handle"
      params={{ handle }}
      className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      title={`View @${handle}'s profile`}
    >
      {inner}
    </Link>
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
        "surface-sheen rounded-[28px] border border-border/60 glass p-6 elevation-1 md:p-7",
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
          <VerifiedBadge tier="green" />
          <span>
            <strong>Green check</strong> — community moderators chosen by the developer.
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
