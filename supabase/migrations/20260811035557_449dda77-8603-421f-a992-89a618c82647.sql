CREATE TABLE public.ai_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tool text NOT NULL,
  vendor text,
  language text,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  duration_ms integer,
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.ai_requests TO authenticated;
GRANT ALL ON public.ai_requests TO service_role;

ALTER TABLE public.ai_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_requests_insert_own ON public.ai_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY ai_requests_select_own ON public.ai_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY ai_requests_select_admin ON public.ai_requests
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX ai_requests_created_at_idx ON public.ai_requests (created_at DESC);
CREATE INDEX ai_requests_user_idx ON public.ai_requests (user_id, created_at DESC);
CREATE INDEX ai_requests_tool_idx ON public.ai_requests (tool, created_at DESC);

CREATE TABLE public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target text,
  details text,
  status text NOT NULL DEFAULT 'success',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.admin_audit_logs TO authenticated;
GRANT ALL ON public.admin_audit_logs TO service_role;

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_insert_admin ON public.admin_audit_logs
  FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role) AND actor_id = auth.uid());
CREATE POLICY audit_select_admin ON public.admin_audit_logs
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX admin_audit_logs_created_at_idx ON public.admin_audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS app_events_created_at_idx ON public.app_events (created_at DESC);
CREATE INDEX IF NOT EXISTS app_events_user_created_idx ON public.app_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS app_events_type_created_idx ON public.app_events (event_type, created_at DESC);