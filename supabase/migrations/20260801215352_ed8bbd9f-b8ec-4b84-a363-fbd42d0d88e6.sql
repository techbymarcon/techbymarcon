ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_hash text;

DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname, tablename FROM pg_policies
           WHERE schemaname = 'public' AND tablename IN ('profiles','comments')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
END $$;

REVOKE ALL ON public.profiles FROM anon, authenticated;
REVOKE ALL ON public.comments FROM anon, authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.comments TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct client access to profiles"
  ON public.profiles FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY "No direct client access to comments"
  ON public.comments FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
           WHERE schemaname = 'storage' AND tablename = 'objects'
             AND policyname = 'No direct client access to avatars'
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "No direct client access to avatars"
  ON storage.objects FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);