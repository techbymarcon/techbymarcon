ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS download_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS download_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS download_size bigint NOT NULL DEFAULT 0;