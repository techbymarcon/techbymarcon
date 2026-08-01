import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CategoryBadge } from "@/components/article-card";
import { ArticleEditor } from "@/components/article-editor";
import { Comments } from "@/components/comments";
import { Icon, M3Button } from "@/components/m3";
import { Reveal } from "@/components/reveal";
import { formatDate, useArticles } from "@/lib/articles";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/articles/$articleId")({
  head: () => ({
    meta: [
      { title: "Article — Tech by Marcon" },
      { name: "description", content: "Read this guide on Tech by Marcon." },
      { property: "og:title", content: "Article — Tech by Marcon" },
      { property: "og:description", content: "Read this guide on Tech by Marcon." },
    ],
  }),
  component: ArticlePage,
});

function ArticlePage() {
  const { articleId } = Route.useParams();
  const { articles, save, remove } = useArticles();
  const { isDeveloper } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const article = articles.find((a) => a.id === articleId);

  if (!article) {
    return (
      <div className="mx-auto max-w-[800px] px-5 py-24 text-center">
        <h1 className="font-display text-[28px] font-medium">Article not found</h1>
        <Link to="/articles" className="mt-6 inline-block">
          <M3Button variant="tonal">Back to articles</M3Button>
        </Link>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-[840px] px-5 py-10 md:px-12 md:py-16">
      <Link to="/articles">
        <M3Button variant="text" className="-ml-4">
          <Icon name="arrow_back" className="text-[20px]" />
          Articles
        </M3Button>
      </Link>

      <Reveal className="mt-6">
        <CategoryBadge category={article.category} />
        <h1 className="mt-4 font-display text-[32px] leading-tight font-medium md:text-[48px]">
          {article.title}
        </h1>
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
          <AuthorByline />
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{formatDate(article.date)}</span>
            <span className="size-1 rounded-full bg-muted-foreground/50" />
            <span>{article.readingTime}</span>
          </div>
        </div>
        <img
          src={article.cover}
          alt={article.title}
          className="mt-8 aspect-[16/9] w-full rounded-[32px] object-cover elevation-2"
        />
        <div className="mt-8 space-y-5 text-[18px] leading-[1.75] text-foreground/90">
          {article.body.split("\n").filter(Boolean).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </Reveal>

      {isDeveloper ? (
        <div className="mt-12 flex flex-wrap gap-3 rounded-[28px] bg-surface-container p-5 elevation-1">
          <span className="mr-auto inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Icon name="build" className="text-[18px]" />
            Developer mode
          </span>
          <M3Button variant="tonal" onClick={() => setEditing(true)}>
            <Icon name="edit" className="text-[20px]" />
            Edit
          </M3Button>
          <M3Button
            variant="outlined"
            className="border-destructive text-destructive"
            onClick={() => {
              remove(article.id);
              navigate({ to: "/articles" });
            }}
          >
            <Icon name="delete" className="text-[20px]" />
            Delete
          </M3Button>
        </div>
      ) : null}

      {editing ? (
        <ArticleEditor
          initial={article}
          onClose={() => setEditing(false)}
          onSave={(a) => {
            save(a);
            setEditing(false);
            if (a.id !== article.id) navigate({ to: "/articles" });
          }}
        />
      ) : null}

      <Comments articleId={article.id} />
    </article>
  );
}
