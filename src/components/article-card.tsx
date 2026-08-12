import { Link } from "@tanstack/react-router";
import { formatDate, type Article } from "@/lib/articles";
import { Icon } from "@/components/m3";
import { cn } from "@/lib/utils";

export function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary-container/70 px-3 py-1 text-[11px] font-semibold tracking-[0.08em] text-on-primary-container uppercase">
      {category}
    </span>
  );
}

export function ArticleCard({
  article,
  large = false,
  className,
}: {
  article: Article;
  large?: boolean;
  className?: string;
}) {
  return (
    <Link
      to="/articles/$articleId"
      params={{ articleId: article.id }}
      className={cn(
        "card-hover surface-sheen group block overflow-hidden rounded-[28px] border border-border/60 bg-surface-container elevation-1",
        className,
      )}
    >
      <div className={cn("relative overflow-hidden", large ? "aspect-[16/9]" : "aspect-[16/10]")}>
        <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-surface-container/70 via-transparent to-transparent" />
        <img
          src={article.cover}
          alt={article.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(.2,0,.2,1)] group-hover:scale-105"
        />
      </div>
      <div className="space-y-3 p-6">
        <CategoryBadge category={article.category} />
        <h3
          className={cn(
            "font-display font-medium leading-tight tracking-tight m3-transition group-hover:text-gradient",
            large ? "text-[28px] md:text-[40px]" : "text-[22px] md:text-[28px]",
          )}
        >
          {article.title}
        </h3>
        <p className="text-[16px] leading-relaxed text-muted-foreground">{article.description}</p>
        <div className="flex items-center gap-3 pt-1 text-sm text-muted-foreground">
          <span>{formatDate(article.date)}</span>
          <span className="size-1 rounded-full bg-muted-foreground/50" />
          <span className="inline-flex items-center gap-1">
            <Icon name="schedule" className="text-[16px]" />
            {article.readingTime}
          </span>
        </div>
      </div>
    </Link>
  );
}
