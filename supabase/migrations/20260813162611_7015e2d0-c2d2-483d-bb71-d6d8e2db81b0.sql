CREATE TABLE public.forum_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  voter_email text NOT NULL,
  value smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, voter_email)
);

CREATE INDEX forum_votes_post_id_idx ON public.forum_votes(post_id);

GRANT ALL ON public.forum_votes TO service_role;

ALTER TABLE public.forum_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct client access to forum votes"
ON public.forum_votes FOR ALL
TO anon, authenticated
USING (false) WITH CHECK (false);

CREATE TRIGGER update_forum_votes_updated_at
BEFORE UPDATE ON public.forum_votes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();