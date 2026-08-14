import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Icon, M3Button } from "@/components/m3";
import { ForumVotes } from "@/components/forum-votes";
import { ForumLimits } from "@/components/forum-limits";

import { Reveal } from "@/components/reveal";
import { Avatar, VerifiedBadge } from "@/components/verified";
import { Linkify } from "@/components/linkify";
import { useAuth } from "@/lib/auth";
import { uploadCommentImage } from "@/lib/content.functions";
import {
  createForumPost,
  deleteForumPost,
  listForumPosts,
  moderateForumPost,
  type ForumPost,
} from "@/lib/forum.functions";
import { PROFANITY_WARNING, hasProfanity, isNight, slurStage } from "@/lib/profanity";

export const Route = createFileRoute("/forum/")({
  head: () => ({
    meta: [
      { title: "Forum — Tech by Marcon" },
      {
        name: "description",
        content:
          "The Tech by Marcon community forum: ask questions, share Android tips and talk with other members.",
      },
      { property: "og:title", content: "Forum — Tech by Marcon" },
      {
        property: "og:description",
        content: "Ask questions, share Android tips and talk with other members.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Forum,
});

function Forum() {
  const { session, profile, isModerator } = useAuth();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [image, setImage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () =>
    listForumPosts()
      .then((rows) => setPosts(rows as ForumPost[]))
      .catch(() => setPosts([]));

  useEffect(() => {
    void refresh();
  }, []);

  const pick = async (file?: File) => {
    if (!file) return;
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });
    const res = await uploadCommentImage({ data: { dataUrl } });
    if (!res.ok) {
      setError(res.error ?? "Could not upload that image.");
      return;
    }
    setImage(res.url);
  };

  const swearing = hasProfanity(title, body);
  const night = isNight(title, body);
  const slur = night ? null : slurStage(title, body);

  // "night" gets a brief, deadpan "Oh." — open the space first, then fade in;
  // on the way out, fade first, then collapse the space.
  const [ohSpace, setOhSpace] = useState(false);
  const [ohOpen, setOhOpen] = useState(false);
  const [ohFade, setOhFade] = useState(false);
  useEffect(() => {
    if (!night) return;
    setOhSpace(true);
    const openId = setTimeout(() => setOhOpen(true), 20);
    const inId = setTimeout(() => setOhFade(true), 250);
    const outId = setTimeout(() => setOhFade(false), 5000);
    const collapseId = setTimeout(() => setOhOpen(false), 5300);
    const doneId = setTimeout(() => setOhSpace(false), 5550);
    return () => {
      [openId, inId, outId, collapseId, doneId].forEach(clearTimeout);
    };
  }, [night]);


  // Shake the whole page while the slur is being typed; intensity is 0-100.
  useEffect(() => {
    const root = document.documentElement;
    const amp = slur?.shake ?? 0;
    if (amp > 0) {
      root.style.setProperty("--shake-amp", `${(amp / 100) * 12}px`);
      root.classList.add("screen-shake");
    } else {
      root.classList.remove("screen-shake");
      root.style.removeProperty("--shake-amp");
    }
    return () => {
      root.classList.remove("screen-shake");
      root.style.removeProperty("--shake-amp");
    };
  }, [slur?.shake]);


  const publish = async () => {
    setBusy(true);
    const res = await createForumPost({ data: { title, body, imageUrl: image } });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Could not publish that post.");
      return;
    }
    setTitle("");
    setBody("");
    setImage("");
    setError(null);
    await refresh();
  };

  return (
    <div className="mx-auto max-w-[900px] px-5 py-12 md:px-12 md:py-20">
      <Reveal>
        <header className="mb-10">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-border/70 glass px-4 py-2 text-[13px] font-medium">
            <Icon name="forum" className="text-[18px] text-primary" />
            Community
          </p>
          <h1 className="font-display text-[38px] leading-[1.05] font-medium tracking-tight md:text-[54px]">
            <span className="text-gradient">Users space</span>
          </h1>
          <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-muted-foreground">
            A place for members to ask, answer and share. Moderators keep it tidy — no file
            downloads here.
          </p>
          {isModerator && (
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-container px-4 py-2 text-[13px] font-medium text-on-primary-container">
                <Icon name="shield_person" className="text-[18px]" />
                Moderation tools active
              </span>
              <Link to="/moderators">
                <M3Button variant="text">
                  <Icon name="group" className="text-[20px]" />
                  Moderators
                </M3Button>
              </Link>
              <Link to="/accounts">
                <M3Button variant="text">
                  <Icon name="manage_accounts" className="text-[20px]" />
                  Accounts
                </M3Button>
              </Link>
            </div>
          )}
        </header>
      </Reveal>

      <ForumLimits className="mb-8" />



      {error ? (
        <p className="mb-5 rounded-2xl bg-destructive/10 px-4 py-3 text-[15px] text-destructive">
          {error}
        </p>
      ) : null}

      {session && profile ? (
        <section className="surface-sheen mb-10 rounded-[28px] border border-border/60 glass p-5">
          <div className="mb-3 flex items-center gap-3">
            <Avatar src={profile.avatar_url || undefined} name={profile.display_name} />
            <span className="inline-flex items-center gap-1.5 font-medium">
              {profile.display_name}
              <VerifiedBadge tier={profile.tier} />
            </span>
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Post title"
            className="mb-3 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-[15px] outline-none focus:border-primary"
          />
          <textarea
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What do you want to talk about?"
            className="w-full resize-y rounded-2xl border border-border bg-surface px-4 py-3 text-[15px] outline-none focus:border-primary"
          />
          {image ? (
            <div className="relative mt-3 w-fit">
              <img src={image} alt="Attachment preview" className="max-h-64 rounded-2xl" />
              <button
                aria-label="Remove image"
                onClick={() => setImage("")}
                className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-surface-container elevation-1"
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
          {ohSpace ? (
            <div
              className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                ohFade ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <p
                  role="status"
                  className={`mt-3 rounded-2xl bg-surface-container px-4 py-3 text-[14px] leading-snug transition-opacity duration-300 ${
                    ohFade ? "opacity-100" : "opacity-0"
                  }`}
                >
                  Oh.
                </p>
              </div>
            </div>
          ) : slur || swearing ? (
            <p
              role="alert"
              className="mt-3 flex items-start gap-2 rounded-2xl bg-destructive/10 px-4 py-3 text-[14px] leading-snug text-destructive"
            >
              <Icon name="warning" className="text-[18px]" />
              {slur ? slur.message : PROFANITY_WARNING}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <M3Button variant="text" disabled={busy} onClick={() => fileRef.current?.click()}>
              <Icon name="image" className="text-[20px]" />
              Add image
            </M3Button>
            <M3Button variant="filled" disabled={busy || !title.trim()} onClick={() => void publish()}>
              <Icon name="send" className="text-[20px]" />
              Publish
            </M3Button>
          </div>

        </section>
      ) : (
        <div className="mb-10 rounded-[28px] border border-border/60 glass p-5">
          <p className="text-[15px] text-muted-foreground">
            Sign in to start a discussion — every member gets a blue verified check.
          </p>
          <Link to="/login" className="mt-3 inline-block">
            <M3Button variant="tonal">
              <Icon name="login" className="text-[20px]" />
              Sign in
            </M3Button>
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {posts.map((p) => (
          <article
            key={p.id}
            className="surface-sheen rounded-[28px] border border-border/60 glass p-5"
          >
            <div className="flex items-start gap-3">
              <Avatar src={p.avatar_url || undefined} name={p.display_name} />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                    {p.display_name}
                    <VerifiedBadge tier={p.tier} />
                  </span>
                  <Link to="/u/$handle" params={{ handle: p.handle }} className="hover:underline">
                    @{p.handle}
                  </Link>
                  {p.pinned ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary-container px-2 py-0.5 text-[12px] text-on-primary-container">
                      <Icon name="push_pin" className="text-[14px]" /> Pinned
                    </span>
                  ) : null}
                  {p.locked ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2 py-0.5 text-[12px]">
                      <Icon name="lock" className="text-[14px]" /> Locked
                    </span>
                  ) : null}
                </p>
                <Link to="/forum/$postId" params={{ postId: p.id }}>
                  <h2 className="mt-1 font-display text-[22px] leading-snug font-medium hover:text-primary">
                    {p.title}
                  </h2>
                </Link>
                {p.body ? (
                  <p className="mt-2 line-clamp-3 text-[15px] whitespace-pre-wrap text-muted-foreground">
                    <Linkify text={p.body} />
                  </p>
                ) : null}
                <div className="mt-3">
                  <ForumVotes post={p} canVote={Boolean(session)} />
                </div>
              </div>

              {isModerator || p.canManage ? (
                <div className="flex shrink-0 items-center gap-1">
                  {isModerator ? (
                    <>
                      <button
                        aria-label={p.pinned ? "Unpin post" : "Pin post"}
                        className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-foreground/8"
                        onClick={async () => {
                          await moderateForumPost({ data: { id: p.id, pinned: !p.pinned } });
                          await refresh();
                        }}
                      >
                        <Icon name="push_pin" filled={p.pinned} className="text-[20px]" />
                      </button>
                      <button
                        aria-label={p.locked ? "Unlock post" : "Lock post"}
                        className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-foreground/8"
                        onClick={async () => {
                          await moderateForumPost({ data: { id: p.id, locked: !p.locked } });
                          await refresh();
                        }}
                      >
                        <Icon name={p.locked ? "lock" : "lock_open"} className="text-[20px]" />
                      </button>
                    </>
                  ) : null}
                  <button
                    aria-label="Delete post"
                    className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-foreground/8"
                    onClick={async () => {
                      await deleteForumPost({ data: { id: p.id } });
                      await refresh();
                    }}
                  >
                    <Icon name="delete" className="text-[20px]" />
                  </button>
                </div>
              ) : null}
            </div>
          </article>
        ))}
        {!posts.length ? (
          <p className="rounded-[28px] border border-dashed border-border/70 p-10 text-center text-muted-foreground">
            No discussions yet. Be the first to post.
          </p>
        ) : null}
      </div>
    </div>
  );
}
