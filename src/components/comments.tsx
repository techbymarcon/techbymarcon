import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Icon, M3Button } from "@/components/m3";
import { Avatar, VerifiedBadge } from "@/components/verified";
import { Linkify } from "@/components/linkify";
import {
  addComment,
  deleteComment,
  editComment,
  listComments,
  uploadCommentImage,
} from "@/lib/content.functions";
import { useAuth } from "@/lib/auth";

type CommentRow = {
  id: string;
  article_id: string;
  mine: boolean;
  handle: string;
  display_name: string;
  avatar_url: string;
  tier: string;
  body: string;
  image_url: string;
  parent_id: string | null;
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

const readFile = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });

function Composer({
  articleId,
  parentId,
  onDone,
  onError,
  compact,
  autoFocus,
}: {
  articleId: string;
  parentId?: string | null;
  onDone: () => void | Promise<void>;
  onError: (msg: string) => void;
  compact?: boolean;
  autoFocus?: boolean;
}) {
  const [body, setBody] = useState("");
  const [image, setImage] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      onError("Image must be smaller than 5 MB.");
      return;
    }
    setBusy(true);
    const res = await uploadCommentImage({ data: { dataUrl: await readFile(file) } });
    setBusy(false);
    if (!res.ok) {
      onError(res.error ?? "Could not upload that image.");
      return;
    }
    setImage(res.url);
  };

  const submit = async () => {
    if (!body.trim() && !image) return;
    setBusy(true);
    const res = await addComment({
      data: { articleId, body, imageUrl: image, parentId: parentId ?? null },
    });
    setBusy(false);
    if (!res.ok) {
      onError(res.error ?? "Could not post your comment.");
      return;
    }
    setBody("");
    setImage("");
    await onDone();
  };

  return (
    <div className={compact ? "mt-3" : "mt-4"}>
      <textarea
        rows={compact ? 2 : 3}
        autoFocus={autoFocus}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={parentId ? "Write a reply…" : "Share your thoughts…"}
        className="w-full resize-y rounded-2xl border border-border bg-surface px-4 py-3 text-[15px] outline-none focus:border-primary"
      />
      {image ? (
        <div className="relative mt-3 w-fit">
          <img src={image} alt="Attachment preview" className="max-h-64 rounded-2xl object-cover" />
          <button
            aria-label="Remove image"
            onClick={() => setImage("")}
            className="m3-transition absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-surface-container elevation-1"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>
      ) : null}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
        className="hidden"
        onChange={(e) => void pick(e.target.files?.[0])}
      />
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <M3Button variant="text" disabled={busy} onClick={() => fileRef.current?.click()}>
          <Icon name="image" className="text-[20px]" />
          Add image
        </M3Button>
        <M3Button
          variant="filled"
          disabled={busy || (!body.trim() && !image)}
          onClick={() => void submit()}
        >
          <Icon name="send" className="text-[20px]" />
          {parentId ? "Reply" : "Post comment"}
        </M3Button>
      </div>
    </div>
  );
}

export function Comments({ articleId }: { articleId: string }) {
  const { session, profile, isDeveloper, isModerator } = useAuth();
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const refresh = () =>
    listComments({ data: { articleId } })
      .then((rows) => setComments(rows as unknown as CommentRow[]))
      .catch(() => setComments([]));

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);

  const roots = comments.filter((c) => !c.parent_id);
  const repliesOf = (id: string) =>
    comments
      .filter((c) => c.parent_id === id)
      .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));

  const renderComment = (c: CommentRow, isReply = false) => (
    <div
      key={c.id}
      className={
        isReply
          ? "rounded-[24px] border border-border/50 bg-surface-container p-4"
          : "surface-sheen rounded-[28px] border border-border/60 glass p-5"
      }

    >
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
          {editingId === c.id ? (
            <div className="mt-2">
              <textarea
                rows={3}
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                className="w-full resize-y rounded-2xl border border-border bg-surface px-4 py-3 text-[15px] outline-none focus:border-primary"
              />
              <div className="mt-2 flex justify-end gap-2">
                <M3Button variant="text" onClick={() => setEditingId(null)}>
                  Cancel
                </M3Button>
                <M3Button
                  variant="filled"
                  disabled={!editBody.trim()}
                  onClick={async () => {
                    const res = await editComment({ data: { id: c.id, body: editBody } });
                    if (!res.ok) {
                      setError(res.error ?? "Could not save your edit.");
                      return;
                    }
                    setError(null);
                    setEditingId(null);
                    await refresh();
                  }}
                >
                  Save
                </M3Button>
              </div>
            </div>
          ) : (
            <>
              {c.body ? (
                <p className="mt-2 whitespace-pre-wrap text-[16px] leading-relaxed text-foreground/90">
                  <Linkify text={c.body} />
                </p>
              ) : null}
              {c.image_url ? (
                <img
                  src={c.image_url}
                  alt={`Image shared by ${c.display_name}`}
                  loading="lazy"
                  className="mt-3 max-h-96 w-auto max-w-full rounded-2xl object-cover"
                />
              ) : null}
            </>
          )}

          {session ? (
            <button
              className="m3-transition mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:bg-foreground/8"
              onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
            >
              <Icon name="reply" className="text-[18px]" />
              Reply
            </button>
          ) : null}

          {replyTo === c.id && session ? (
            <Composer
              articleId={articleId}
              parentId={isReply ? c.parent_id : c.id}
              compact
              autoFocus
              onError={setError}
              onDone={async () => {
                setReplyTo(null);
                setError(null);
                await refresh();
              }}
            />
          ) : null}
        </div>
        {isDeveloper || isModerator || c.mine ? (
          <div className="flex shrink-0 items-center gap-1">
            <button
              aria-label="Edit comment"
              className="m3-transition grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-foreground/8"
              onClick={() => {
                setEditingId(c.id);
                setEditBody(c.body);
              }}
            >
              <Icon name="edit" className="text-[20px]" />
            </button>
            <button
              aria-label="Delete comment"
              className="m3-transition grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-foreground/8"
              onClick={async () => {
                await deleteComment({ data: { id: c.id } });
                await refresh();
              }}
            >
              <Icon name="delete" className="text-[20px]" />
            </button>
          </div>
        ) : null}
      </div>

      {!isReply && repliesOf(c.id).length ? (
        <div className="mt-4 space-y-3 border-l border-border pl-4 md:pl-6">
          {repliesOf(c.id).map((r) => renderComment(r, true))}
        </div>
      ) : null}
    </div>
  );

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
        <div className="surface-sheen mt-6 rounded-[28px] border border-border/60 glass p-5 elevation-1">
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
          <Composer
            articleId={articleId}
            onError={setError}
            onDone={async () => {
              setError(null);
              await refresh();
            }}
          />
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
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
        {roots.map((c) => renderComment(c))}
        {comments.length === 0 ? (
          <p className="text-[15px] text-muted-foreground">
            No comments yet — be the first to write one.
          </p>
        ) : null}
      </div>
    </section>
  );
}
