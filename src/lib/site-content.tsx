import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { getSiteContent, saveSiteContent } from "./content.functions";

export type Sprite = { id: string; icon: string; title: string; body: string };
export type Social = {
  id: string;
  name: string;
  handle: string;
  icon: string;
  url: string;
  tone: string;
};

export type SiteContent = {
  about: {
    heading: string;
    intro: string;
    sprites: Sprite[];
    ctaTitle: string;
    ctaBody: string;
    ctaLabel: string;
    ctaEmail: string;
  };
  socials: {
    heading: string;
    intro: string;
    items: Social[];
  };
};

export const TONES: string[] = [
  "bg-primary-container text-on-primary-container",
  "bg-secondary-container text-on-secondary-container",
  "bg-tertiary-container text-on-tertiary-container",
  "bg-accent text-accent-foreground",
];

export const defaultContent: SiteContent = {
  about: {
    heading: "About",
    intro:
      "I'm Marcon. I write practical technology guides and publish the files, scripts and links that go with them. Everything here is tested on my own devices before it's published — no filler, no placebo tweaks.",
    sprites: [
      {
        id: "writing",
        icon: "edit_note",
        title: "Writing",
        body: "Long-form guides about Android, tools and design.",
      },
      {
        id: "downloads",
        icon: "download",
        title: "Downloads",
        body: "Every guide ships with the files you need.",
      },
      {
        id: "design",
        icon: "palette",
        title: "Design",
        body: "Material 3 is my default language for interfaces.",
      },
    ],
    ctaTitle: "Want to collaborate?",
    ctaBody: "I'm open to guest guides, tool reviews and translation of my articles.",
    ctaLabel: "Get in touch",
    ctaEmail: "hello@techbymarcon.dev",
  },
  socials: {
    heading: "Socials",
    intro:
      "New guides get announced here first. Downloads are mirrored on GitHub and Telegram.",
    items: [
      {
        id: "youtube",
        name: "YouTube",
        handle: "@techbymarcon",
        icon: "smart_display",
        url: "https://youtube.com",
        tone: "bg-tertiary-container text-on-tertiary-container",
      },
      {
        id: "github",
        name: "GitHub",
        handle: "marcon",
        icon: "code",
        url: "https://github.com",
        tone: "bg-primary-container text-on-primary-container",
      },
      { id: "x", name: "X", handle: "@marcon", icon: "tag", url: "https://x.com", tone: "bg-secondary-container text-on-secondary-container" },
      {
        id: "telegram",
        name: "Telegram",
        handle: "techbymarcon",
        icon: "send",
        url: "https://telegram.org",
        tone: "bg-accent text-accent-foreground",
      },
    ],
  },
};

const Ctx = createContext<{
  content: SiteContent;
  update: (next: SiteContent) => void;
  reset: () => void;
}>({ content: defaultContent, update: () => {}, reset: () => {} });

const merge = (parsed: Partial<SiteContent>): SiteContent => ({
  about: { ...defaultContent.about, ...parsed.about },
  socials: { ...defaultContent.socials, ...parsed.socials },
});

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<SiteContent>(defaultContent);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getSiteContent()
      .then((res) => setContent(merge(JSON.parse(res.json) as Partial<SiteContent>)))
      .catch(() => {
        /* keep defaults */
      });
  }, []);

  const push = (next: SiteContent) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      saveSiteContent({ data: { json: JSON.stringify(next) } }).catch(() => {
        /* not authorised */
      });
    }, 500);
  };

  return (
    <Ctx.Provider
      value={{
        content,
        update: (next) => {
          setContent(next);
          push(next);
        },
        reset: () => {
          setContent(defaultContent);
          push(defaultContent);
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useSiteContent = () => useContext(Ctx);

export const newId = () => Math.random().toString(36).slice(2, 9);
