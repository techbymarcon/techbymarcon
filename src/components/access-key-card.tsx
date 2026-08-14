import { useEffect, useState } from "react";
import { Icon, M3Button } from "@/components/m3";
import { getAccessKey, type AccessKeyInfo } from "@/lib/access-key.functions";

const TIER_COPY: Record<string, { name: string; blurb: string; chip: string }> = {
  blue: {
    name: "Blue key",
    blurb: "Post in the forum and delete your own posts. Articles stay read-only.",
    chip: "bg-secondary-container text-on-secondary-container",
  },
  green: {
    name: "Green key",
    blurb:
      "Everything a blue key does, plus removing anyone's forum post and setting posting limits.",
    chip: "bg-emerald-500/15 text-emerald-500",
  },
  gold: {
    name: "Golden key",
    blurb: "Full access — articles, site content, forum moderation and roles.",
    chip: "bg-amber-500/15 text-amber-500",
  },
};

export function AccessKeyCard({ className }: { className?: string }) {
  const [info, setInfo] = useState<AccessKeyInfo>(null);
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getAccessKey()
      .then((res) => setInfo(res))
      .catch(() => setInfo(null));
  }, []);

  if (!info) return null;
  const copy = TIER_COPY[info.tier] ?? TIER_COPY["blue"]!;
  const masked = `${info.key.slice(0, 12)}${"•".repeat(24)}`;

  return (
    <div className={`rounded-[28px] border border-border/60 glass p-6 ${className ?? ""}`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium ${copy.chip}`}>
          <Icon name="key" className="text-[18px]" />
          {copy.name}
        </span>
        <span className="text-sm text-muted-foreground">
          Issued when you signed in · expires when you sign out
        </span>
      </div>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{copy.blurb}</p>

      <code className="mt-4 block overflow-x-auto rounded-2xl bg-surface px-4 py-3 font-mono text-[13px] break-all">
        {shown ? info.key : masked}
      </code>

      <div className="mt-3 flex flex-wrap gap-2">
        <M3Button variant="tonal" onClick={() => setShown((v) => !v)}>
          <Icon name={shown ? "visibility_off" : "visibility"} className="text-[20px]" />
          {shown ? "Hide key" : "Show key"}
        </M3Button>
        <M3Button
          variant="text"
          onClick={async () => {
            await navigator.clipboard.writeText(info.key);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          }}
        >
          <Icon name="content_copy" className="text-[20px]" />
          {copied ? "Copied" : "Copy"}
        </M3Button>
      </div>

      <ul className="mt-4 flex flex-wrap gap-2">
        {info.scopes.map((scope) => (
          <li
            key={scope}
            className="rounded-full border border-border/70 px-3 py-1 font-mono text-[12px] text-muted-foreground"
          >
            {scope}
          </li>
        ))}
      </ul>
    </div>
  );
}
