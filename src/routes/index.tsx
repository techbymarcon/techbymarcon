import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import heroBanner from "@/assets/hero-banner.png.asset.json";
import heroBannerDark from "@/assets/hero-banner-dark.png.asset.json";
import { useArticles } from "@/lib/articles";
import { useTheme } from "@/lib/theme";
import { ArticleCard } from "@/components/article-card";
import { Icon, M3Button } from "@/components/m3";
import { Reveal } from "@/components/reveal";
import { VerifiedInfo } from "@/components/verified";
import { BouncingText } from "@/components/bouncing-text";
import { EditToolbar, Field } from "@/components/editable";
import { useSiteContent, type SiteContent } from "@/lib/site-content";
import { useAuth } from "@/lib/auth";

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
        content: "Find the downloads and links of my guides: Android tuning, Material Design, tools and more.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { articles } = useArticles();
  const { theme } = useTheme();
  const { session, isDeveloper } = useAuth();
  const { content, update, reset } = useSiteContent();
  const [editing, setEditing] = useState(false);
  const home = content.home;
  const patch = (next: Partial<SiteContent["home"]>) =>
    update({ ...content, home: { ...home, ...next } });
  const featured = articles.find((a) => a.featured) ?? articles[0];
  const rest = articles.filter((a) => a.id !== featured?.id).slice(0, 4);
  const bannerSrc = theme === "dark" ? heroBannerDark.url : heroBanner.url;

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-10 md:px-12 md:py-20">
      {isDeveloper && (
        <EditToolbar editing={editing} onToggle={() => setEditing((v) => !v)} onReset={reset} />
      )}

      {editing ? (
        <section className="grid gap-4">
          <Field label="Badge" value={home.badge} onChange={(v) => patch({ badge: v })} />
          <Field label="Title" value={home.title} onChange={(v) => patch({ title: v })} />
          <Field label="Intro" multiline value={home.intro} onChange={(v) => patch({ intro: v })} />
          <Field
            label="Articles button label"
            value={home.articlesLabel}
            onChange={(v) => patch({ articlesLabel: v })}
          />
        </section>
      ) : (
        <section className="reveal in-view relative">
          <div className="grid-veil pointer-events-none absolute -inset-x-10 -top-16 h-[420px] -z-10" />
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border/70 glass px-4 py-2 text-[13px] font-medium tracking-wide text-foreground">
                <Icon name="auto_awesome" className="text-[18px] text-primary" />
                {home.badge}
              </p>
              <h1 className="font-display text-[42px] leading-[1.02] font-medium tracking-tight md:text-[60px] lg:text-[76px]">
                <BouncingText gradient>{home.title}</BouncingText>
              </h1>
              <p className="mt-6 max-w-xl text-[18px] leading-relaxed text-muted-foreground">
                {home.intro}
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link to="/articles">
                  <M3Button variant="filled">
                    {home.articlesLabel}
                    <Icon name="arrow_forward" className="text-[20px]" />
                  </M3Button>
                </Link>
                <span className="text-[14px] text-muted-foreground">
                  The app is almost done! Check back later.
                </span>
              </div>
              {articles.length > 0 ? (
                <dl className="mt-10 flex flex-wrap gap-8 border-t border-border/70 pt-6">
                  <div>
                    <dt className="text-[12px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                      Guides
                    </dt>
                    <dd className="font-display text-[26px] font-medium">{articles.length}</dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                      Focus
                    </dt>
                    <dd className="font-display text-[26px] font-medium">Android</dd>
                  </div>
                </dl>
              ) : null}

            </div>

            <div className="relative">
              <div className="surface-sheen overflow-hidden rounded-[36px] border border-border/60 glow-ring">
                <img
                  src={bannerSrc}
                  alt="Tech by Marcon banner"
                  width={1600}
                  height={1000}
                  className="h-[240px] w-full object-cover md:h-[380px]"
                />
              </div>
            </div>
          </div>
        </section>
      )}


      {featured ? (
        <section className="mt-20">
          <Reveal>
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-[image:var(--gradient-brand)]" />
              <h2 className="font-display text-[28px] font-medium tracking-tight md:text-[40px]">
                Featured
              </h2>
            </div>
          </Reveal>
          <Reveal delay={80} className="mt-6">
            <ArticleCard article={featured} large />
          </Reveal>
        </section>
      ) : null}

      <section className={`mt-20 grid gap-6 ${session ? "" : "md:grid-cols-2"}`}>
        <Reveal>
          <VerifiedInfo className="h-full" />
        </Reveal>
        {session ? null : (
        <Reveal delay={80}>
          <div className="flex h-full flex-col justify-center surface-sheen rounded-[28px] border border-border/60 bg-accent p-7 text-accent-foreground md:p-8">
            <h3 className="font-display text-[20px] font-medium">Join the conversation</h3>
            <p className="mt-2 text-[15px] leading-relaxed">
              Articles are open for comments. Sign in to pick a handle and a profile picture
              (animated GIFs included) and your blue check appears next to every comment.
            </p>
            <div className="mt-5">
              <Link to="/login">
                <M3Button variant="filled">Sign in</M3Button>
              </Link>
            </div>
          </div>
        </Reveal>
        )}
      </section>


      <section className="mt-20">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-[image:var(--gradient-brand)]" />
              <h2 className="font-display text-[28px] font-medium tracking-tight md:text-[40px]">
                Latest articles
              </h2>
            </div>
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
