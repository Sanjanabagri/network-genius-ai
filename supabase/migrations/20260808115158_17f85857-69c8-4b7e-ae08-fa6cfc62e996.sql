CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

ALTER FUNCTION public.is_team_member(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.can_manage_team(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.team_role_of(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA private;

ALTER FUNCTION private.is_team_member(uuid, uuid) SET search_path TO 'public';
ALTER FUNCTION private.can_manage_team(uuid, uuid) SET search_path TO 'public';
ALTER FUNCTION private.team_role_of(uuid, uuid) SET search_path TO 'public';
ALTER FUNCTION private.has_role(uuid, public.app_role) SET search_path TO 'public';

REVOKE ALL ON FUNCTION private.is_team_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_manage_team(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.team_role_of(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION private.is_team_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_manage_team(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.team_role_of(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;