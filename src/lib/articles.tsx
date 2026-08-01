import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import cover1 from "@/assets/cover-1.jpg";
import cover2 from "@/assets/cover-2.jpg";
import cover3 from "@/assets/cover-3.jpg";
import cover4 from "@/assets/cover-4.jpg";

export type Article = {
  id: string;
  title: string;
  description: string;
  body: string;
  category: string;
  date: string;
  readingTime: string;
  cover: string;
  featured?: boolean;
};

export const CATEGORIES = ["Guides", "Downloads", "Android", "Design", "Tools"];

const seed: Article[] = [
  {
    id: "material-you-guide",
    title: "Building a Material You theme from scratch",
    description:
      "A complete walkthrough of dynamic color, tonal palettes and how to apply them to a real product.",
    body: "Material You puts color at the center of the experience. In this guide I walk through generating a tonal palette from a source color, mapping the roles to your components, and validating contrast in both light and dark themes.\n\nWe finish with a downloadable token file you can drop straight into your project.",
    category: "Design",
    date: "2026-07-24",
    readingTime: "8 min read",
    cover: cover1,
    featured: true,
  },
  {
    id: "download-pack",
    title: "My complete downloads pack for 2026",
    description: "Every script, wallpaper and config file I use daily, bundled in one archive.",
    body: "This pack collects the tools I rely on: shell scripts, ADB helpers, icon packs and my editor configuration. Each folder has a short README explaining what it does and how to install it.",
    category: "Downloads",
    date: "2026-07-11",
    readingTime: "4 min read",
    cover: cover2,
  },
  {
    id: "android-tuning",
    title: "Tuning Android for speed without root",
    description: "Practical settings, developer options and app choices that actually make a difference.",
    body: "Most speed guides recommend placebo tweaks. Here are the changes with measurable impact: animation scales, background limits, cache behaviour and picking lighter apps for the jobs you do most.",
    category: "Android",
    date: "2026-06-28",
    readingTime: "6 min read",
    cover: cover3,
  },
  {
    id: "workstation",
    title: "The laptop setup I use for writing guides",
    description: "Hardware, dotfiles and the small automations that keep everything in sync.",
    body: "A tour of my workstation: the machine, the terminal setup, how notes sync across devices, and the backup routine that has saved me more than once.",
    category: "Tools",
    date: "2026-06-09",
    readingTime: "5 min read",
    cover: cover4,
  },
  {
    id: "flashing-basics",
    title: "Flashing custom ROMs: the safe checklist",
    description: "Bootloaders, backups and recovery — everything to verify before you start.",
    body: "Flashing is safe when you prepare. This checklist covers unlocking, verifying build hashes, making a full backup and knowing exactly how to recover if the first boot fails.",
    category: "Guides",
    date: "2026-05-30",
    readingTime: "9 min read",
    cover: cover1,
  },
  {
    id: "motion-that-feels-right",
    title: "Motion that feels right: easing in practice",
    description: "Why 300ms and cubic-bezier(.2,0,.2,1) show up everywhere in Google products.",
    body: "Motion communicates hierarchy. I break down the standard easing curves, when to use emphasized motion, and how to keep transitions readable instead of flashy.",
    category: "Design",
    date: "2026-05-14",
    readingTime: "7 min read",
    cover: cover2,
  },
];

const KEY = "tbm-articles";

const Ctx = createContext<{
  articles: Article[];
  save: (a: Article) => void;
  remove: (id: string) => void;
  reset: () => void;
}>({ articles: seed, save: () => {}, remove: () => {}, reset: () => {} });

export function ArticlesProvider({ children }: { children: ReactNode }) {
  const [articles, setArticles] = useState<Article[]>(seed);

  useEffect(() => {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      try {
        setArticles(JSON.parse(raw) as Article[]);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const persist = (next: Article[]) => {
    setArticles(next);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  };

  return (
    <Ctx.Provider
      value={{
        articles,
        save: (a) => {
          const exists = articles.some((x) => x.id === a.id);
          persist(exists ? articles.map((x) => (x.id === a.id ? a : x)) : [a, ...articles]);
        },
        remove: (id) => persist(articles.filter((x) => x.id !== id)),
        reset: () => {
          window.localStorage.removeItem(KEY);
          setArticles(seed);
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useArticles = () => useContext(Ctx);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
