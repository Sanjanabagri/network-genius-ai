REVOKE EXECUTE ON FUNCTION public.is_team_member(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.team_role_of(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_manage_team(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated;