CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  kind text NOT NULL DEFAULT 'system',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  link text NOT NULL DEFAULT '',
  actor_handle text NOT NULL DEFAULT '',
  actor_avatar text NOT NULL DEFAULT '',
  actor_tier text NOT NULL DEFAULT 'blue',
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX notifications_recipient_idx ON public.notifications (recipient_email, created_at DESC);

GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct client access to notifications"
  ON public.notifications FOR ALL
  TO anon, authenticated
  USING (false) WITH CHECK (false);