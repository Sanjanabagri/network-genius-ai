-- 1) Restrict team invite email visibility to managers and the invited person
DROP POLICY IF EXISTS ti_select ON public.team_invites;
CREATE POLICY ti_select ON public.team_invites
FOR SELECT TO authenticated
USING (
  private.can_manage_team(team_id, auth.uid())
  OR lower(email) = lower(COALESCE((auth.jwt() ->> 'email'), ''))
);

-- 2) Lock down role assignments: no client-side writes at all
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon;
REVOKE ALL ON public.user_roles FROM anon;

DROP POLICY IF EXISTS roles_no_insert ON public.user_roles;
DROP POLICY IF EXISTS roles_no_update ON public.user_roles;
DROP POLICY IF EXISTS roles_no_delete ON public.user_roles;

CREATE POLICY roles_no_insert ON public.user_roles AS RESTRICTIVE FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY roles_no_update ON public.user_roles AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY roles_no_delete ON public.user_roles AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false);