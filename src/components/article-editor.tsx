import { useState } from "react";
import { Icon, M3Button } from "@/components/m3";
import { CATEGORIES, type Article } from "@/lib/articles";
import { createDownloadUpload, uploadArticleImage } from "@/lib/content.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  buildMarker,
  findDownloadMarkers,
  replaceMarkerAt,
} from "@/lib/download-markers";


const blank: Article = {
  id: "",
  title: "",
  description: "",
  body: "",
  category: CATEGORIES[0]!,
  date: new Date().toISOString().slice(0, 10),
  readingTime: "5 min read",
  cover: "",
  downloadUrl: "",
  downloadName: "",
  downloadSize: 0,
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
  const [upload, setUpload] = useState<string | null>(null);
  const [fileStatus, setFileStatus] = useState<string | null>(null);
  const set = (patch: Partial<Article>) => setDraft((d) => ({ ...d, ...patch }));
  const markers = findDownloadMarkers(draft.body);


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
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
              Cover image — upload from your device (PNG, JPG or JPEG, max 5 MB)
            </span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-[15px] file:mr-4 file:rounded-full file:border-0 file:bg-secondary-container file:px-4 file:py-2 file:text-[14px] file:font-medium file:text-on-secondary-container"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                e.target.value = "";
                if (file.size > 5 * 1024 * 1024) {
                  setUpload("Image must be under 5 MB.");
                  return;
                }
                setUpload("Uploading image…");
                try {
                  const dataUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(String(reader.result));
                    reader.onerror = () => reject(new Error("read"));
                    reader.readAsDataURL(file);
                  });
                  const res = await uploadArticleImage({ data: { dataUrl } });
                  if (!res.ok) {
                    setUpload(res.error ?? "Could not upload that image.");
                    return;
                  }
                  set({ cover: res.url });
                  setUpload("Cover image uploaded.");
                } catch {
                  setUpload("Could not read that file.");
                }
              }}
            />
          </label>
          {upload ? <p className="text-sm text-muted-foreground">{upload}</p> : null}
          <input
            className={field}
            placeholder="…or paste a cover image URL"
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
          <div className="rounded-2xl border border-border p-4">
            <span className="block text-[13px] font-medium text-muted-foreground">
              Download buttons — type <code>[download]</code> anywhere in the body text, then attach
              a file to it here (max 1 GB each). Visitors must be signed in to download.
            </span>
            {markers.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No [download] markers in the body yet.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {markers.map((m, i) => (
                  <div key={`${m.index}-${i}`} className="rounded-2xl bg-surface p-3">
                    <p className="text-[13px] font-medium">
                      Download #{i + 1}
                      {m.name ? ` — ${m.name}` : " — no file attached"}
                    </p>
                    {m.path ? (
                      <button
                        type="button"
                        className="mt-2 text-sm text-destructive"
                        onClick={() =>
                          set({
                            body: replaceMarkerAt(draft.body, m.index, m.raw.length, "[download]"),
                          })
                        }
                      >
                        Remove file
                      </button>
                    ) : (
                      <input
                        type="file"
                        className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-[15px] file:mr-4 file:rounded-full file:border-0 file:bg-secondary-container file:px-4 file:py-2 file:text-[14px] file:font-medium file:text-on-secondary-container"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          e.target.value = "";
                          if (file.size > 1024 * 1024 * 1024) {
                            setFileStatus("File must be 1 GB or smaller.");
                            return;
                          }
                          setFileStatus("Uploading file… this can take a while for large files.");
                          try {
                            const res = await createDownloadUpload({
                              data: { fileName: file.name, size: file.size },
                            });
                            if (!res.ok) {
                              setFileStatus(res.error ?? "Could not start the upload.");
                              return;
                            }
                            const { error } = await supabase.storage
                              .from("downloads")
                              .uploadToSignedUrl(res.path, res.token, file);
                            if (error) {
                              setFileStatus("Upload failed. Please try again.");
                              return;
                            }
                            setDraft((d) => {
                              const current = findDownloadMarkers(d.body)[i];
                              if (!current) return d;
                              return {
                                ...d,
                                body: replaceMarkerAt(
                                  d.body,
                                  current.index,
                                  current.raw.length,
                                  buildMarker(res.path, file.name, file.size),
                                ),
                              };
                            });
                            setFileStatus(`Attached ${file.name}.`);
                          } catch {
                            setFileStatus("Upload failed. Please try again.");
                          }
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
            {fileStatus ? (
              <p className="mt-2 text-sm text-muted-foreground">{fileStatus}</p>
            ) : null}
          </div>


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
