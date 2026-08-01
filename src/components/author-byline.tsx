import { useEffect, useState } from "react";
import { Avatar, VerifiedBadge } from "@/components/verified";
import { getDeveloperProfile } from "@/lib/content.functions";
import { cn } from "@/lib/utils";

type DevProfile = {
  display_name?: string | null;
  handle?: string | null;
  avatar_url?: string | null;
  tier?: string | null;
};

let cached: DevProfile | null = null;

export function AuthorByline({ className, size = 40 }: { className?: string; size?: number }) {
  const [profile, setProfile] = useState<DevProfile | null>(cached);

  useEffect(() => {
    if (cached) return;
    let active = true;
    getDeveloperProfile()
      .then((res: { profile: DevProfile | null }) => {
        cached = (res.profile as DevProfile) ?? null;
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
          {name}
          <VerifiedBadge tier={profile?.tier || "gold"} size={16} />
        </span>
        <span className="text-sm text-muted-foreground">@{handle}</span>
      </div>
    </div>
  );
}
