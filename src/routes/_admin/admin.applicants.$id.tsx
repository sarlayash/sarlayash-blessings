import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { toast } from "sonner";
import { PIPELINE_STAGES, stageDef, initials, formatDate } from "@/lib/admin";
import { useAuth } from "@/lib/auth-hooks";
import { ExternalLink, FileText, Award, ClipboardCheck, Pin, PinOff, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/applicants/$id")({
  head: () => ({ meta: [{ title: "Applicant profile — Admin" }] }),
  component: ApplicantDetail,
});

function ApplicantDetail() {
  const { id } = useParams({ from: "/_admin/admin/applicants/$id" });
  const qc = useQueryClient();
  const { user } = useAuth();
  const [note, setNote] = useState("");
  const [pinned, setPinned] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["applicant-detail", id],
    queryFn: async () => {
      const [profile, apps, projects, attempts, certs, notes, offers, interviews, timeline] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
        supabase.from("applications").select("*").eq("user_id", id).order("created_at", { ascending: false }),
        supabase.from("projects").select("*").eq("user_id", id).order("created_at", { ascending: false }),
        supabase.from("assessment_attempts").select("id, percentage, passed, submitted_at, assessment_id").eq("user_id", id).order("submitted_at", { ascending: false }),
        supabase.from("certificates").select("*").eq("user_id", id).order("issued_at", { ascending: false }),
        supabase.from("admin_notes").select("*").eq("applicant_id", id).order("pinned", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("offers").select("*").eq("applicant_id", id).order("created_at", { ascending: false }),
        supabase.from("interviews").select("*").eq("applicant_id", id).order("scheduled_at", { ascending: false }),
        supabase.from("activity_logs").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(30),
      ]);
      return {
        profile: profile.data, apps: apps.data ?? [], projects: projects.data ?? [],
        attempts: attempts.data ?? [], certs: certs.data ?? [], notes: notes.data ?? [],
        offers: offers.data ?? [], interviews: interviews.data ?? [], timeline: timeline.data ?? [],
      };
    },
  });

  async function changeStage(appId: string, newStage: string) {
    const { error } = await supabase.from("applications").update({ pipeline_stage: newStage as any }).eq("id", appId);
    if (error) return toast.error(error.message);
    toast.success("Pipeline stage updated");
    void qc.invalidateQueries({ queryKey: ["applicant-detail", id] });
  }

  async function addNote() {
    if (!note.trim() || !user) return;
    const { error } = await supabase.from("admin_notes").insert({ applicant_id: id, author_id: user.id, body: note.trim(), pinned });
    if (error) return toast.error(error.message);
    setNote(""); setPinned(false); toast.success("Note added");
    void qc.invalidateQueries({ queryKey: ["applicant-detail", id] });
  }

  async function togglePin(noteId: string, cur: boolean) {
    const { error } = await supabase.from("admin_notes").update({ pinned: !cur }).eq("id", noteId);
    if (error) return toast.error(error.message);
    void qc.invalidateQueries({ queryKey: ["applicant-detail", id] });
  }

  async function delNote(noteId: string) {
    if (!confirm("Delete this note?")) return;
    const { error } = await supabase.from("admin_notes").delete().eq("id", noteId);
    if (error) return toast.error(error.message);
    void qc.invalidateQueries({ queryKey: ["applicant-detail", id] });
  }

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading applicant…</div>;
  const p = data?.profile;
  if (!p) return <div className="text-sm text-muted-foreground">Applicant not found.</div>;

  return (
    <div>
      <PageHeader
        title={p.full_name ?? p.email ?? "Applicant"}
        description={p.headline ?? p.email ?? undefined}
        actions={<Link to="/admin/applicants"><Button variant="outline" size="sm">← Back to applicants</Button></Link>}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border/60 lg:col-span-1">
          <CardHeader><CardTitle className="text-sm">Profile</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={p.avatar_url ?? undefined} />
                <AvatarFallback className="bg-accent text-accent-foreground">{initials(p.full_name, p.email)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="truncate font-serif text-lg">{p.full_name ?? "—"}</div>
                <div className="truncate text-xs text-muted-foreground">{p.email}</div>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <Field label="Phone" value={p.phone} />
              <Field label="Location" value={[p.city, p.state, p.country].filter(Boolean).join(", ")} />
              <Field label="College" value={p.college} />
              <Field label="Degree" value={p.degree} />
              <Field label="Branch" value={p.branch} />
              <Field label="CGPA" value={p.cgpa?.toString()} />
              <Field label="Passing year" value={p.passing_year?.toString()} />
              <Field label="Dream company" value={p.dream_company} />
            </dl>
            <div className="space-y-1 text-xs">
              {p.linkedin_url && <ExtLink href={p.linkedin_url} label="LinkedIn" />}
              {p.github_url && <ExtLink href={p.github_url} label="GitHub" />}
              {p.portfolio_url && <ExtLink href={p.portfolio_url} label="Portfolio" />}
              {p.resume_url && <ExtLink href={p.resume_url} label="Resume" />}
            </div>
            {p.skills && p.skills.length > 0 && (
              <div>
                <div className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">Skills</div>
                <div className="flex flex-wrap gap-1">{p.skills.map((s: string) => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card className="border-border/60">
            <CardHeader><CardTitle className="text-sm">Applications & pipeline</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {data!.apps.length === 0 && <div className="text-xs text-muted-foreground">No applications.</div>}
              {data!.apps.map((a) => {
                const s = stageDef(a.pipeline_stage);
                return (
                  <div key={a.id} className="rounded-md border border-border/60 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium">{a.program} {a.track ? <span className="text-muted-foreground">· {a.track}</span> : null}</div>
                        <div className="text-xs text-muted-foreground">Submitted {formatDate(a.submitted_at ?? a.created_at)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={s.tone}>{s.label}</Badge>
                        <Select value={a.pipeline_stage ?? "applied"} onValueChange={(v) => changeStage(a.id, v)}>
                          <SelectTrigger className="h-8 w-52 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {PIPELINE_STAGES.map((st) => <SelectItem key={st.key} value={st.key}>{st.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <SummaryCard icon={ClipboardCheck} title="Assessments" items={data!.attempts.map((a) => ({
              title: `${Math.round(Number(a.percentage))}% ${a.passed ? "· passed" : ""}`,
              sub: formatDate(a.submitted_at),
            }))} />
            <SummaryCard icon={FileText} title="Projects" items={data!.projects.map((p2) => ({
              title: p2.title, sub: `${p2.status}${p2.score != null ? ` · ${p2.score}` : ""}`,
            }))} />
            <SummaryCard icon={Award} title="Certificates" items={data!.certs.map((c) => ({
              title: c.title, sub: `${c.certificate_number} · ${formatDate(c.issued_at)}`,
            }))} />
            <SummaryCard icon={FileText} title="Offers & interviews" items={[
              ...data!.offers.map((o) => ({ title: `${o.role_title} · ${o.offer_number}`, sub: `Offer · ${o.status}` })),
              ...data!.interviews.map((i) => ({ title: `Interview ${formatDate(i.scheduled_at, { dateStyle: "medium", timeStyle: "short" })}`, sub: `${i.status}${i.recommendation ? ` · ${i.recommendation}` : ""}` })),
            ]} />
          </div>

          <Card className="border-border/60">
            <CardHeader><CardTitle className="text-sm">Internal notes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea placeholder="Add an internal note (visible to staff only)…" value={note} onChange={(e) => setNote(e.target.value)} />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> Pin this note
                </label>
                <Button size="sm" onClick={addNote} disabled={!note.trim()}>Add note</Button>
              </div>
              <div className="space-y-2">
                {data!.notes.length === 0 && <div className="text-xs text-muted-foreground">No notes yet.</div>}
                {data!.notes.map((n) => (
                  <div key={n.id} className="rounded-md border border-border/60 p-3 text-sm">
                    <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
                      <span>{formatDate(n.created_at, { dateStyle: "medium", timeStyle: "short" })}</span>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => togglePin(n.id, n.pinned)}>
                          {n.pinned ? <Pin className="h-3 w-3 text-accent" /> : <PinOff className="h-3 w-3" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => delNote(n.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="whitespace-pre-wrap">{n.body}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader><CardTitle className="text-sm">Activity timeline</CardTitle></CardHeader>
            <CardContent>
              {data!.timeline.length === 0 && <div className="text-xs text-muted-foreground">No activity yet.</div>}
              <ul className="space-y-2 text-sm">
                {data!.timeline.map((t) => (
                  <li key={t.id} className="flex items-start justify-between border-b border-border/40 pb-2 last:border-0">
                    <div>{t.activity}</div>
                    <div className="ml-4 whitespace-nowrap text-xs text-muted-foreground">{formatDate(t.created_at, { dateStyle: "medium", timeStyle: "short" })}</div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{value || "—"}</dd>
    </div>
  );
}

function ExtLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
      <ExternalLink className="h-3 w-3" /> {label}
    </a>
  );
}

function SummaryCard({ icon: Icon, title, items }: { icon: any; title: string; items: { title: string; sub: string }[] }) {
  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        <Icon className="h-4 w-4 text-accent" />
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 && <div className="text-xs text-muted-foreground">Nothing yet.</div>}
        {items.map((it, i) => (
          <div key={i} className="border-b border-border/40 pb-2 text-sm last:border-0">
            <div className="truncate">{it.title}</div>
            <div className="text-xs text-muted-foreground">{it.sub}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
