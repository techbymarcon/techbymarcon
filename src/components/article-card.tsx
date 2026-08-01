import { Link } from "@tanstack/react-router";
import { formatDate, type Article } from "@/lib/articles";
import { Icon } from "@/components/m3";
import { cn } from "@/lib/utils";

export function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-primary-container px-3 py-1 text-xs font-medium text-on-primary-container">
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
        "card-hover group block overflow-hidden rounded-3xl bg-surface-container elevation-1",
        className,
      )}
    >
      <div className={cn("overflow-hidden", large ? "aspect-[16/9]" : "aspect-[16/10]")}>
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
            "font-display font-medium leading-tight",
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
