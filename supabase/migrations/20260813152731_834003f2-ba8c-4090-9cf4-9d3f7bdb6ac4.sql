CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  role text NOT NULL DEFAULT 'moderator',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (username, role)
);
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct client access to user roles" ON public.user_roles FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE TABLE public.forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_email text NOT NULL,
  handle text NOT NULL,
  display_name text NOT NULL,
  avatar_url text NOT NULL DEFAULT '',
  tier text NOT NULL DEFAULT 'blue',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  pinned boolean NOT NULL DEFAULT false,
  locked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.forum_posts TO service_role;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct client access to forum posts" ON public.forum_posts FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE TRIGGER update_forum_posts_updated_at BEFORE UPDATE ON public.forum_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX forum_posts_created_idx ON public.forum_posts (pinned DESC, created_at DESC);