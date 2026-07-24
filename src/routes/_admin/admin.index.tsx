import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users, FileText, Award, BarChart3, ClipboardCheck, FolderKanban, Sparkles,
  CalendarClock, TrendingUp, Activity, CheckCircle2, XCircle, Send,
} from "lucide-react";
import { formatDate } from "@/lib/admin";

export const Route = createFileRoute("/_admin/admin/")({
  head: () => ({ meta: [{ title: "Command Center — SarlaYash Blessings Admin" }] }),
  component: AdminHome,
});

function AdminHome() {
  const { data } = useQuery({
    queryKey: ["admin-kpis"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const weekAgo = new Date(Date.now() - 7 * 86400000);
      const monthAgo = new Date(Date.now() - 30 * 86400000);
      const twoWeeksAgo = new Date(Date.now() - 14 * 86400000);
      const twoMonthsAgo = new Date(Date.now() - 60 * 86400000);
      const fifteenMinAgo = new Date(Date.now() - 15 * 60000);

      const q = async (b: any): Promise<number> => {
        const r = await b;
        return (r?.count as number | null) ?? 0;
      };

      const [
        totalApplicants, appsToday, appsWeek, appsMonth, appsPrevWeek, appsPrevMonth,
        pending, shortlisted, rejected, offersSent, offersAccepted,
        assessAttempts, assessPassed,
        projActive, projCompleted, certs,
        liveVisitors, notif,
      ] = await Promise.all([
        q(supabase.from("profiles").select("id", { count: "exact", head: true })),
        q(supabase.from("applications").select("id", { count: "exact", head: true }).gte("created_at", today.toISOString())),
        q(supabase.from("applications").select("id", { count: "exact", head: true }).gte("created_at", weekAgo.toISOString())),
        q(supabase.from("applications").select("id", { count: "exact", head: true }).gte("created_at", monthAgo.toISOString())),
        q(supabase.from("applications").select("id", { count: "exact", head: true }).gte("created_at", twoWeeksAgo.toISOString()).lt("created_at", weekAgo.toISOString())),
        q(supabase.from("applications").select("id", { count: "exact", head: true }).gte("created_at", twoMonthsAgo.toISOString()).lt("created_at", monthAgo.toISOString())),
        q(supabase.from("applications").select("id", { count: "exact", head: true }).eq("pipeline_stage", "under_review")),
        q(supabase.from("applications").select("id", { count: "exact", head: true }).eq("pipeline_stage", "shortlisted")),
        q(supabase.from("applications").select("id", { count: "exact", head: true }).eq("pipeline_stage", "rejected")),
        q(supabase.from("offers").select("id", { count: "exact", head: true }).eq("status", "sent")),
        q(supabase.from("offers").select("id", { count: "exact", head: true }).eq("status", "accepted")),
        q(supabase.from("assessment_attempts").select("id", { count: "exact", head: true })),
        q(supabase.from("assessment_attempts").select("id", { count: "exact", head: true }).eq("passed", true)),
        q(supabase.from("projects").select("id", { count: "exact", head: true }).eq("status", "in_progress")),
        q(supabase.from("projects").select("id", { count: "exact", head: true }).eq("status", "completed")),
        q(supabase.from("certificates").select("id", { count: "exact", head: true })),
        q(supabase.from("visitor_analytics").select("id", { count: "exact", head: true }).gte("created_at", fifteenMinAgo.toISOString())),
        q(supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null)),
      ]);

      const [{ data: scoreRows }] = await Promise.all([
        supabase.from("assessment_attempts").select("percentage").limit(500).order("created_at", { ascending: false }),
      ]);
      const avgScore = scoreRows && scoreRows.length
        ? Math.round(scoreRows.reduce((s, r) => s + Number(r.percentage ?? 0), 0) / scoreRows.length)
        : 0;

      const wgr = appsPrevWeek === 0 ? (appsWeek > 0 ? 100 : 0) : Math.round(((appsWeek - appsPrevWeek) / appsPrevWeek) * 100);
      const mgr = appsPrevMonth === 0 ? (appsMonth > 0 ? 100 : 0) : Math.round(((appsMonth - appsPrevMonth) / appsPrevMonth) * 100);

      return {
        totalApplicants, appsToday, appsWeek, appsMonth,
        pending, shortlisted, rejected, offersSent, offersAccepted,
        assessAttempts, assessPassed,
        projActive, projCompleted, certs, liveVisitors, notif,
        avgScore, wgr, mgr,
      };
    },
  });

  const { data: activity } = useQuery({
    queryKey: ["admin-activity-feed"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const [apps, attempts, certsRes, offers] = await Promise.all([
        supabase.from("applications").select("id, program, status, created_at, user_id").order("created_at", { ascending: false }).limit(6),
        supabase.from("assessment_attempts").select("id, percentage, passed, submitted_at, user_id").not("submitted_at", "is", null).order("submitted_at", { ascending: false }).limit(6),
        supabase.from("certificates").select("id, title, issued_at, user_id").order("issued_at", { ascending: false }).limit(6),
        supabase.from("offers").select("id, offer_number, status, updated_at, applicant_id").order("updated_at", { ascending: false }).limit(6),
      ]);
      return {
        apps: apps.data ?? [], attempts: attempts.data ?? [],
        certs: certsRes.data ?? [], offers: offers.data ?? [],
      };
    },
  });

  const k = data;
  const stats = [
    { l: "Applicants", v: k?.totalApplicants ?? 0, i: Users, to: "/admin/applicants" },
    { l: "Apps today", v: k?.appsToday ?? 0, i: FileText, to: "/admin/applicants" },
    { l: "Apps this week", v: k?.appsWeek ?? 0, i: FileText, to: "/admin/applicants" },
    { l: "Apps this month", v: k?.appsMonth ?? 0, i: FileText, to: "/admin/applicants" },
    { l: "Pending review", v: k?.pending ?? 0, i: ClipboardCheck, to: "/admin/pipeline" },
    { l: "Shortlisted", v: k?.shortlisted ?? 0, i: CheckCircle2, to: "/admin/pipeline" },
    { l: "Rejected", v: k?.rejected ?? 0, i: XCircle, to: "/admin/pipeline" },
    { l: "Offers sent", v: k?.offersSent ?? 0, i: Send, to: "/admin/offers" },
    { l: "Offers accepted", v: k?.offersAccepted ?? 0, i: Sparkles, to: "/admin/offers" },
    { l: "Assessment attempts", v: k?.assessAttempts ?? 0, i: ClipboardCheck, to: "/admin/assessments" },
    { l: "Assessments passed", v: k?.assessPassed ?? 0, i: CheckCircle2, to: "/admin/assessments" },
    { l: "Projects active", v: k?.projActive ?? 0, i: FolderKanban, to: "/admin/projects" },
    { l: "Projects completed", v: k?.projCompleted ?? 0, i: FolderKanban, to: "/admin/projects" },
    { l: "Certificates issued", v: k?.certs ?? 0, i: Award, to: "/admin/certificates" },
    { l: "Avg. assessment score", v: `${k?.avgScore ?? 0}%`, i: BarChart3, to: "/admin/analytics" },
    { l: "Live visitors (15m)", v: k?.liveVisitors ?? 0, i: Activity, to: "/admin/analytics" },
    { l: "Weekly growth", v: `${(k?.wgr ?? 0) >= 0 ? "+" : ""}${k?.wgr ?? 0}%`, i: TrendingUp, to: "/admin/analytics" },
    { l: "Monthly growth", v: `${(k?.mgr ?? 0) >= 0 ? "+" : ""}${k?.mgr ?? 0}%`, i: TrendingUp, to: "/admin/analytics" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Command Center"
        description="Live operational overview of the entire SarlaYash Blessings internship platform."
      />

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        {stats.map((c) => (
          <Link key={c.l} to={c.to as any} className="block">
            <Card className="border-border/60 transition hover:border-accent">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                <CardTitle className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  {c.l}
                </CardTitle>
                <c.i className="h-3.5 w-3.5 text-accent" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="font-serif text-2xl">{c.v}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <FeedCard title="Recent applications" empty="No applications yet.">
          {(activity?.apps ?? []).map((a) => (
            <FeedRow key={a.id} title={a.program} sub={`Status · ${a.status}`} at={a.created_at} />
          ))}
        </FeedCard>
        <FeedCard title="Recent assessment attempts" empty="No attempts submitted yet.">
          {(activity?.attempts ?? []).map((a) => (
            <FeedRow key={a.id} title={`Score ${Math.round(Number(a.percentage))}%`} sub={a.passed ? "Passed" : "Did not pass"} at={a.submitted_at} />
          ))}
        </FeedCard>
        <FeedCard title="Recent certificates" empty="No certificates issued yet.">
          {(activity?.certs ?? []).map((c) => (
            <FeedRow key={c.id} title={c.title} sub="Certificate" at={c.issued_at} />
          ))}
        </FeedCard>
        <FeedCard title="Offer activity" empty="No offer activity.">
          {(activity?.offers ?? []).map((o) => (
            <FeedRow key={o.id} title={o.offer_number} sub={`Status · ${o.status}`} at={o.updated_at} />
          ))}
        </FeedCard>
      </div>
    </div>
  );
}

function FeedCard({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const arr = Array.isArray(children) ? children : [children];
  const isEmpty = arr.filter(Boolean).length === 0;
  return (
    <Card className="border-border/60">
      <CardHeader><CardTitle className="text-sm font-medium">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {isEmpty ? <div className="text-xs text-muted-foreground">{empty}</div> : children}
      </CardContent>
    </Card>
  );
}

function FeedRow({ title, sub, at }: { title: string; sub: string; at: string | null | undefined }) {
  return (
    <div className="flex items-start justify-between border-b border-border/40 pb-2 last:border-0">
      <div className="min-w-0">
        <div className="truncate text-sm">{title}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
      <div className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(at, { dateStyle: "medium", timeStyle: "short" })}</div>
    </div>
  );
}
