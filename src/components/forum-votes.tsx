import { useState } from "react";
import { Icon } from "@/components/m3";
import { cn } from "@/lib/utils";
import { voteForumPost, type ForumPost } from "@/lib/forum.functions";

/** Reddit-style up/down control; clicking the active arrow clears the vote. */
export function ForumVotes({
  post,
  canVote,
  className,
}: {
  post: ForumPost;
  canVote: boolean;
  className?: string;
}) {
  const [state, setState] = useState({
    up: post.upvotes,
    down: post.downvotes,
    mine: post.myVote,
  });
  const [busy, setBusy] = useState(false);

  const send = async (value: number) => {
    if (!canVote || busy) return;
    setBusy(true);
    const res = await voteForumPost({ data: { id: post.id, value } });
    setBusy(false);
    if (res.ok) setState({ up: res.upvotes, down: res.downvotes, mine: res.myVote });
  };

  const score = state.up - state.down;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border/60 glass px-1.5 py-1",
        className,
      )}
    >
      <button
        type="button"
        aria-label="Upvote"
        aria-pressed={state.mine === 1}
        disabled={!canVote || busy}
        onClick={(e) => {
          e.preventDefault();
          void send(1);
        }}
        className={cn(
          "m3-transition grid size-8 place-items-center rounded-full hover:bg-foreground/8 disabled:opacity-50",
          state.mine === 1 ? "text-primary" : "text-muted-foreground",
        )}
      >
        <Icon name="arrow_upward" filled={state.mine === 1} className="text-[18px]" />
      </button>
      <span
        className={cn(
          "min-w-6 text-center text-[14px] font-medium tabular-nums",
          state.mine === 1 && "text-primary",
          state.mine === -1 && "text-destructive",
        )}
      >
        {score}
      </span>
      <button
        type="button"
        aria-label="Downvote"
        aria-pressed={state.mine === -1}
        disabled={!canVote || busy}
        onClick={(e) => {
          e.preventDefault();
          void send(-1);
        }}
        className={cn(
          "m3-transition grid size-8 place-items-center rounded-full hover:bg-foreground/8 disabled:opacity-50",
          state.mine === -1 ? "text-destructive" : "text-muted-foreground",
        )}
      >
        <Icon name="arrow_downward" filled={state.mine === -1} className="text-[18px]" />
      </button>
    </div>
  );
}
