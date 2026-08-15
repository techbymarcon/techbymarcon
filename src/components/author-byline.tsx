import { useEffect, useState } from "react";
import { Avatar, TierName, VerifiedBadge } from "@/components/verified";
import { BouncingText } from "@/components/bouncing-text";
import { getDeveloperProfile } from "@/lib/content.functions";
import { cn } from "@/lib/utils";

type DevProfile = {
  display_name: string;
  handle: string;
  avatar_url: string;
  tier: string;
};

let cached: DevProfile | null = null;

export function AuthorByline({ className, size = 40 }: { className?: string; size?: number }) {
  const [profile, setProfile] = useState<DevProfile | null>(cached);

  useEffect(() => {
    if (cached) return;
    let active = true;
    getDeveloperProfile()
      .then((res: { profile: DevProfile | null }) => {
        cached = res.profile ?? null;
        if (active) setProfile(cached);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const name = profile?.display_name || "Tech by Marcon";
  const handle = profile?.handle || "techbymarcon";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Avatar src={profile?.avatar_url ?? undefined} name={name} size={size} />
      <div className="leading-tight">
        <span className="flex items-center gap-1.5 font-medium">
          <TierName tier={profile?.tier || "gold"}><BouncingText>{name}</BouncingText></TierName>
          <VerifiedBadge tier={profile?.tier || "gold"} size={16} />
        </span>
        <span className="text-sm text-muted-foreground">@{handle}</span>
      </div>
    </div>
  );
}
