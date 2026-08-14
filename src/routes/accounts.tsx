import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Icon, M3Button } from "@/components/m3";
import { Avatar, VerifiedBadge } from "@/components/verified";
import { useAuth } from "@/lib/auth";
import { accountActivity, listAccounts, moderateAccount } from "@/lib/moderation.functions";

type Account = {
  username: string;
  handle: string;
  display_name: string;
  avatar_url: string;
  tier: string;
  moderator: boolean;
  banned: boolean;
  banReason: string;
  mutedUntil: string | null;
  muteReason: string;
  warnings: number;
  lastWarning: string;
  canManage: boolean;
};

type Activity = Awaited<ReturnType<typeof accountActivity>>;

export const Route = createFileRoute("/accounts")({
  head: () => ({
    meta: [
      { title: "Accounts — Tech by Marcon" },
      {
        name: "description",
        content:
          "Moderation panel for Tech by Marcon: review members, warn, time out or ban accounts.",
      },
      { property: "og:title", content: "Accounts — Tech by Marcon" },
      {
        property: "og:description",
        content: "Review Tech by Marcon members and apply warnings, timeouts or bans.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Accounts,
});

const minutesOptions = [
  { label: "10 min", value: 10 },
  { label: "1 hour", value: 60 },
  { label: "1 day", value: 60 * 24 },
  { label: "1 week", value: 60 * 24 * 7 },
];

function Accounts() {
  const { isModerator } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [query, setQuery] = useState("");
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [minutes, setMinutes] = useState(60);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = () =>
    listAccounts()
      .then((rows) => setAccounts(rows as Account[]))
      .catch(() => setNotice("Only moderators and the developer can manage accounts."));

  useEffect(() => {
    if (isModerator) void refresh();
  }, [isModerator]);

  if (!isModerator) {
    return (
      <div className="mx-auto max-w-[820px] px-5 py-20">
        <h1 className="font-display text-[32px] font-medium">Accounts</h1>
        <p className="mt-3 text-muted-foreground">
          This page is only available to moderators and the developer.
        </p>
        <Link to="/forum" className="mt-5 inline-block">
          <M3Button variant="tonal">Back to the forum</M3Button>
        </Link>
      </div>
    );
  }

  const shown = accounts.filter((a) =>
    `${a.handle} ${a.display_name}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const act = async (
    username: string,
    action: "ban" | "unban" | "timeout" | "untimeout" | "warn",
  ) => {
    const res = await moderateAccount({
      data: { username, action, reason, minutes },
    });
    if (!res.ok) {
      setNotice(res.error ?? "Could not apply that.");
      return;
    }
    setNotice(null);
    setReason("");
    await refresh();
  };

  const openPanel = async (username: string) => {
    if (openFor === username) {
      setOpenFor(null);
      return;
    }
    setOpenFor(username);
    setReason("");
    setActivity(null);
    try {
      setActivity(await accountActivity({ data: { username } }));
    } catch {
      setActivity(null);
    }
  };

  return (
    <div className="mx-auto max-w-[880px] px-5 py-12 md:px-12 md:py-20">
      <h1 className="font-display text-[38px] leading-tight font-medium md:text-[48px]">
        <span className="text-gradient">Accounts</span>
      </h1>
      <p className="mt-3 text-[17px] text-muted-foreground">
        Warn, time out or ban members. Warnings are logged with no restriction, timeouts stop
        posting until they expire, and bans lock the account out of the site.
      </p>

      {notice ? <p className="mt-5 text-[15px] text-destructive">{notice}</p> : null}

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search members"
        className="mt-8 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-[15px] outline-none focus:border-primary"
      />

      <div className="mt-5 space-y-3">
        {shown.map((a) => {
          const muted = a.mutedUntil && new Date(a.mutedUntil).getTime() > Date.now();
          return (
            <div
              key={a.username}
              className="rounded-[24px] border border-border/60 glass p-4"
            >
              <div className="flex flex-wrap items-center gap-3">
                <Avatar src={a.avatar_url || undefined} name={a.display_name} />
                <div className="min-w-0">
                  <p className="inline-flex items-center gap-1.5 font-medium">
                    {a.display_name}
                    <VerifiedBadge tier={a.tier} />
                  </p>
                  <p className="truncate text-sm text-muted-foreground">@{a.handle}</p>
                </div>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  {a.banned ? (
                    <span className="rounded-full bg-destructive/12 px-3 py-1 text-xs font-medium text-destructive">
                      Banned
                    </span>
                  ) : null}
                  {muted ? (
                    <span className="rounded-full bg-tertiary-container px-3 py-1 text-xs font-medium text-on-tertiary-container">
                      Timed out
                    </span>
                  ) : null}
                  {a.warnings ? (
                    <span className="rounded-full bg-secondary-container px-3 py-1 text-xs font-medium text-on-secondary-container">
                      {a.warnings} warning{a.warnings === 1 ? "" : "s"}
                    </span>
                  ) : null}
                  <M3Button variant="tonal" onClick={() => void openPanel(a.username)}>
                    <Icon name={openFor === a.username ? "expand_less" : "tune"} className="text-[20px]" />
                    Moderate
                  </M3Button>
                </div>
              </div>

              {openFor === a.username ? (
                <div className="mt-4 border-t border-border/60 pt-4">
                  {!a.canManage ? (
                    <p className="text-[15px] text-muted-foreground">
                      You can't moderate this account.
                    </p>
                  ) : (
                    <>
                      <input
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Reason (shown to the member)"
                        className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-[15px] outline-none focus:border-primary"
                      />
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {minutesOptions.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setMinutes(opt.value)}
                            className={`rounded-full border px-3 py-1.5 text-sm ${
                              minutes === opt.value
                                ? "border-primary text-primary"
                                : "border-border text-muted-foreground"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <M3Button variant="tonal" onClick={() => void act(a.username, "warn")}>
                          <Icon name="warning" className="text-[20px]" />
                          Warn
                        </M3Button>
                        {muted ? (
                          <M3Button
                            variant="outlined"
                            onClick={() => void act(a.username, "untimeout")}
                          >
                            <Icon name="timer_off" className="text-[20px]" />
                            Clear timeout
                          </M3Button>
                        ) : (
                          <M3Button
                            variant="outlined"
                            onClick={() => void act(a.username, "timeout")}
                          >
                            <Icon name="timer" className="text-[20px]" />
                            Time out
                          </M3Button>
                        )}
                        {a.banned ? (
                          <M3Button onClick={() => void act(a.username, "unban")}>
                            <Icon name="lock_open" className="text-[20px]" />
                            Unban
                          </M3Button>
                        ) : (
                          <M3Button onClick={() => void act(a.username, "ban")}>
                            <Icon name="gavel" className="text-[20px]" />
                            Ban
                          </M3Button>
                        )}
                      </div>
                    </>
                  )}

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium">Recent forum posts</p>
                      <div className="mt-2 space-y-2">
                        {(activity?.posts ?? []).map((p) => (
                          <Link
                            key={p.id}
                            to="/forum/$postId"
                            params={{ postId: p.id }}
                            className="block rounded-2xl border border-border/60 p-3 text-sm hover:border-primary"
                          >
                            <span className="font-medium">{p.title}</span>
                            <span className="block truncate text-muted-foreground">{p.body}</span>
                          </Link>
                        ))}
                        {activity && !activity.posts.length ? (
                          <p className="text-sm text-muted-foreground">No posts yet.</p>
                        ) : null}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Recent comments</p>
                      <div className="mt-2 space-y-2">
                        {(activity?.comments ?? []).map((c) => (
                          <p
                            key={c.id}
                            className="rounded-2xl border border-border/60 p-3 text-sm text-muted-foreground"
                          >
                            {c.body || "(image)"}
                          </p>
                        ))}
                        {activity && !activity.comments.length ? (
                          <p className="text-sm text-muted-foreground">No comments yet.</p>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {activity?.history.length ? (
                    <div className="mt-5">
                      <p className="text-sm font-medium">Moderation history</p>
                      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                        {activity.history.map((h) => (
                          <li key={h.id}>
                            {new Date(h.created_at).toLocaleDateString()} — {h.kind}
                            {h.lifted ? " (lifted)" : ""}
                            {h.reason ? `: ${h.reason}` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
        {!shown.length ? (
          <p className="rounded-[24px] border border-dashed border-border/70 p-10 text-center text-muted-foreground">
            No members found.
          </p>
        ) : null}
      </div>
    </div>
  );
}
