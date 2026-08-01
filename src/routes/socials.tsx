import { createFileRoute } from "@tanstack/react-router";
import { Icon } from "@/components/m3";
import { Reveal } from "@/components/reveal";

export const Route = createFileRoute("/socials")({
  head: () => ({
    meta: [
      { title: "Socials — Tech by Marcon" },
      { name: "description", content: "Follow Tech by Marcon on YouTube, X, GitHub and Telegram." },
      { property: "og:title", content: "Socials — Tech by Marcon" },
      { property: "og:description", content: "Follow Tech by Marcon across platforms." },
    ],
  }),
  component: Socials,
});

const socials = [
  { name: "YouTube", handle: "@techbymarcon", icon: "smart_display", url: "https://youtube.com", tone: "bg-tertiary-container text-on-tertiary-container" },
  { name: "GitHub", handle: "marcon", icon: "code", url: "https://github.com", tone: "bg-primary-container text-on-primary-container" },
  { name: "X", handle: "@marcon", icon: "tag", url: "https://x.com", tone: "bg-secondary-container text-on-secondary-container" },
  { name: "Telegram", handle: "techbymarcon", icon: "send", url: "https://telegram.org", tone: "bg-accent text-accent-foreground" },
];

function Socials() {
  return (
    <div className="mx-auto max-w-[900px] px-5 py-12 md:px-12 md:py-20">
      <Reveal>
        <h1 className="font-display text-[36px] leading-tight font-medium md:text-[48px] lg:text-[72px]">
          Socials
        </h1>
        <p className="mt-6 max-w-xl text-[18px] leading-relaxed text-muted-foreground">
          New guides get announced here first. Downloads are mirrored on GitHub and Telegram.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-5 sm:grid-cols-2">
        {socials.map((s, i) => (
          <Reveal key={s.name} delay={i * 80}>
            <a
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="card-hover flex items-center gap-4 rounded-3xl bg-surface-container p-6 elevation-1"
            >
              <span className={`grid size-14 shrink-0 place-items-center rounded-2xl ${s.tone}`}>
                <Icon name={s.icon} filled />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-[20px] font-medium">{s.name}</span>
                <span className="block truncate text-[15px] text-muted-foreground">{s.handle}</span>
              </span>
              <Icon name="arrow_outward" className="ml-auto text-muted-foreground" />
            </a>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
