import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import heroBanner from "@/assets/hero-banner.png.asset.json";
import heroBannerDark from "@/assets/hero-banner-dark.png.asset.json";
import githubBadge from "@/assets/get-it-on-github.png.asset.json";
import { useArticles } from "@/lib/articles";
import { useTheme } from "@/lib/theme";
import { ArticleCard } from "@/components/article-card";
import { Icon, M3Button } from "@/components/m3";
import { Reveal } from "@/components/reveal";
import { VerifiedInfo } from "@/components/verified";
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
          <Field
            label="Download caption"
            value={home.downloadCaption}
            onChange={(v) => patch({ downloadCaption: v })}
          />
          <Field label="APK link" value={home.apkUrl} onChange={(v) => patch({ apkUrl: v })} />
        </section>
      ) : (
        <section className="reveal in-view">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">
            <Icon name="auto_awesome" className="text-[18px]" />
            {home.badge}
          </p>
          <h1 className="font-display text-[36px] leading-[1.05] font-medium tracking-tight md:text-[48px] lg:text-[72px]">
            {home.title}
          </h1>
          <p className="mt-5 max-w-xl text-[18px] leading-relaxed text-muted-foreground">
            {home.intro}
          </p>
          <div className="mt-8 flex flex-wrap items-start gap-4">
            <Link to="/articles">
              <M3Button variant="filled">
                {home.articlesLabel}
                <Icon name="arrow_forward" className="text-[20px]" />
              </M3Button>
            </Link>
            <div className="flex flex-col items-start gap-2">
              <a
                href={home.apkUrl}
                download="TechByMarcon_App_v1.0.0.apk"
                className="m3-transition inline-block hover:opacity-85"
              >
                <img
                  src={githubBadge.url}
                  alt="Get it on GitHub — download the Tech by Marcon app"
                  width={646}
                  height={250}
                  className="h-[52px] w-auto"
                />
              </a>
              <span className="text-[15px] text-muted-foreground">{home.downloadCaption}</span>
            </div>
          </div>
        </section>
      )}


      <Reveal delay={120} className="mt-12">
        <img
          src={bannerSrc}
          alt="Tech by Marcon banner"
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

      <section className={`mt-20 grid gap-6 ${session ? "" : "md:grid-cols-2"}`}>
        <Reveal>
          <VerifiedInfo className="h-full" />
        </Reveal>
        {session ? null : (
        <Reveal delay={80}>
          <div className="flex h-full flex-col justify-center rounded-[28px] bg-accent p-6 text-accent-foreground md:p-7">
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
