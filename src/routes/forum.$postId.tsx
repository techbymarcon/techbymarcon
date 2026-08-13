import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Comments } from "@/components/comments";
import { Icon, M3Button } from "@/components/m3";
import { ForumVotes } from "@/components/forum-votes";

import { Linkify } from "@/components/linkify";
import { Avatar, VerifiedBadge } from "@/components/verified";
import { useAuth } from "@/lib/auth";
import {
  deleteForumPost,
  getForumPost,
  moderateForumPost,
  updateForumPost,
  type ForumPost,
} from "@/lib/forum.functions";

export const Route = createFileRoute("/forum/$postId")({
  head: () => ({
    meta: [
      { title: "Discussion — Tech by Marcon forum" },
      {
        name: "description",
        content: "Read and reply to a discussion in the Tech by Marcon community forum.",
      },
      { property: "og:title", content: "Discussion — Tech by Marcon forum" },
      {
        property: "og:description",
        content: "Read and reply to a discussion in the Tech by Marcon community forum.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ForumPostPage,
});

function ForumPostPage() {
  const { postId } = Route.useParams();
  const navigate = useNavigate();
  const { isModerator, session } = useAuth();
  const [post, setPost] = useState<ForumPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const load = () =>
    getForumPost({ data: { id: postId } })
      .then((r) => {
        const p = (r.post as ForumPost | null) ?? null;
        setPost(p);
        setTitle(p?.title ?? "");
        setBody(p?.body ?? "");
      })
      .finally(() => setLoading(false));

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  if (loading) {
    return <div className="mx-auto max-w-[820px] px-5 py-20 text-muted-foreground">Loading…</div>;
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-[820px] px-5 py-20">
        <p className="text-muted-foreground">That discussion no longer exists.</p>
        <Link to="/forum" className="mt-4 inline-block">
          <M3Button variant="tonal">Back to the forum</M3Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[820px] px-5 py-12 md:px-12 md:py-20">
      <Link to="/forum" className="mb-6 inline-block">
        <M3Button variant="text">
          <Icon name="arrow_back" className="text-[20px]" />
          Forum
        </M3Button>
      </Link>

      <article className="surface-sheen rounded-[28px] border border-border/60 glass p-6">
        <div className="mb-4 flex items-center gap-3">
          <Avatar src={post.avatar_url || undefined} name={post.display_name} />
          <div>
            <p className="inline-flex items-center gap-1.5 font-medium">
              {post.display_name}
              <VerifiedBadge tier={post.tier} />
            </p>
            <p className="text-sm text-muted-foreground">@{post.handle}</p>
          </div>
          <div className="ml-auto flex items-center gap-1">
            {isModerator ? (
              <>
                <button
                  aria-label={post.pinned ? "Unpin post" : "Pin post"}
                  className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-foreground/8"
                  onClick={async () => {
                    await moderateForumPost({ data: { id: post.id, pinned: !post.pinned } });
                    await load();
                  }}
                >
                  <Icon name="push_pin" filled={post.pinned} className="text-[20px]" />
                </button>
                <button
                  aria-label={post.locked ? "Unlock post" : "Lock post"}
                  className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-foreground/8"
                  onClick={async () => {
                    await moderateForumPost({ data: { id: post.id, locked: !post.locked } });
                    await load();
                  }}
                >
                  <Icon name={post.locked ? "lock" : "lock_open"} className="text-[20px]" />
                </button>
              </>
            ) : null}
            {post.canManage ? (
              <>
                <button
                  aria-label="Edit post"
                  className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-foreground/8"
                  onClick={() => setEditing((v) => !v)}
                >
                  <Icon name="edit" className="text-[20px]" />
                </button>
                <button
                  aria-label="Delete post"
                  className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-foreground/8"
                  onClick={async () => {
                    await deleteForumPost({ data: { id: post.id } });
                    await navigate({ to: "/forum" });
                  }}
                >
                  <Icon name="delete" className="text-[20px]" />
                </button>
              </>
            ) : null}
          </div>
        </div>

        {editing ? (
          <div className="space-y-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-[15px] outline-none focus:border-primary"
            />
            <textarea
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full resize-y rounded-2xl border border-border bg-surface px-4 py-3 text-[15px] outline-none focus:border-primary"
            />
            <div className="flex justify-end gap-2">
              <M3Button variant="text" onClick={() => setEditing(false)}>
                Cancel
              </M3Button>
              <M3Button
                variant="filled"
                onClick={async () => {
                  await updateForumPost({
                    data: { id: post.id, title, body, imageUrl: post.image_url },
                  });
                  setEditing(false);
                  await load();
                }}
              >
                Save
              </M3Button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="font-display text-[30px] leading-tight font-medium md:text-[38px]">
              {post.title}
            </h1>
            {post.body ? (
              <p className="mt-4 text-[17px] leading-relaxed whitespace-pre-wrap">
                <Linkify text={post.body} />
              </p>
            ) : null}
            {post.image_url ? (
              <img
                src={post.image_url}
                alt={post.title}
                className="mt-5 max-h-[520px] rounded-3xl"
              />
            ) : null}
          </>
        )}

        <div className="mt-5">
          <ForumVotes key={post.id} post={post} canVote={Boolean(session)} />
        </div>
      </article>


      {post.locked ? (
        <p className="mt-8 rounded-2xl border border-border/60 glass px-4 py-3 text-[15px] text-muted-foreground">
          <Icon name="lock" className="mr-2 align-middle text-[18px]" />
          This thread is locked — no new replies.
        </p>
      ) : null}

      <div className="mt-10">
        <Comments articleId={`forum:${post.id}`} />
      </div>
    </div>
  );
}
