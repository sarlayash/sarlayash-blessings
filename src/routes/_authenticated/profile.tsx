import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-hooks";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { computeProfileCompletion, type ProfileRow } from "@/lib/profile";
import { FileUp, Loader2, Upload, X, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — SarlaYash Blessings" }] }),
  component: ProfilePage,
});

type ProfileForm = Partial<ProfileRow>;

const GENDERS = ["Female", "Male", "Non-binary", "Prefer not to say"];
const AVAILABILITY = ["Immediate", "1 month", "2 months", "3+ months"];

function ProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const uid = user?.id;

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", uid!).maybeSingle();
      if (error) throw error;
      return (data ?? null) as ProfileRow | null;
    },
  });

  const [form, setForm] = useState<ProfileForm>({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const initialised = useRef(false);

  useEffect(() => {
    if (profile && !initialised.current) {
      setForm(profile);
      initialised.current = true;
    }
  }, [profile]);

  const completion = useMemo(
    () => computeProfileCompletion({ ...(profile ?? ({} as ProfileRow)), ...form } as ProfileRow),
    [profile, form],
  );

  const update = <K extends keyof ProfileForm>(k: K, v: ProfileForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async (opts?: { silent?: boolean }) => {
    if (!uid) return;
    setSaving(true);
    const payload = {
      ...form,
      id: uid,
      email: user?.email ?? null,
      passing_year: form.passing_year === undefined || (form.passing_year as unknown) === "" ? null : form.passing_year,
      cgpa: form.cgpa === undefined || (form.cgpa as unknown) === "" ? null : form.cgpa,
      date_of_birth: form.date_of_birth || null,
    };
    const { error } = await supabase.from("profiles").upsert(payload as never, { onConflict: "id" });
    setSaving(false);
    if (error) {
      toast.error("Couldn't save profile", { description: error.message });
      return;
    }
    setSavedAt(new Date());
    void qc.invalidateQueries({ queryKey: ["profile", uid] });
    void qc.invalidateQueries({ queryKey: ["applicant-stats", uid] });
    if (!opts?.silent) toast.success("Profile saved");
  };

  // Autosave on blur — debounced via a change timer.
  useEffect(() => {
    if (!initialised.current) return;
    const t = setTimeout(() => void save({ silent: true }), 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const uploadAvatar = async (file: File) => {
    if (!uid) return;
    const path = `${uid}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) return toast.error("Upload failed", { description: error.message });
    const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 365);
    if (data?.signedUrl) {
      update("avatar_url", data.signedUrl);
      void save({ silent: true });
      toast.success("Photo updated");
    }
  };

  const uploadResume = async (file: File) => {
    if (!uid) return;
    if (file.size > 8 * 1024 * 1024) return toast.error("Max 8 MB");
    const path = `${uid}/resume-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("resumes").upload(path, file, { upsert: true });
    if (error) return toast.error("Upload failed", { description: error.message });
    const { data } = await supabase.storage.from("resumes").createSignedUrl(path, 60 * 60 * 24 * 365);
    if (data?.signedUrl) {
      update("resume_url", data.signedUrl);
      void save({ silent: true });
      toast.success("Resume uploaded");
    }
  };

  const initials = (form.full_name ?? user?.email ?? "?")
    .split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  if (isLoading) return <ProfileSkeleton />;

  return (
    <div>
      <PageHeader
        title="Profile"
        description="Complete your profile to unlock applications, assessments, and placement readiness."
        actions={
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Save profile
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card className="border-border/60">
            <CardHeader><CardTitle className="font-serif">Personal</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={form.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-accent text-accent-foreground">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <Label className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">Photo</Label>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground">
                    <Upload className="h-4 w-4" /> Upload photo
                    <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
                  </label>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Full name"><Input value={form.full_name ?? ""} onChange={(e) => update("full_name", e.target.value)} /></Field>
                <Field label="Email"><Input value={user?.email ?? ""} disabled /></Field>
                <Field label="Phone"><Input value={form.phone ?? ""} onChange={(e) => update("phone", e.target.value)} placeholder="+91 …" /></Field>
                <Field label="Gender">
                  <Select value={form.gender ?? undefined} onValueChange={(v) => update("gender", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Date of birth"><Input type="date" value={form.date_of_birth ?? ""} onChange={(e) => update("date_of_birth", e.target.value)} /></Field>
                <Field label="Headline"><Input value={form.headline ?? ""} onChange={(e) => update("headline", e.target.value)} placeholder="e.g. CS undergrad, aspiring product engineer" /></Field>
                <Field label="City"><Input value={form.city ?? ""} onChange={(e) => update("city", e.target.value)} /></Field>
                <Field label="State"><Input value={form.state ?? ""} onChange={(e) => update("state", e.target.value)} /></Field>
                <Field label="Country"><Input value={form.country ?? ""} onChange={(e) => update("country", e.target.value)} /></Field>
              </div>
              <Field label="Short bio">
                <Textarea rows={3} value={form.bio ?? ""} onChange={(e) => update("bio", e.target.value)} placeholder="A sentence or two about you." />
              </Field>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader><CardTitle className="font-serif">Education</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="College / University"><Input value={form.college ?? ""} onChange={(e) => update("college", e.target.value)} /></Field>
              <Field label="Degree"><Input value={form.degree ?? ""} onChange={(e) => update("degree", e.target.value)} placeholder="e.g. B.Tech" /></Field>
              <Field label="Branch"><Input value={form.branch ?? ""} onChange={(e) => update("branch", e.target.value)} placeholder="e.g. Computer Science" /></Field>
              <Field label="Semester"><Input value={form.semester ?? ""} onChange={(e) => update("semester", e.target.value)} placeholder="e.g. 6" /></Field>
              <Field label="Passing year">
                <Input type="number" value={form.passing_year ?? ""} onChange={(e) => update("passing_year", e.target.value ? Number(e.target.value) : null)} />
              </Field>
              <Field label="Current CGPA">
                <Input type="number" step="0.01" value={form.cgpa ?? ""} onChange={(e) => update("cgpa", e.target.value ? Number(e.target.value) : null)} />
              </Field>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader><CardTitle className="font-serif">Links & resume</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="LinkedIn URL"><Input value={form.linkedin_url ?? ""} onChange={(e) => update("linkedin_url", e.target.value)} placeholder="https://linkedin.com/in/…" /></Field>
              <Field label="GitHub URL"><Input value={form.github_url ?? ""} onChange={(e) => update("github_url", e.target.value)} placeholder="https://github.com/…" /></Field>
              <Field label="Portfolio URL" wide><Input value={form.portfolio_url ?? ""} onChange={(e) => update("portfolio_url", e.target.value)} placeholder="https://…" /></Field>
              <div className="md:col-span-2">
                <Label className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">Resume (PDF)</Label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground">
                    <FileUp className="h-4 w-4" /> Upload resume
                    <input type="file" accept="application/pdf" hidden onChange={(e) => e.target.files?.[0] && uploadResume(e.target.files[0])} />
                  </label>
                  {form.resume_url && (
                    <a href={form.resume_url} target="_blank" rel="noopener noreferrer" className="text-sm underline underline-offset-4">
                      View current resume
                    </a>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader><CardTitle className="font-serif">Skills & languages</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <TagInput
                label="Skills"
                placeholder="Type a skill and press Enter"
                values={form.skills ?? []}
                onChange={(v) => update("skills", v)}
              />
              <TagInput
                label="Languages"
                placeholder="e.g. English"
                values={form.languages ?? []}
                onChange={(v) => update("languages", v)}
              />
              <TagInput
                label="Areas of interest"
                placeholder="e.g. Frontend, ML, Design"
                values={form.areas_of_interest ?? []}
                onChange={(v) => update("areas_of_interest", v)}
              />
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader><CardTitle className="font-serif">Career</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="Career objective">
                <Textarea rows={4} value={form.career_objective ?? ""} onChange={(e) => update("career_objective", e.target.value)}
                  placeholder="What you want to do next and why. Two to three sentences." />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Dream company"><Input value={form.dream_company ?? ""} onChange={(e) => update("dream_company", e.target.value)} /></Field>
                <Field label="Preferred location"><Input value={form.preferred_location ?? ""} onChange={(e) => update("preferred_location", e.target.value)} /></Field>
                <Field label="Availability">
                  <Select value={form.availability ?? undefined} onValueChange={(v) => update("availability", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{AVAILABILITY.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>
            </CardContent>
          </Card>

          {savedAt && (
            <div className="text-xs text-muted-foreground">
              Last saved {savedAt.toLocaleTimeString()}
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <Card className="border-border/60">
            <CardHeader><CardTitle className="font-serif text-lg">Profile completion</CardTitle></CardHeader>
            <CardContent>
              <div className="mb-3 flex items-end justify-between">
                <div className="font-serif text-4xl">{completion.percent}%</div>
                <div className="text-xs text-muted-foreground">of 100</div>
              </div>
              <Progress value={completion.percent} className="h-2" />
              <ul className="mt-4 space-y-2 text-sm">
                {completion.items.map((i) => (
                  <li key={i.key} className="flex items-center justify-between">
                    <span className={i.done ? "text-foreground" : "text-muted-foreground"}>{i.label}</span>
                    {i.done ? <Check className="h-4 w-4 text-accent" /> : <span className="text-xs text-muted-foreground">+{i.weight}%</span>}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "md:col-span-2" : ""}>
      <Label className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function TagInput({ label, values, onChange, placeholder }: {
  label: string; values: string[]; onChange: (v: string[]) => void; placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div>
      <Label className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap gap-2 rounded-md border border-input bg-background p-2">
        {values.map((v) => (
          <Badge key={v} variant="secondary" className="gap-1">
            {v}
            <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} className="hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          className="min-w-[140px] flex-1 bg-transparent px-1 text-sm outline-none"
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === ",") && draft.trim()) {
              e.preventDefault();
              const v = draft.trim();
              if (!values.includes(v)) onChange([...values, v]);
              setDraft("");
            } else if (e.key === "Backspace" && !draft && values.length) {
              onChange(values.slice(0, -1));
            }
          }}
        />
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-24 animate-pulse rounded bg-muted" />
      <div className="h-96 animate-pulse rounded bg-muted" />
    </div>
  );
}
