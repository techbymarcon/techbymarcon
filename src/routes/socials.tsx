import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Icon, M3Button } from "@/components/m3";
import { Reveal } from "@/components/reveal";
import { Linkify } from "@/components/linkify";
import { EditToolbar, Field } from "@/components/editable";
import { useAuth } from "@/lib/auth";
import { newId, TONES, useSiteContent, type SiteContent } from "@/lib/site-content";

export const Route = createFileRoute("/socials")({
  head: () => ({
    meta: [
      { title: "Socials — Tech by Marcon" },
      { name: "description", content: "Follow Tech by Marcon across platforms." },
      { property: "og:title", content: "Socials — Tech by Marcon" },
      { property: "og:description", content: "Follow Tech by Marcon across platforms." },
    ],
  }),
  component: Socials,
});

function Socials() {
  const { isDeveloper } = useAuth();
  const { content, update, reset } = useSiteContent();
  const [editing, setEditing] = useState(false);
  const socials = content.socials;

  const patch = (next: Partial<SiteContent["socials"]>) =>
    update({ ...content, socials: { ...socials, ...next } });

  const patchItem = (id: string, next: Partial<SiteContent["socials"]["items"][number]>) =>
    patch({ items: socials.items.map((s) => (s.id === id ? { ...s, ...next } : s)) });

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
                  items: [
                    ...socials.items,
                    {
                      id: newId(),
                      name: "New link",
                      handle: "@handle",
                      icon: "link",
                      url: "https://",
                      tone: TONES[0] ?? "bg-primary-container text-on-primary-container",
                    },
                  ],
                })
              }
            >
              <Icon name="add" className="text-[20px]" />
              Add social
            </M3Button>
          )}
        </EditToolbar>
      )}

      {editing ? (
        <div className="grid gap-4">
          <Field label="Heading" value={socials.heading} onChange={(v) => patch({ heading: v })} />
          <Field
            label="Intro"
            multiline
            value={socials.intro}
            onChange={(v) => patch({ intro: v })}
          />
        </div>
      ) : (
        <Reveal>
          <h1 className="font-display text-[36px] leading-tight font-medium md:text-[48px] lg:text-[72px]">
            {socials.heading}
          </h1>
          <p className="mt-6 max-w-xl text-[18px] leading-relaxed text-muted-foreground">
            <Linkify text={socials.intro} />
          </p>
        </Reveal>
      )}

      {!editing && socials.items.length === 0 ? (
        <Reveal delay={80}>
          <div className="mt-12 surface-sheen rounded-[28px] border border-border/60 glass p-8 text-center">
            <Icon name="link_off" className="text-[28px] text-muted-foreground" />
            <p className="mt-2 text-[16px] text-muted-foreground">No links here yet.</p>
          </div>
        </Reveal>
      ) : null}

      <div className={`grid gap-5 sm:grid-cols-2 ${socials.items.length ? "mt-12" : ""}`}>

        {socials.items.map((s, i) =>
          editing ? (
            <div key={s.id} className="grid gap-3 rounded-3xl bg-surface-container p-5 elevation-1">
              <Field label="Name" value={s.name} onChange={(v) => patchItem(s.id, { name: v })} />
              <Field
                label="Handle"
                value={s.handle}
                onChange={(v) => patchItem(s.id, { handle: v })}
              />
              <Field
                label="Icon (Material Symbol)"
                value={s.icon}
                onChange={(v) => patchItem(s.id, { icon: v })}
              />
              <Field label="URL" value={s.url} onChange={(v) => patchItem(s.id, { url: v })} />
              <div>
                <span className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
                  Color
                </span>
                <div className="flex gap-2">
                  {TONES.map((t) => (
                    <button
                      key={t}
                      onClick={() => patchItem(s.id, { tone: t })}
                      aria-label="Set color"
                      className={`size-10 rounded-2xl ${t} ${
                        s.tone === t ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                      }`}
                    />
                  ))}
                </div>
              </div>
              <M3Button
                variant="text"
                className="justify-self-start"
                onClick={() => patch({ items: socials.items.filter((x) => x.id !== s.id) })}
              >
                <Icon name="delete" className="text-[20px]" />
                Remove
              </M3Button>
            </div>
          ) : (
            <Reveal key={s.id} delay={i * 80}>
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="card-hover surface-sheen flex items-center gap-4 rounded-[28px] border border-border/60 glass p-6 elevation-1"
              >
                <span className={`grid size-14 shrink-0 place-items-center rounded-2xl ${s.tone}`}>
                  <Icon name={s.icon} filled />
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-[20px] font-medium">{s.name}</span>
                  <span className="block truncate text-[15px] text-muted-foreground">
                    {s.handle}
                  </span>
                </span>
                <Icon name="arrow_outward" className="ml-auto text-muted-foreground" />
              </a>
            </Reveal>
          ),
        )}
      </div>
    </div>
  );
}
