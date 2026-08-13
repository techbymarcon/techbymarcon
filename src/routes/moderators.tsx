import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Icon, M3Button } from "@/components/m3";
import { Avatar, VerifiedBadge } from "@/components/verified";
import { useAuth } from "@/lib/auth";
import { listMembers, setModerator } from "@/lib/forum.functions";

type Member = {
  username: string;
  handle: string;
  display_name: string;
  avatar_url: string;
  tier: string;
  moderator: boolean;
};

export const Route = createFileRoute("/moderators")({
  head: () => ({
    meta: [
      { title: "Moderators — Tech by Marcon" },
      {
        name: "description",
        content: "Developer tools to choose which Tech by Marcon members moderate the forum.",
      },
      { property: "og:title", content: "Moderators — Tech by Marcon" },
      {
        property: "og:description",
        content: "Choose which members moderate the Tech by Marcon community forum.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Moderators,
});

function Moderators() {
  const { isDeveloper } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const refresh = () =>
    listMembers()
      .then((rows) => setMembers(rows as Member[]))
      .catch(() => setError("Only the developer can manage moderators."));

  useEffect(() => {
    if (isDeveloper) void refresh();
  }, [isDeveloper]);

  if (!isDeveloper) {
    return (
      <div className="mx-auto max-w-[820px] px-5 py-20">
        <h1 className="font-display text-[32px] font-medium">Moderators</h1>
        <p className="mt-3 text-muted-foreground">
          This page is only available to the developer.
        </p>
        <Link to="/forum" className="mt-5 inline-block">
          <M3Button variant="tonal">Back to the forum</M3Button>
        </Link>
      </div>
    );
  }

  const shown = members.filter((m) =>
    `${m.handle} ${m.display_name}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-[820px] px-5 py-12 md:px-12 md:py-20">
      <h1 className="font-display text-[38px] leading-tight font-medium md:text-[48px]">
        <span className="text-gradient">Moderators</span>
      </h1>
      <p className="mt-3 text-[17px] text-muted-foreground">
        Moderators can edit, lock, pin and delete forum posts and comments. They cannot publish
        articles.
      </p>

      {error ? <p className="mt-5 text-[15px] text-destructive">{error}</p> : null}

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search members"
        className="mt-8 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-[15px] outline-none focus:border-primary"
      />

      <div className="mt-5 space-y-3">
        {shown.map((m) => (
          <div
            key={m.username}
            className="flex items-center gap-3 rounded-[24px] border border-border/60 glass p-4"
          >
            <Avatar src={m.avatar_url || undefined} name={m.display_name} />
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 font-medium">
                {m.display_name}
                <VerifiedBadge tier={m.tier} />
              </p>
              <p className="truncate text-sm text-muted-foreground">@{m.handle}</p>
            </div>
            <div className="ml-auto">
              <M3Button
                variant={m.moderator ? "filled" : "tonal"}
                onClick={async () => {
                  await setModerator({
                    data: { username: m.username, moderator: !m.moderator },
                  });
                  await refresh();
                }}
              >
                <Icon name={m.moderator ? "shield_person" : "add_moderator"} className="text-[20px]" />
                {m.moderator ? "Moderator" : "Make moderator"}
              </M3Button>
            </div>
          </div>
        ))}
        {!shown.length ? (
          <p className="rounded-[24px] border border-dashed border-border/70 p-10 text-center text-muted-foreground">
            No members found.
          </p>
        ) : null}
      </div>
    </div>
  );
}
