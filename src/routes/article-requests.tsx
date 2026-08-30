import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArticleEditor } from "@/components/article-editor";
import { Icon, M3Button } from "@/components/m3";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/articles";
import {
  listArticleRequests,
  reviewArticleRequest,
  submitArticleRequest,
  withdrawArticleRequest,
  type ArticleRequest,
} from "@/lib/article-requests.functions";

export const Route = createFileRoute("/article-requests")({
  head: () => ({
    meta: [
      { title: "Article requests — Tech by Marcon" },
      {
        name: "description",
        content:
          "Moderators propose new Tech by Marcon articles here and the developer reviews, approves or declines them.",
      },
      { property: "og:title", content: "Article requests — Tech by Marcon" },
      {
        property: "og:description",
        content: "Moderators propose articles; the developer approves or declines them.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ArticleRequests,
});

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-secondary-container text-on-secondary-container",
  approved: "bg-tertiary-container text-on-tertiary-container",
  rejected: "bg-destructive/15 text-destructive",
};

function ArticleRequests() {
  const { isDeveloper, isModerator } = useAuth();
  const staff = isDeveloper || isModerator;
  const [items, setItems] = useState<ArticleRequest[]>([]);
  const [composing, setComposing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = () =>
    listArticleRequests()
      .then((res) => setItems(res.items))
      .catch(() => setItems([]));

  useEffect(() => {
    if (staff) void refresh();
  }, [staff]);

  if (!staff) {
    return (
      <div className="mx-auto max-w-[820px] px-5 py-20">
        <h1 className="font-display text-[32px] font-medium">Article requests</h1>
        <p className="mt-3 text-muted-foreground">
          This page is only available to moderators and the developer.
        </p>
        <Link to="/articles" className="mt-5 inline-block">
          <M3Button variant="tonal">Back to articles</M3Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[880px] px-5 py-12 md:px-12 md:py-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[38px] leading-tight font-medium md:text-[48px]">
            <span className="text-gradient">Article requests</span>
          </h1>
          <p className="mt-3 text-[17px] text-muted-foreground">
            {isDeveloper
              ? "Review what the moderators have proposed. Approving publishes the article instantly."
              : "Draft an article and send it to the developer for approval."}
          </p>
        </div>
        <M3Button variant="tonal" onClick={() => setComposing(true)}>
          <Icon name="add" className="text-[20px]" />
          New request
        </M3Button>
      </div>

      {message ? <p className="mt-5 text-[15px] text-muted-foreground">{message}</p> : null}

      <div className="mt-8 space-y-4">
        {items.map((r) => (
          <article key={r.id} className="rounded-[26px] border border-border/60 glass p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase ${
                  STATUS_STYLE[r.status] ?? STATUS_STYLE["pending"]
                }`}
              >
                {r.status}
              </span>
              <span className="text-sm text-muted-foreground">
                @{r.requester_handle} · {formatDate(r.created_at)} · {r.category}
              </span>
            </div>
            <h2 className="mt-3 font-display text-[22px] font-medium">{r.title}</h2>
            {r.description ? (
              <p className="mt-1 text-[15px] text-muted-foreground">{r.description}</p>
            ) : null}
            {r.review_note ? (
              <p className="mt-2 text-[15px]">
                <span className="text-muted-foreground">Note:</span> {r.review_note}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              {isDeveloper && r.status === "pending" ? (
                <>
                  <M3Button
                    variant="filled"
                    disabled={busy === r.id}
                    onClick={async () => {
                      setBusy(r.id);
                      const res = await reviewArticleRequest({
                        data: { id: r.id, approve: true },
                      });
                      setBusy(null);
                      setMessage(res.ok ? "Article published." : (res.error ?? "Failed."));
                      await refresh();
                    }}
                  >
                    <Icon name="check" className="text-[20px]" />
                    Approve &amp; publish
                  </M3Button>
                  <M3Button
                    variant="tonal"
                    disabled={busy === r.id}
                    onClick={async () => {
                      const note = window.prompt("Reason for declining (optional)") ?? "";
                      setBusy(r.id);
                      const res = await reviewArticleRequest({
                        data: { id: r.id, approve: false, note },
                      });
                      setBusy(null);
                      setMessage(res.ok ? "Request declined." : (res.error ?? "Failed."));
                      await refresh();
                    }}
                  >
                    <Icon name="close" className="text-[20px]" />
                    Decline
                  </M3Button>
                </>
              ) : null}
              {r.status === "pending" || isDeveloper ? (
                <M3Button
                  variant="text"
                  disabled={busy === r.id}
                  onClick={async () => {
                    setBusy(r.id);
                    await withdrawArticleRequest({ data: { id: r.id } });
                    setBusy(null);
                    await refresh();
                  }}
                >
                  <Icon name="delete" className="text-[20px]" />
                  Remove
                </M3Button>
              ) : null}
            </div>
          </article>
        ))}
        {!items.length ? (
          <p className="rounded-[24px] border border-dashed border-border/70 p-10 text-center text-muted-foreground">
            No article requests yet.
          </p>
        ) : null}
      </div>

      {composing ? (
        <ArticleEditor
          onClose={() => setComposing(false)}
          onSave={async (a) => {
            setComposing(false);
            const res = await submitArticleRequest({
              data: {
                title: a.title,
                description: a.description,
                body: a.body,
                category: a.category,
                cover: a.cover,
                readingTime: a.readingTime,
                downloadUrl: a.downloadUrl ?? "",
                downloadName: a.downloadName ?? "",
                downloadSize: a.downloadSize ?? 0,
              },
            });
            setMessage(
              res.ok ? "Request sent to the developer for review." : (res.error ?? "Failed."),
            );
            await refresh();
          }}
        />
      ) : null}
    </div>
  );
}
