import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Icon, M3Button } from "@/components/m3";
import { Reveal } from "@/components/reveal";
import { Linkify } from "@/components/linkify";
import { EditToolbar, Field } from "@/components/editable";
import { useAuth } from "@/lib/auth";
import { newId, useSiteContent, type SiteContent } from "@/lib/site-content";

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

function About() {
  const { isDeveloper } = useAuth();
  const { content, update, reset } = useSiteContent();
  const [editing, setEditing] = useState(false);
  const about = content.about;

  const patch = (next: Partial<SiteContent["about"]>) =>
    update({ ...content, about: { ...about, ...next } });

  return (
    <div className="mx-auto max-w-[900px] px-5 py-12 md:px-12 md:py-20">
      {isDeveloper && (
        <EditToolbar editing={editing} onToggle={() => setEditing((v) => !v)} onReset={reset}>
          {editing && (
            <M3Button
              variant="tonal"
              className="h-11 px-5"
              onClick={() =>
                patch({
                  sprites: [
                    ...about.sprites,
                    { id: newId(), icon: "star", title: "New card", body: "Describe it." },
                  ],
                })
              }
            >
              <Icon name="add" className="text-[20px]" />
              Add sprite
            </M3Button>
          )}
        </EditToolbar>
      )}

      {editing ? (
        <div className="grid gap-4">
          <Field label="Heading" value={about.heading} onChange={(v) => patch({ heading: v })} />
          <Field label="Intro" value={about.intro} multiline onChange={(v) => patch({ intro: v })} />
        </div>
      ) : (
        <Reveal>
          <h1 className="font-display text-[36px] leading-tight font-medium md:text-[48px] lg:text-[72px]">
            {about.heading}
          </h1>
          <p className="mt-6 text-[18px] leading-relaxed text-muted-foreground">
            <Linkify text={about.intro} />
          </p>
        </Reveal>
      )}

      <div className="mt-12 grid gap-5 sm:grid-cols-3">
        {about.sprites.map((f, i) =>
          editing ? (
            <div key={f.id} className="grid gap-3 rounded-3xl bg-surface-container p-5 elevation-1">
              <Field
                label="Icon (Material Symbol)"
                value={f.icon}
                onChange={(v) =>
                  patch({
                    sprites: about.sprites.map((s) => (s.id === f.id ? { ...s, icon: v } : s)),
                  })
                }
              />
              <Field
                label="Title"
                value={f.title}
                onChange={(v) =>
                  patch({
                    sprites: about.sprites.map((s) => (s.id === f.id ? { ...s, title: v } : s)),
                  })
                }
              />
              <Field
                label="Body"
                multiline
                value={f.body}
                onChange={(v) =>
                  patch({
                    sprites: about.sprites.map((s) => (s.id === f.id ? { ...s, body: v } : s)),
                  })
                }
              />
              <M3Button
                variant="text"
                className="justify-self-start"
                onClick={() => patch({ sprites: about.sprites.filter((s) => s.id !== f.id) })}
              >
                <Icon name="delete" className="text-[20px]" />
                Remove
              </M3Button>
            </div>
          ) : (
            <Reveal key={f.id} delay={i * 90}>
              <div className="card-hover h-full rounded-3xl bg-surface-container p-6 elevation-1">
                <span className="grid size-12 place-items-center rounded-2xl bg-primary-container text-on-primary-container">
                  <Icon name={f.icon} />
                </span>
                <h2 className="mt-4 font-display text-[20px] font-medium">{f.title}</h2>
                <p className="mt-2 text-[16px] leading-relaxed text-muted-foreground">
                <Linkify text={f.body} />
              </p>
              </div>
            </Reveal>
          ),
        )}
      </div>

      {editing ? (
        <div className="mt-12 grid gap-4 rounded-[32px] bg-surface-container p-6 elevation-1">
          <Field label="CTA title" value={about.ctaTitle} onChange={(v) => patch({ ctaTitle: v })} />
          <Field
            label="CTA body"
            multiline
            value={about.ctaBody}
            onChange={(v) => patch({ ctaBody: v })}
          />
          <Field
            label="Button label"
            value={about.ctaLabel}
            onChange={(v) => patch({ ctaLabel: v })}
          />
          <Field label="Email" value={about.ctaEmail} onChange={(v) => patch({ ctaEmail: v })} />
        </div>
      ) : (
        <Reveal delay={120}>
          <div className="mt-12 rounded-[32px] bg-secondary-container p-8 text-on-secondary-container md:p-12">
            <h2 className="font-display text-[28px] font-medium md:text-[40px]">
              {about.ctaTitle}
            </h2>
            <p className="mt-3 max-w-lg text-[17px] leading-relaxed opacity-90"><Linkify text={about.ctaBody} /></p>
            <a href={`mailto:${about.ctaEmail}`} className="mt-6 inline-block">
              <M3Button variant="filled">
                <Icon name="mail" className="text-[20px]" />
                {about.ctaLabel}
              </M3Button>
            </a>
          </div>
        </Reveal>
      )}
    </div>
  );
}
