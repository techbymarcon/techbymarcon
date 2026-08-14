import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Icon, M3Button } from "@/components/m3";
import { Reveal } from "@/components/reveal";
import { Avatar, VerifiedBadge } from "@/components/verified";
import { getProfileByHandle } from "@/lib/content.functions";

type Profile = { handle: string; display_name: string; avatar_url: string; tier: string };
type Stats = {
  posts: number;
  comments: number;
  joined: string;
  moderator: boolean;
  developer: boolean;
};

export const Route = createFileRoute("/u/$handle")({
  head: () => ({
    meta: [
      { title: "Member profile — Tech by Marcon" },
      {
        name: "description",
        content: "View a Tech by Marcon member: their badge, forum posts and comment activity.",
      },
      { property: "og:title", content: "Member profile — Tech by Marcon" },
      {
        property: "og:description",
        content: "A read-only look at a Tech by Marcon community member.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { handle } = Route.useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getProfileByHandle({ data: { handle } })
      .then((res) => {
        setProfile((res.profile as Profile) ?? null);
        setStats((res.stats as Stats) ?? null);
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [handle]);

  const role = stats?.developer
    ? "Developer — golden check"
    : stats?.moderator
      ? "Moderator — green check"
      : "Verified member — blue check";

  return (
    <div className="mx-auto max-w-[720px] px-5 py-14 md:py-20">
      <Reveal>
        {loading ? (
          <p className="text-muted-foreground">Loading profile…</p>
        ) : !profile ? (
          <div className="rounded-[28px] border border-dashed border-border/70 p-12 text-center">
            <h1 className="font-display text-[26px] font-medium">No member @{handle}</h1>
            <p className="mt-2 text-muted-foreground">That profile doesn't exist.</p>
            <Link to="/forum" className="mt-5 inline-block">
              <M3Button variant="tonal">Back to the forum</M3Button>
            </Link>
          </div>
        ) : (
          <div className="surface-sheen rounded-[32px] border border-border/60 glass p-8 elevation-1">
            <div className="flex items-center gap-4">
              <Avatar src={profile.avatar_url || undefined} name={profile.display_name} size={76} />
              <div className="min-w-0">
                <h1 className="flex items-center gap-2 font-display text-[28px] font-medium">
                  <span className="truncate">{profile.display_name}</span>
                  <VerifiedBadge tier={profile.tier} size={20} />
                </h1>
                <p className="text-[15px] text-muted-foreground">@{profile.handle}</p>
                <p className="mt-1 text-sm text-muted-foreground">{role}</p>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3">
              <div className="rounded-3xl bg-surface-container p-5">
                <p className="font-display text-[28px]">{stats?.posts ?? 0}</p>
                <p className="text-sm text-muted-foreground">Forum posts</p>
              </div>
              <div className="rounded-3xl bg-surface-container p-5">
                <p className="font-display text-[28px]">{stats?.comments ?? 0}</p>
                <p className="text-sm text-muted-foreground">Comments</p>
              </div>
            </div>

            <p className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Icon name="visibility" className="text-[18px]" />
              This page is read-only — nothing here can be changed by visitors.
            </p>
          </div>
        )}
      </Reveal>
    </div>
  );
}
