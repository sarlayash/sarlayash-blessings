import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { PIPELINE_STAGES, stageDef, formatDate } from "@/lib/admin";

export const Route = createFileRoute("/_admin/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Admin" }] }),
  component: Analytics,
});

function Analytics() {
  const { data } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const [apps, offers, attempts, projects, certs, visits, tracks] = await Promise.all([
        supabase.from("applications").select("pipeline_stage, track, created_at").limit(2000),
        supabase.from("offers").select("status").limit(1000),
        supabase.from("assessment_attempts").select("percentage, passed").limit(2000),
        supabase.from("projects").select("status, track").limit(1000),
        supabase.from("certificates").select("id, issued_at, track").limit(2000),
        supabase.from("visitor_analytics").select("path, created_at").order("created_at", { ascending: false }).limit(1000),
        supabase.from("tracks").select("id, name, capacity"),
      ]);
      return {
        apps: apps.data ?? [], offers: offers.data ?? [], attempts: attempts.data ?? [],
        projects: projects.data ?? [], certs: certs.data ?? [], visits: visits.data ?? [],
        tracks: tracks.data ?? [],
      };
    },
  });

  if (!data) return <div className="text-sm text-muted-foreground">Loading analytics…</div>;

  const stageBreakdown = PIPELINE_STAGES.map((s) => ({
    stage: s, count: data.apps.filter((a) => a.pipeline_stage === s.key).length,
  }));
  const totalApps = data.apps.length || 1;

  const trackPopularity: Record<string, number> = {};
  for (const a of data.apps) if (a.track) trackPopularity[a.track] = (trackPopularity[a.track] ?? 0) + 1;
  const trackRows = Object.entries(trackPopularity).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const offerBreakdown: Record<string, number> = {};
  for (const o of data.offers) offerBreakdown[o.status] = (offerBreakdown[o.status] ?? 0) + 1;

  const attemptsCount = data.attempts.length || 1;
  const passRate = Math.round((data.attempts.filter((a) => a.passed).length / attemptsCount) * 100);
  const avgScore = Math.round(data.attempts.reduce((s, r) => s + Number(r.percentage ?? 0), 0) / attemptsCount);

  const funnelPath = [
    "applied", "under_review", "shortlisted", "assessment_completed",
    "interview_scheduled", "selected", "offer_released", "certificate_issued",
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Funnel conversion, track popularity, assessment health and offer outcomes." />

      <Card className="border-border/60">
        <CardHeader><CardTitle className="text-sm">Applicant funnel</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {funnelPath.map((k) => {
            const s = stageDef(k);
            const n = data.apps.filter((a) => a.pipeline_stage === k).length;
            const pct = Math.round((n / totalApps) * 100);
            return (
              <div key={k}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span>{s.label}</span>
                  <span className="text-muted-foreground">{n} · {pct}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(2, pct)}%` }} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader><CardTitle className="text-sm">Pipeline breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {stageBreakdown.map(({ stage, count }) => (
              <div key={stage.key} className="flex items-center justify-between text-xs">
                <span className={`rounded px-2 py-0.5 ${stage.tone}`}>{stage.label}</span>
                <span>{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader><CardTitle className="text-sm">Track popularity</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {trackRows.length === 0 ? <div className="text-xs text-muted-foreground">No applications yet.</div> : trackRows.map(([t, n]) => (
              <div key={t} className="flex items-center justify-between text-sm">
                <span>{t}</span>
                <span className="text-muted-foreground">{n}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader><CardTitle className="text-sm">Assessments</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Total attempts</span><span>{data.attempts.length}</span></div>
            <div className="flex justify-between"><span>Pass rate</span><span>{passRate}%</span></div>
            <div className="flex justify-between"><span>Average score</span><span>{avgScore}%</span></div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader><CardTitle className="text-sm">Offers</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {Object.keys(offerBreakdown).length === 0 ? <div className="text-xs text-muted-foreground">No offers yet.</div>
              : Object.entries(offerBreakdown).map(([k, v]) => (
                <div key={k} className="flex justify-between"><span className="capitalize">{k}</span><span>{v}</span></div>
              ))}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader><CardTitle className="text-sm">Certificates issued</CardTitle></CardHeader>
          <CardContent className="text-sm">Total <b>{data.certs.length}</b></CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader><CardTitle className="text-sm">Recent visitor paths</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-xs">
            {data.visits.slice(0, 8).map((v, i) => (
              <div key={i} className="flex justify-between border-b border-border/40 pb-1 last:border-0">
                <span className="truncate">{v.path}</span>
                <span className="text-muted-foreground">{formatDate(v.created_at, { timeStyle: "short" })}</span>
              </div>
            ))}
            {data.visits.length === 0 && <EmptyState icon={BarChart3} title="No visitor data" description="Public traffic will appear here as it's captured." />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
