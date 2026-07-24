CREATE TABLE public.saved_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool TEXT NOT NULL,
  title TEXT NOT NULL,
  vendor TEXT,
  language TEXT,
  prompt TEXT NOT NULL,
  output TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_projects TO authenticated;
GRANT ALL ON public.saved_projects TO service_role;

ALTER TABLE public.saved_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_projects_select_own" ON public.saved_projects
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "saved_projects_insert_own" ON public.saved_projects
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "saved_projects_update_own" ON public.saved_projects
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "saved_projects_delete_own" ON public.saved_projects
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER saved_projects_set_updated_at
  BEFORE UPDATE ON public.saved_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX saved_projects_user_created_idx ON public.saved_projects (user_id, created_at DESC);