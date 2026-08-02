ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS login_code text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_login_code_key ON public.profiles (login_code) WHERE login_code IS NOT NULL;