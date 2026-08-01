import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Icon, M3Button } from "@/components/m3";
import { Avatar, VerifiedBadge } from "@/components/verified";
import {
  addComment,
  deleteComment,
  editComment,
  listComments,
} from "@/lib/content.functions";
import { useAuth } from "@/lib/auth";

type CommentRow = {
  id: string;
  article_id: string;
  author_email: string;
  handle: string;
  display_name: string;
  avatar_url: string;
  tier: string;
  body: string;
  created_at: string;
};

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export function Comments({ articleId }: { articleId: string }) {
  const { session, profile, isDeveloper } = useAuth();
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () =>
    listComments({ data: { articleId } })
      .then((rows) => setComments(rows as unknown as CommentRow[]))
      .catch(() => setComments([]));

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);

  const submit = async () => {
    if (!session || !body.trim()) return;
    setBusy(true);
    const res = await addComment({ data: { articleId, email: session.email, body } });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Could not post your comment.");
      return;
    }
    setError(null);
    setBody("");
    await refresh();
  };

  return (
    <section className="mt-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-[26px] font-medium md:text-[32px]">
          Comments{comments.length ? ` (${comments.length})` : ""}
        </h2>
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <VerifiedBadge tier="gold" />
          developer
          <VerifiedBadge tier="blue" className="ml-2" />
          member
        </span>
      </div>

      {session && profile ? (
        <div className="mt-6 rounded-[28px] bg-surface-container p-5 elevation-1">
          <div className="flex items-center gap-3">
            <Avatar src={profile.avatar_url || undefined} name={profile.display_name} />
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 font-medium">
                <span className="truncate">{profile.display_name}</span>
                <VerifiedBadge tier={profile.tier} />
              </p>
              <p className="text-sm text-muted-foreground">@{profile.handle}</p>
            </div>
          </div>
          <textarea
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share your thoughts…"
            className="mt-4 w-full resize-y rounded-2xl border border-border bg-surface px-4 py-3 text-[15px] outline-none focus:border-primary"
          />
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
          <div className="mt-3 flex justify-end">
            <M3Button variant="filled" disabled={busy || !body.trim()} onClick={submit}>
              <Icon name="send" className="text-[20px]" />
              Post comment
            </M3Button>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-[28px] bg-accent p-6 text-accent-foreground">
          <p className="flex-1 text-[15px] leading-relaxed">
            Sign in to join the conversation. Members get a blue verified check next to their name —
            the golden check belongs to @techbymarcon.
          </p>
          <Link to="/login">
            <M3Button variant="filled">Sign in to comment</M3Button>
          </Link>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {comments.map((c) => (
          <div key={c.id} className="rounded-[28px] bg-surface-container-low p-5">
            <div className="flex items-start gap-3">
              <Avatar src={c.avatar_url || undefined} name={c.display_name} />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    {c.display_name}
                    <VerifiedBadge tier={c.tier} />
                  </span>
                  <span className="text-sm text-muted-foreground">@{c.handle}</span>
                  <span className="text-sm text-muted-foreground">· {timeAgo(c.created_at)}</span>
                </p>
                <p className="mt-2 whitespace-pre-wrap text-[16px] leading-relaxed text-foreground/90">
                  {c.body}
                </p>
              </div>
              {isDeveloper || session?.email === c.author_email ? (
                <button
                  aria-label="Delete comment"
                  className="m3-transition grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-foreground/8"
                  onClick={async () => {
                    await deleteComment({ data: { id: c.id, email: session?.email ?? "" } });
                    await refresh();
                  }}
                >
                  <Icon name="delete" className="text-[20px]" />
                </button>
              ) : null}
            </div>
          </div>
        ))}
        {comments.length === 0 ? (
          <p className="text-[15px] text-muted-foreground">
            No comments yet — be the first to write one.
          </p>
        ) : null}
      </div>
    </section>
  );
}
