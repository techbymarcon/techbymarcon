import { createFileRoute, Link } from "@tanstack/react-router";
import heroImage from "@/assets/hero.jpg";
import { useArticles } from "@/lib/articles";
import { ArticleCard } from "@/components/article-card";
import { Icon, M3Button } from "@/components/m3";
import { Reveal } from "@/components/reveal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tech by Marcon — Guides, downloads and links" },
      {
        name: "description",
        content:
          "Find the downloads and links of my guides: Android tuning, Material Design, tools and more.",
      },
      { property: "og:title", content: "Tech by Marcon — Guides, downloads and links" },
      {
        property: "og:description",
        content: "Find the downloads and links of my guides.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { articles } = useArticles();
  const featured = articles.find((a) => a.featured) ?? articles[0];
  const rest = articles.filter((a) => a.id !== featured?.id).slice(0, 4);

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-10 md:px-12 md:py-20">
      <section className="reveal in-view">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">
          <Icon name="auto_awesome" className="text-[18px]" />
          Updated weekly
        </p>
        <h1 className="font-display text-[36px] leading-[1.05] font-medium tracking-tight md:text-[48px] lg:text-[72px]">
          Tech by Marcon
        </h1>
        <p className="mt-5 max-w-xl text-[18px] leading-relaxed text-muted-foreground">
          Find the downloads and links of my guides.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/articles">
            <M3Button variant="filled">
              View Articles
              <Icon name="arrow_forward" className="text-[20px]" />
            </M3Button>
          </Link>
          <Link to="/about">
            <M3Button variant="outlined">About me</M3Button>
          </Link>
        </div>
      </section>

      <Reveal delay={120} className="mt-12">
        <img
          src={heroImage}
          alt="Pastel Material Design shapes"
          width={1600}
          height={1000}
          className="h-[220px] w-full rounded-[32px] object-cover elevation-2 md:h-[420px]"
        />
      </Reveal>

      {featured ? (
        <section className="mt-20">
          <Reveal>
            <h2 className="font-display text-[28px] font-medium md:text-[40px]">Featured</h2>
          </Reveal>
          <Reveal delay={80} className="mt-6">
            <ArticleCard article={featured} large />
          </Reveal>
        </section>
      ) : null}

      <section className="mt-20">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-[28px] font-medium md:text-[40px]">Latest articles</h2>
            <Link to="/articles">
              <M3Button variant="text">
                See all
                <Icon name="chevron_right" className="text-[20px]" />
              </M3Button>
            </Link>
          </div>
        </Reveal>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {rest.map((a, i) => (
            <Reveal key={a.id} delay={i * 80}>
              <ArticleCard article={a} className="h-full" />
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
