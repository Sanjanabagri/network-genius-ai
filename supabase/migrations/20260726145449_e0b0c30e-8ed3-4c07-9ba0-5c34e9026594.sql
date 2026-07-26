-- Teams
CREATE TYPE public.team_role AS ENUM ('owner','admin','member','viewer');

CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.team_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.team_role NOT NULL DEFAULT 'member',
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, email)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_invites TO authenticated;
GRANT ALL ON public.team_invites TO service_role;
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- Security definer helpers (avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_team_member(_team_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.team_members WHERE team_id = _team_id AND user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.team_role_of(_team_id uuid, _user_id uuid)
RETURNS public.team_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.team_members WHERE team_id = _team_id AND user_id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_team(_team_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = _team_id AND user_id = _user_id AND role IN ('owner','admin')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_team_member(uuid, uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.team_role_of(uuid, uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_team(uuid, uuid) FROM public, anon;

-- teams policies
CREATE POLICY teams_select_member ON public.teams FOR SELECT TO authenticated
  USING (public.is_team_member(id, auth.uid()) OR created_by = auth.uid());
CREATE POLICY teams_insert_own ON public.teams FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY teams_update_manager ON public.teams FOR UPDATE TO authenticated
  USING (public.can_manage_team(id, auth.uid()));
CREATE POLICY teams_delete_owner ON public.teams FOR DELETE TO authenticated
  USING (public.team_role_of(id, auth.uid()) = 'owner');

-- team_members policies
CREATE POLICY tm_select_member ON public.team_members FOR SELECT TO authenticated
  USING (public.is_team_member(team_id, auth.uid()) OR user_id = auth.uid());
CREATE POLICY tm_insert ON public.team_members FOR INSERT TO authenticated
  WITH CHECK (
    public.can_manage_team(team_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.created_by = auth.uid())
  );
CREATE POLICY tm_update_manager ON public.team_members FOR UPDATE TO authenticated
  USING (public.can_manage_team(team_id, auth.uid()));
CREATE POLICY tm_delete ON public.team_members FOR DELETE TO authenticated
  USING (public.can_manage_team(team_id, auth.uid()) OR user_id = auth.uid());

-- team_invites policies
CREATE POLICY ti_select ON public.team_invites FOR SELECT TO authenticated
  USING (public.is_team_member(team_id, auth.uid()) OR lower(email) = lower(coalesce(auth.jwt() ->> 'email','')));
CREATE POLICY ti_insert_manager ON public.team_invites FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_team(team_id, auth.uid()) AND invited_by = auth.uid());
CREATE POLICY ti_update ON public.team_invites FOR UPDATE TO authenticated
  USING (public.can_manage_team(team_id, auth.uid()) OR lower(email) = lower(coalesce(auth.jwt() ->> 'email','')));
CREATE POLICY ti_delete_manager ON public.team_invites FOR DELETE TO authenticated
  USING (public.can_manage_team(team_id, auth.uid()));

CREATE TRIGGER teams_set_updated_at BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Share saved projects with a team (optional)
ALTER TABLE public.saved_projects ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;
CREATE INDEX saved_projects_team_idx ON public.saved_projects(team_id);

CREATE POLICY saved_projects_select_team ON public.saved_projects FOR SELECT TO authenticated
  USING (team_id IS NOT NULL AND public.is_team_member(team_id, auth.uid()));

-- Profiles: allow readable member directory inside a team
CREATE POLICY profiles_select_teammates ON public.profiles FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.team_members m1
    JOIN public.team_members m2 ON m1.team_id = m2.team_id
    WHERE m1.user_id = auth.uid() AND m2.user_id = profiles.id
  ));
