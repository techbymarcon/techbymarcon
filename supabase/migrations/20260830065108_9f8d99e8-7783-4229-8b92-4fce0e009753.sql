CREATE TABLE public.article_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_email text NOT NULL,
  requester_handle text NOT NULL DEFAULT '',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Guides',
  cover text NOT NULL DEFAULT '',
  reading_time text NOT NULL DEFAULT '5 min read',
  download_url text NOT NULL DEFAULT '',
  download_name text NOT NULL DEFAULT '',
  download_size bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  review_note text NOT NULL DEFAULT '',
  reviewed_by text NOT NULL DEFAULT '',
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.article_requests TO service_role;

ALTER TABLE public.article_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct client access to article requests"
  ON public.article_requests FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE TRIGGER update_article_requests_updated_at
  BEFORE UPDATE ON public.article_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX article_requests_status_idx ON public.article_requests (status, created_at DESC);