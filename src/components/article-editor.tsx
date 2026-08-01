import { useState } from "react";
import { Icon, M3Button } from "@/components/m3";
import { CATEGORIES, type Article } from "@/lib/articles";

const blank: Article = {
  id: "",
  title: "",
  description: "",
  body: "",
  category: CATEGORIES[0]!,
  date: new Date().toISOString().slice(0, 10),
  readingTime: "5 min read",
  cover: "",
};

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);

export function ArticleEditor({
  initial,
  onSave,
  onClose,
}: {
  initial?: Article;
  onSave: (a: Article) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Article>(initial ?? blank);
  const set = (patch: Partial<Article>) => setDraft((d) => ({ ...d, ...patch }));

  const field =
    "w-full rounded-2xl border border-border bg-surface px-4 py-3 text-[16px] outline-none focus:border-primary m3-transition";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 backdrop-blur-sm md:items-center md:p-6">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-[32px] bg-surface-container p-6 elevation-3 md:rounded-[32px] md:p-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-[24px] font-medium">
            {initial ? "Edit article" : "New article"}
          </h2>
          <M3Button variant="icon" aria-label="Close" onClick={onClose}>
            <Icon name="close" />
          </M3Button>
        </div>

        <div className="mt-6 space-y-4">
          <input
            className={field}
            placeholder="Title"
            value={draft.title}
            onChange={(e) => set({ title: e.target.value })}
          />
          <textarea
            className={field}
            rows={2}
            placeholder="Short description"
            value={draft.description}
            onChange={(e) => set({ description: e.target.value })}
          />
          <textarea
            className={field}
            rows={6}
            placeholder="Article body"
            value={draft.body}
            onChange={(e) => set({ body: e.target.value })}
          />
          <input
            className={field}
            placeholder="Cover image URL"
            value={draft.cover}
            onChange={(e) => set({ cover: e.target.value })}
          />
          {draft.cover ? (
            <img
              src={draft.cover}
              alt="Cover preview"
              loading="lazy"
              className="h-40 w-full rounded-2xl object-cover"
            />
          ) : null}
          <div className="grid gap-4 sm:grid-cols-3">
            <select
              className={field}
              value={draft.category}
              onChange={(e) => set({ category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              className={field}
              type="date"
              value={draft.date}
              onChange={(e) => set({ date: e.target.value })}
            />
            <input
              className={field}
              placeholder="5 min read"
              value={draft.readingTime}
              onChange={(e) => set({ readingTime: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <M3Button variant="text" onClick={onClose}>
            Cancel
          </M3Button>
          <M3Button
            variant="filled"
            disabled={!draft.title.trim()}
            onClick={() =>
              onSave({
                ...draft,
                id: draft.id || slug(draft.title) || `article-${Date.now()}`,
                cover: draft.cover || "https://placehold.co/1200x800/EDE7F6/5E35B1?text=+",
              })
            }
          >
            Save
          </M3Button>
        </div>
      </div>
    </div>
  );
}
