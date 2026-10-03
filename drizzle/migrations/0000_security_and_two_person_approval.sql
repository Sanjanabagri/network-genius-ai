CREATE POLICY "Admins can read all feedback" ON public.feedback FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update feedback" ON public.feedback FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION private.guard_invite_update() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR private.can_manage_team(OLD.team_id, auth.uid()) THEN RETURN NEW; END IF;
  IF (to_jsonb(NEW) - 'accepted_at') IS DISTINCT FROM (to_jsonb(OLD) - 'accepted_at') THEN
    RAISE EXCEPTION 'Invited users may only accept their invite';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_invite_update BEFORE UPDATE ON public.team_invites FOR EACH ROW EXECUTE FUNCTION private.guard_invite_update();

CREATE OR REPLACE FUNCTION private.guard_change_approval() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('approved','rejected') AND auth.uid() = OLD.user_id THEN
    RAISE EXCEPTION 'You cannot approve or reject your own change request';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_change_approval BEFORE UPDATE ON public.change_requests FOR EACH ROW EXECUTE FUNCTION private.guard_change_approval();