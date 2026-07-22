
## Goal
Ship user authentication for NetAssist AI: email + password, Google sign-in, forgot/reset password, and TOTP-based two-factor authentication — backed by Lovable Cloud (Supabase Auth).

## Prerequisites
Enable **Lovable Cloud** first (required for any auth). This provisions the Supabase project, generates the client + auth middleware, and wires bearer-token middleware in `src/start.ts`.

## Profiles decision
You'll need a `profiles` table since the spec calls for Name, Company, Job Title, Years of Experience, and Certifications. I'll create it in the same migration as auth, with:
- `profiles` table (FK → `auth.users`, cascade delete)
- Auto-create trigger on new user signup
- RLS: users can select/update only their own row
- Grants for `authenticated` + `service_role`

Roles (admin vs user) go in a separate `user_roles` table with a `has_role()` security-definer function — required for the future Admin Dashboard.

## Routes added
```
src/routes/
  auth.tsx                 → /auth        (Sign in + Sign up tabs, Google button)
  auth.forgot.tsx          → /auth/forgot (request reset email)
  reset-password.tsx       → /reset-password (public — sets new password from recovery link)
  _authenticated/
    route.tsx              → managed gate (integration-provisioned)
    dashboard.tsx          → /dashboard (placeholder landing after login)
    settings.security.tsx  → /settings/security (enable/disable 2FA)
```
Landing page (`/`) stays public; the nav's "Sign in" / "Get started" buttons now route to `/auth`, and a session-aware header shows an account menu with "Dashboard" + "Sign out" when signed in.

## Auth flows

**Email + password**
- Sign up: `supabase.auth.signUp` with `emailRedirectTo: window.location.origin/dashboard`.
- Sign in: `signInWithPassword`. On success, navigate to `?redirect` param or `/dashboard`.
- Trigger auto-creates a profile row.

**Google**
- Use the Lovable broker: `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`.
- Call `supabase--configure_social_auth` for `google` in the same migration batch so the provider is enabled in Supabase.
- Wrapper lands on `/`; a session-aware effect on `/` routes signed-in users to `/dashboard` (or the saved `redirect` path from sessionStorage set before OAuth).

**Forgot password**
- `/auth/forgot`: `resetPasswordForEmail(email, { redirectTo: origin + "/reset-password" })`.
- `/reset-password`: public route, detects `type=recovery` in URL hash, shows "new password" form, calls `supabase.auth.updateUser({ password })`, then redirects to `/dashboard`.

**Two-Factor Authentication (TOTP)**
- `/settings/security` under the auth gate.
- Enroll: `supabase.auth.mfa.enroll({ factorType: "totp" })` → render QR (from returned `otpauth` URI via a small QR component) → user enters 6-digit code → `mfa.challenge` + `mfa.verify` to activate.
- Show list of enrolled factors; allow unenroll.
- On sign-in, if `mfa.getAuthenticatorAssuranceLevel()` returns `aal1` with a required factor, show a "Enter 6-digit code" step before completing sign-in (`mfa.challenge` + `mfa.verify`).
- No separate table needed — Supabase Auth manages factors.

## Root-level session wiring
- `__root.tsx` registers **one** `supabase.auth.onAuthStateChange` listener filtered to `SIGNED_IN` / `SIGNED_OUT` / `USER_UPDATED` → `router.invalidate()` + `queryClient.invalidateQueries()` (skip invalidate on SIGNED_OUT to avoid 401 storm).
- Nav becomes session-aware: shows "Sign in / Get started" when signed out, and "Dashboard / Account ▾ (Settings, Sign out)" when signed in.

## Sign-out hygiene
`cancelQueries()` → `queryClient.clear()` → `supabase.auth.signOut()` → `navigate({ to: "/auth", replace: true })`.

## Database migration (single migration, runs after Cloud enables)
```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  company text,
  job_title text,
  years_experience int,
  certifications text[] DEFAULT '{}',
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read"  ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile write" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Auto-create profile + default user role on signup
CREATE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Design
Auth pages use the existing gradient/glass tokens — split-screen layout on desktop (form left, hero panel right with mesh gradient + branding), single column on mobile. Loading and error states on every form. Password inputs with show/hide toggle. Google button with logo.

## Out of scope for this turn (follow-ups)
- Full profile editor with all fields (this turn ships enough to sign up and land on a dashboard placeholder)
- SMS-based 2FA (Supabase's TOTP is the standard; SMS is a separate provider setup)
- SSO/SAML (Enterprise tier — later)
- Full dashboard modules (Config Generator, etc.)
