import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { getSiteContent, saveSiteContent } from "./content.functions";

export type Social = {
  id: string;
  name: string;
  handle: string;
  icon: string;
  url: string;
  tone: string;
};

export type SiteContent = {
  home: {
    badge: string;
    title: string;
    intro: string;
    articlesLabel: string;
    downloadCaption: string;
    apkUrl: string;
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
  home: {
    badge: "Updated weekly",
    title: "Tech by Marcon",
    intro: "Find the downloads and links of my guides.",
    articlesLabel: "View Articles",
    downloadCaption: "Download the official app!",
    apkUrl: "/__l5e/assets-v1/9cfde75a-190b-44d4-84df-67fb9db49e57/TechByMarcon_App_v1.0.0.apk",
  },
  socials: {
    heading: "Socials",
    intro: "Follow Tech by Marcon across platforms.",
    items: [],
  },
};

const Ctx = createContext<{
  content: SiteContent;
  update: (next: SiteContent) => void;
  reset: () => void;
}>({ content: defaultContent, update: () => {}, reset: () => {} });

const merge = (parsed: Partial<SiteContent>): SiteContent => ({
  home: { ...defaultContent.home, ...parsed.home },
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
