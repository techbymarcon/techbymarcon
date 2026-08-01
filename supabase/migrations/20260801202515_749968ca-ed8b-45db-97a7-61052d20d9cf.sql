CREATE TABLE public.articles (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Guides',
  date date NOT NULL DEFAULT current_date,
  reading_time text NOT NULL DEFAULT '5 min read',
  cover text NOT NULL DEFAULT '',
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.articles TO anon;
GRANT SELECT ON public.articles TO authenticated;
GRANT ALL ON public.articles TO service_role;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Articles are publicly readable" ON public.articles FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.site_content (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_content TO anon;
GRANT SELECT ON public.site_content TO authenticated;
GRANT ALL ON public.site_content TO service_role;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Site content is publicly readable" ON public.site_content FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.articles (id, title, description, body, category, date, reading_time, cover, featured) VALUES
('material-you-guide','Building a Material You theme from scratch','A complete walkthrough of dynamic color, tonal palettes and how to apply them to a real product.','Material You puts color at the center of the experience. In this guide I walk through generating a tonal palette from a source color, mapping the roles to your components, and validating contrast in both light and dark themes.

We finish with a downloadable token file you can drop straight into your project.','Design','2026-07-24','8 min read','cover-1',true),
('download-pack','My complete downloads pack for 2026','Every script, wallpaper and config file I use daily, bundled in one archive.','This pack collects the tools I rely on: shell scripts, ADB helpers, icon packs and my editor configuration. Each folder has a short README explaining what it does and how to install it.','Downloads','2026-07-11','4 min read','cover-2',false),
('android-tuning','Tuning Android for speed without root','Practical settings, developer options and app choices that actually make a difference.','Most speed guides recommend placebo tweaks. Here are the changes with measurable impact: animation scales, background limits, cache behaviour and picking lighter apps for the jobs you do most.','Android','2026-06-28','6 min read','cover-3',false),
('workstation','The laptop setup I use for writing guides','Hardware, dotfiles and the small automations that keep everything in sync.','A tour of my workstation: the machine, the terminal setup, how notes sync across devices, and the backup routine that has saved me more than once.','Tools','2026-06-09','5 min read','cover-4',false),
('flashing-basics','Flashing custom ROMs: the safe checklist','Bootloaders, backups and recovery — everything to verify before you start.','Flashing is safe when you prepare. This checklist covers unlocking, verifying build hashes, making a full backup and knowing exactly how to recover if the first boot fails.','Guides','2026-05-30','9 min read','cover-1',false),
('motion-that-feels-right','Motion that feels right: easing in practice','Why 300ms and cubic-bezier(.2,0,.2,1) show up everywhere in Google products.','Motion communicates hierarchy. I break down the standard easing curves, when to use emphasized motion, and how to keep transitions readable instead of flashy.','Design','2026-05-14','7 min read','cover-2',false);

INSERT INTO public.site_content (key, value) VALUES ('main', '{}'::jsonb);