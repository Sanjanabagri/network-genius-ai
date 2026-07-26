import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Save, UserCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings/profile")({
  head: () => ({
    meta: [
      { title: "Profile · NetAssist AI" },
      { name: "description", content: "Manage your engineer profile: name, company, role, experience and certifications." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

const CERTS = ["CCNA", "CCNP", "CCIE", "JNCIA", "JNCIP", "PCNSE", "NSE4", "NSE7", "AWS ANS", "Azure Network"];

function ProfilePage() {
  const { user } = Route.useRouteContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [years, setYears] = useState<string>("");
  const [certs, setCerts] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, company, job_title, years_experience, certifications")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      if (error) toast.error("Could not load profile", { description: error.message });
      if (data) {
        setFullName(data.full_name ?? "");
        setCompany(data.company ?? "");
        setJobTitle(data.job_title ?? "");
        setYears(data.years_experience != null ? String(data.years_experience) : "");
        setCerts(data.certifications ?? []);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user.id]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      id: user.id,
      full_name: fullName.trim() || null,
      company: company.trim() || null,
      job_title: jobTitle.trim() || null,
      years_experience: years ? Number(years) : null,
      certifications: certs,
    };
    const { error } = await supabase.from("profiles").upsert(payload);
    setSaving(false);
    if (error) toast.error("Save failed", { description: error.message });
    else toast.success("Profile saved");
  }

  const field = "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link to="/dashboard" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
          <UserCircle2 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Your profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      {loading ? (
        <div className="mt-10 flex items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : (
        <form onSubmit={onSave} className="mt-8 grid gap-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="grid gap-2">
            <label htmlFor="full_name" className="text-sm font-medium">Full name</label>
            <input id="full_name" className={field} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Alex Rivera" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <label htmlFor="company" className="text-sm font-medium">Company</label>
              <input id="company" className={field} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Networks" />
            </div>
            <div className="grid gap-2">
              <label htmlFor="job_title" className="text-sm font-medium">Job title</label>
              <input id="job_title" className={field} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Senior Network Engineer" />
            </div>
          </div>
          <div className="grid gap-2">
            <label htmlFor="years" className="text-sm font-medium">Years of experience</label>
            <input id="years" type="number" min={0} max={60} className={field} value={years} onChange={(e) => setYears(e.target.value)} placeholder="8" />
          </div>
          <div className="grid gap-2">
            <span className="text-sm font-medium">Certifications</span>
            <div className="flex flex-wrap gap-2">
              {CERTS.map((c) => {
                const on = certs.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCerts((prev) => (on ? prev.filter((x) => x !== c) : [...prev, c]))}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                    aria-pressed={on}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save profile
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
