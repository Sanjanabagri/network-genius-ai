CREATE TABLE public.app_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('login','page_view')),
  path text,
  referrer text,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX app_events_created_at_idx ON public.app_events (created_at DESC);
CREATE INDEX app_events_user_idx ON public.app_events (user_id, created_at DESC);
CREATE INDEX app_events_type_idx ON public.app_events (event_type, created_at DESC);

GRANT SELECT, INSERT ON public.app_events TO authenticated;
GRANT ALL ON public.app_events TO service_role;

ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_events_insert_own ON public.app_events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY app_events_select_own ON public.app_events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY app_events_select_admin ON public.app_events
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY profiles_select_admin ON public.profiles
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY roles_select_admin ON public.user_roles
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));