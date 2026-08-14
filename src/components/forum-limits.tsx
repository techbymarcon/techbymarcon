import { useEffect, useState } from "react";
import { Icon, M3Button } from "@/components/m3";
import { getAccessKey, getForumRules, setForumRules } from "@/lib/access-key.functions";

/** Posting limits — visible to everyone, editable only with a green or gold key. */
export function ForumLimits({ className }: { className?: string }) {
  const [canEdit, setCanEdit] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [perDay, setPerDay] = useState(0);
  const [status, setStatus] = useState("");

  useEffect(() => {
    getForumRules()
      .then((r) => {
        setCooldown(r.postCooldownSeconds);
        setPerDay(r.maxPostsPerDay);
      })
      .catch(() => undefined);
    getAccessKey()
      .then((k) => setCanEdit(Boolean(k?.scopes.includes("forum:ratelimit"))))
      .catch(() => undefined);
  }, []);

  if (!canEdit) return null;

  const field =
    "w-24 rounded-2xl border border-border bg-surface px-3 py-2 text-[15px] outline-none focus:border-primary";

  return (
    <section className={`rounded-[28px] border border-border/60 glass p-5 ${className ?? ""}`}>
      <p className="inline-flex items-center gap-2 text-[15px] font-medium">
        <Icon name="speed" className="text-[20px] text-primary" />
        Posting limits
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Applies to members only — staff keys are exempt. Use 0 to turn a limit off.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-4">
        <label className="text-sm text-muted-foreground">
          <span className="mb-1.5 block">Cooldown (seconds)</span>
          <input
            className={field}
            type="number"
            min={0}
            value={cooldown}
            onChange={(e) => setCooldown(Number(e.target.value))}
          />
        </label>
        <label className="text-sm text-muted-foreground">
          <span className="mb-1.5 block">Posts per day</span>
          <input
            className={field}
            type="number"
            min={0}
            value={perDay}
            onChange={(e) => setPerDay(Number(e.target.value))}
          />
        </label>
        <M3Button
          variant="filled"
          onClick={async () => {
            const res = await setForumRules({
              data: { postCooldownSeconds: cooldown, maxPostsPerDay: perDay },
            });
            setStatus(res.ok ? "Limits saved." : (res.error ?? "Could not save."));
          }}
        >
          <Icon name="save" className="text-[20px]" />
          Save limits
        </M3Button>
        {status ? <span className="text-sm text-muted-foreground">{status}</span> : null}
      </div>
    </section>
  );
}
