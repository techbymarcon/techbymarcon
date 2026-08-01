import { createFileRoute } from "@tanstack/react-router";
import { Icon, M3Button } from "@/components/m3";
import { Reveal } from "@/components/reveal";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Marcon — Tech by Marcon" },
      {
        name: "description",
        content: "Who is behind Tech by Marcon: guides, downloads and design notes.",
      },
      { property: "og:title", content: "About Marcon — Tech by Marcon" },
      { property: "og:description", content: "Who is behind Tech by Marcon." },
    ],
  }),
  component: About,
});

const facts = [
  { icon: "edit_note", title: "Writing", body: "Long-form guides about Android, tools and design." },
  { icon: "download", title: "Downloads", body: "Every guide ships with the files you need." },
  { icon: "palette", title: "Design", body: "Material 3 is my default language for interfaces." },
];

function About() {
  return (
    <div className="mx-auto max-w-[900px] px-5 py-12 md:px-12 md:py-20">
      <Reveal>
        <h1 className="font-display text-[36px] leading-tight font-medium md:text-[48px] lg:text-[72px]">
          About
        </h1>
        <p className="mt-6 text-[18px] leading-relaxed text-muted-foreground">
          I'm Marcon. I write practical technology guides and publish the files, scripts and links
          that go with them. Everything here is tested on my own devices before it's published — no
          filler, no placebo tweaks.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-5 sm:grid-cols-3">
        {facts.map((f, i) => (
          <Reveal key={f.title} delay={i * 90}>
            <div className="card-hover h-full rounded-3xl bg-surface-container p-6 elevation-1">
              <span className="grid size-12 place-items-center rounded-2xl bg-primary-container text-on-primary-container">
                <Icon name={f.icon} />
              </span>
              <h2 className="mt-4 font-display text-[20px] font-medium">{f.title}</h2>
              <p className="mt-2 text-[16px] leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={120}>
        <div className="mt-12 rounded-[32px] bg-secondary-container p-8 text-on-secondary-container md:p-12">
          <h2 className="font-display text-[28px] font-medium md:text-[40px]">Want to collaborate?</h2>
          <p className="mt-3 max-w-lg text-[17px] leading-relaxed opacity-90">
            I'm open to guest guides, tool reviews and translation of my articles.
          </p>
          <a href="mailto:hello@techbymarcon.dev" className="mt-6 inline-block">
            <M3Button variant="filled">
              <Icon name="mail" className="text-[20px]" />
              Get in touch
            </M3Button>
          </a>
        </div>
      </Reveal>
    </div>
  );
}
