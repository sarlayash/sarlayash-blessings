import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/search")({
  head: () => ({ meta: [{ title: "Global search — Admin" }] }),
  component: GlobalSearch,
});

function GlobalSearch() {
  const [q, setQ] = useState("");

  const { data } = useQuery({
    queryKey: ["global-search", q],
    enabled: q.length >= 2,
    queryFn: async () => {
      const like = `%${q}%`;
      const [profs, apps, assess, tracks, cohorts, offers, certs, projects] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email").or(`full_name.ilike.${like},email.ilike.${like},college.ilike.${like}`).limit(10),
        supabase.from("applications").select("id, user_id, program, track").or(`program.ilike.${like},track.ilike.${like}`).limit(10),
        supabase.from("assessments").select("id, title").ilike("title", like).limit(10),
        supabase.from("tracks").select("id, slug, name").or(`name.ilike.${like},slug.ilike.${like}`).limit(10),
        supabase.from("cohorts").select("id, name, code").or(`name.ilike.${like},code.ilike.${like}`).limit(10),
        supabase.from("offers").select("id, offer_number, role_title, applicant_id").or(`offer_number.ilike.${like},role_title.ilike.${like}`).limit(10),
        supabase.from("certificates").select("id, title, certificate_number, verification_code, user_id").or(`title.ilike.${like},certificate_number.ilike.${like},verification_code.ilike.${like}`).limit(10),
        supabase.from("projects").select("id, user_id, title").ilike("title", like).limit(10),
      ]);
      return {
        profiles: profs.data ?? [], applications: apps.data ?? [], assessments: assess.data ?? [],
        tracks: tracks.data ?? [], cohorts: cohorts.data ?? [], offers: offers.data ?? [],
        certificates: certs.data ?? [], projects: projects.data ?? [],
      };
    },
  });

  return (
    <div>
      <PageHeader title="Global search" description="Search across applicants, applications, tracks, cohorts, offers and certificates." />
      <div className="mb-6 flex items-center gap-2">
        <SearchIcon className="h-4 w-4 text-muted-foreground" />
        <Input autoFocus placeholder="Type at least 2 characters…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xl" />
      </div>

      {q.length < 2 && <div className="text-sm text-muted-foreground">Start typing to search the platform.</div>}
      {data && (
        <div className="grid gap-4 md:grid-cols-2">
          <Section title="Applicants">
            {data.profiles.map((p) => (
              <Row key={p.id} to="/admin/applicants/$id" params={{ id: p.id }} title={p.full_name ?? p.email ?? "—"} sub={p.email ?? ""} />
            ))}
          </Section>
          <Section title="Applications">
            {data.applications.map((a) => (
              <Row key={a.id} to="/admin/applicants/$id" params={{ id: a.user_id }} title={a.program} sub={a.track ?? ""} />
            ))}
          </Section>
          <Section title="Assessments">
            {data.assessments.map((a) => (
              <Row key={a.id} to="/admin/assessments/$id/edit" params={{ id: a.id }} title={a.title} sub="" />
            ))}
          </Section>
          <Section title="Tracks">
            {data.tracks.map((t) => (
              <Row key={t.id} to="/admin/tracks" title={t.name} sub={`/${t.slug}`} />
            ))}
          </Section>
          <Section title="Cohorts">
            {data.cohorts.map((c) => (
              <Row key={c.id} to="/admin/cohorts" title={c.name} sub={c.code} />
            ))}
          </Section>
          <Section title="Offers">
            {data.offers.map((o) => (
              <Row key={o.id} to="/admin/offers" title={o.role_title} sub={o.offer_number} />
            ))}
          </Section>
          <Section title="Certificates">
            {data.certificates.map((c) => (
              <Row key={c.id} to="/admin/certificates" title={c.title} sub={c.certificate_number} />
            ))}
          </Section>
          <Section title="Projects">
            {data.projects.map((p) => (
              <Row key={p.id} to="/admin/projects" title={p.title} sub="" />
            ))}
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const arr = Array.isArray(children) ? children.filter(Boolean) : [children];
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">{title}</div>
        {arr.length === 0 ? <div className="text-xs text-muted-foreground">No matches</div> : <div className="space-y-1">{arr}</div>}
      </CardContent>
    </Card>
  );
}

function Row({ to, params, title, sub }: { to: any; params?: any; title: string; sub: string }) {
  return (
    <Link to={to} params={params} className="flex items-center justify-between rounded-md border border-border/40 px-2 py-1 text-sm hover:border-accent">
      <span className="truncate">{title}</span>
      <span className="ml-2 text-xs text-muted-foreground">{sub}</span>
    </Link>
  );
}
