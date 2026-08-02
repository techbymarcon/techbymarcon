import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Icon, M3Button } from "@/components/m3";
import { getArticleDownload } from "@/lib/content.functions";
import { useAuth } from "@/lib/auth";

const prettySize = (bytes: number) => {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
};

export function ArticleDownload({
  path,
  name,
  size,
}: {
  path: string;
  name: string;
  size: number;
}) {
  const { session } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!path) return null;

  return (
    <div className="mt-10 rounded-[28px] bg-surface-container p-5 elevation-1">
      <div className="flex flex-wrap items-center gap-4">
        <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-secondary-container text-on-secondary-container">
          <Icon name="download" />
        </span>
        <div className="mr-auto min-w-0">
          <p className="truncate text-[16px] font-medium">{name || "Attached file"}</p>
          <p className="text-sm text-muted-foreground">
            {prettySize(size)}
            {size ? " · " : ""}
            {session ? "Ready to download" : "Sign in or sign up to download"}
          </p>
        </div>
        {session ? (
          <M3Button
            variant="filled"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setStatus(null);
              try {
                const res = await getArticleDownload({ data: { path } });
                if (!res.ok) setStatus(res.error ?? "Could not prepare that download.");
                else window.location.href = res.url;
              } catch {
                setStatus("Could not prepare that download.");
              }
              setBusy(false);
            }}
          >
            <Icon name="download" className="text-[20px]" />
            {busy ? "Preparing…" : "Download"}
          </M3Button>
        ) : (
          <Link to="/login">
            <M3Button variant="tonal">
              <Icon name="lock" className="text-[20px]" />
              Sign in to download
            </M3Button>
          </Link>
        )}
      </div>
      {status ? <p className="mt-3 text-sm text-destructive">{status}</p> : null}
    </div>
  );
}
