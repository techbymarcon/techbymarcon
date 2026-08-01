-- Explicitly remove any client-side write privileges; writes go through the trusted server only.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.articles FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.site_content FROM anon, authenticated;

GRANT SELECT ON public.articles TO anon, authenticated;
GRANT SELECT ON public.site_content TO anon, authenticated;
GRANT ALL ON public.articles TO service_role;
GRANT ALL ON public.site_content TO service_role;

-- Explicit deny policies for client roles (service_role bypasses RLS).
DROP POLICY IF EXISTS "No client inserts on articles" ON public.articles;
CREATE POLICY "No client inserts on articles" ON public.articles FOR INSERT TO anon, authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "No client updates on articles" ON public.articles;
CREATE POLICY "No client updates on articles" ON public.articles FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "No client deletes on articles" ON public.articles;
CREATE POLICY "No client deletes on articles" ON public.articles FOR DELETE TO anon, authenticated USING (false);

DROP POLICY IF EXISTS "No client inserts on site content" ON public.site_content;
CREATE POLICY "No client inserts on site content" ON public.site_content FOR INSERT TO anon, authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "No client updates on site content" ON public.site_content;
CREATE POLICY "No client updates on site content" ON public.site_content FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "No client deletes on site content" ON public.site_content;
CREATE POLICY "No client deletes on site content" ON public.site_content FOR DELETE TO anon, authenticated USING (false);