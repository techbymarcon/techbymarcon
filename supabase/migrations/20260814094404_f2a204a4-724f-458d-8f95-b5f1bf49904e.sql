CREATE TABLE public.account_sanctions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('ban','timeout','warning')),
  reason text NOT NULL DEFAULT '',
  issued_by text NOT NULL DEFAULT '',
  expires_at timestamp with time zone,
  lifted boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.account_sanctions TO service_role;

ALTER TABLE public.account_sanctions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct client access to account sanctions"
ON public.account_sanctions FOR ALL
TO anon, authenticated
USING (false) WITH CHECK (false);

CREATE INDEX account_sanctions_username_idx ON public.account_sanctions (username);

CREATE TRIGGER update_account_sanctions_updated_at
BEFORE UPDATE ON public.account_sanctions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();