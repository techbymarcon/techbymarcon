import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import cover1 from "@/assets/cover-1.jpg";
import cover2 from "@/assets/cover-2.jpg";
import cover3 from "@/assets/cover-3.jpg";
import cover4 from "@/assets/cover-4.jpg";
import { deleteArticle, listArticles, upsertArticle } from "./content.functions";

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
  downloadUrl?: string;
  downloadName?: string;
  downloadSize?: number;
};

export const CATEGORIES = ["Guides", "Downloads", "Android", "Design", "Tools"];

const COVERS: Record<string, string> = {
  "cover-1": cover1,
  "cover-2": cover2,
  "cover-3": cover3,
  "cover-4": cover4,
};

export const coverSrc = (cover: string) => COVERS[cover] ?? cover;

type Row = {
  id: string;
  title: string;
  description: string;
  body: string;
  category: string;
  date: string;
  reading_time: string;
  cover: string;
  featured: boolean;
  download_url?: string;
  download_name?: string;
  download_size?: number;
};

const fromRow = (r: Row): Article => ({
  id: r.id,
  title: r.title,
  description: r.description,
  body: r.body,
  category: r.category,
  date: r.date,
  readingTime: r.reading_time,
  cover: coverSrc(r.cover),
  featured: r.featured,
  downloadUrl: r.download_url ?? "",
  downloadName: r.download_name ?? "",
  downloadSize: r.download_size ?? 0,
});

const Ctx = createContext<{
  articles: Article[];
  loading: boolean;
  save: (a: Article) => Promise<void>;
  remove: (id: string) => Promise<void>;
}>({ articles: [], loading: true, save: async () => {}, remove: async () => {} });

export function ArticlesProvider({ children }: { children: ReactNode }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const rows = (await listArticles()) as unknown as Row[];
    setArticles(rows.map(fromRow));
    setLoading(false);
  };

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, []);

  return (
    <Ctx.Provider
      value={{
        articles,
        loading,
        save: async (a) => {
          await upsertArticle({
            data: {
              id: a.id,
              title: a.title,
              description: a.description,
              body: a.body,
              category: a.category,
              date: a.date,
              readingTime: a.readingTime,
              cover: a.cover,
              featured: a.featured ?? false,
              downloadUrl: a.downloadUrl ?? "",
              downloadName: a.downloadName ?? "",
              downloadSize: a.downloadSize ?? 0,
            },
          });
          await refresh();
        },
        remove: async (id) => {
          await deleteArticle({ data: { id } });
          await refresh();
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
