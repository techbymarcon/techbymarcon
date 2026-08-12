import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArticleCard } from "@/components/article-card";
import { ArticleEditor } from "@/components/article-editor";
import { Icon, M3Button } from "@/components/m3";
import { Reveal } from "@/components/reveal";
import { CATEGORIES, useArticles } from "@/lib/articles";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/articles/")({
  head: () => ({
    meta: [
      { title: "Articles — Tech by Marcon" },
      {
        name: "description",
        content: "Browse every guide, download and tutorial published on Tech by Marcon.",
      },
      { property: "og:title", content: "Articles — Tech by Marcon" },
      { property: "og:description", content: "Browse every guide and download." },
    ],
  }),
  component: Articles,
});

function Articles() {
  const { articles, save } = useArticles();
  const { isDeveloper } = useAuth();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [editing, setEditing] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") searchRef.current?.blur();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter(
      (a) =>
        (category === "All" || a.category === category) &&
        (!q ||
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q)),
    );
  }, [articles, query, category]);

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-12 md:px-12 md:py-20">
      <Reveal>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Library
            </p>
            <h1 className="min-w-0 font-display text-[38px] leading-tight font-medium tracking-tight md:text-[54px]">
              <span className="text-gradient">Articles</span>
            </h1>
          </div>
          {isDeveloper ? (
            <M3Button variant="tonal" className="shrink-0" onClick={() => setEditing(true)}>
              <Icon name="add" className="text-[20px]" />
              New
            </M3Button>
          ) : null}
        </div>
      </Reveal>

      <Reveal delay={60}>
        <label className="mt-8 flex items-center gap-3 rounded-[28px] border border-border/60 glass px-5 py-4 elevation-1 m3-transition focus-within:elevation-2">
          <Icon name="search" className="text-muted-foreground" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles"
            className="w-full bg-transparent text-[16px] outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground sm:block">
            /
          </kbd>
        </label>
      </Reveal>

      <Reveal delay={100}>
        <div className="mt-6 flex flex-wrap gap-2">
          {["All", ...CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "ripple-host m3-transition rounded-full border px-4 py-2 text-sm font-medium",
                category === c
                  ? "border-transparent bg-secondary-container text-on-secondary-container elevation-1"
                  : "border-border text-muted-foreground hover:bg-foreground/5",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </Reveal>

      {filtered.length === 0 ? (
        <p className="mt-16 text-center text-[17px] text-muted-foreground">
          No articles match your search.
        </p>
      ) : (
        <div className="mt-10 gap-6 md:columns-2 lg:columns-3 [&>*]:mb-6 [&>*]:break-inside-avoid">
          {filtered.map((a, i) => (
            <Reveal key={a.id} delay={Math.min(i, 5) * 70}>
              <ArticleCard article={a} />
            </Reveal>
          ))}
        </div>
      )}

      {editing ? (
        <ArticleEditor
          onClose={() => setEditing(false)}
          onSave={(a) => {
            save(a);
            setEditing(false);
          }}
        />
      ) : null}
    </div>
  );
}
