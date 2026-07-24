import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-hooks";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText, ClipboardCheck, FolderKanban, Award, Sparkles, ArrowRight, Bell, Target,
} from "lucide-react";
import { computeProfileCompletion, computePlacementReadiness, greeting, type ProfileRow } from "@/lib/profile";
import { getTrack } from "@/lib/tracks";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — SarlaYash Blessings" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const uid = user?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", uid],
    enabled: !!uid,
    queryFn: async () => {
      const [profile, apps, asses, projs, certs, notifs, activity] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid!).maybeSingle(),
        supabase.from("applications").select("id,status,track,program,submitted_at").eq("user_id", uid!),
        supabase.from("assessment_answers").select("id,passed,assessment_id,submitted_at").eq("user_id", uid!),
        supabase.from("projects").select("id,title,status,deadline,track").eq("user_id", uid!),
        supabase.from("certificates").select("id,title,issued_at").eq("user_id", uid!),
        supabase.from("notifications").select("id,title,body,category,read_at,created_at,link")
          .eq("user_id", uid!).order("created_at", { ascending: false }).limit(4),
        supabase.from("activity_logs").select("id,activity,metadata,created_at")
          .eq("user_id", uid!).order("created_at", { ascending: false }).limit(6),
      ]);
      return {
        profile: (profile.data ?? null) as ProfileRow | null,
        applications: apps.data ?? [],
        assessments: asses.data ?? [],
        projects: projs.data ?? [],
        certificates: certs.data ?? [],
        notifications: notifs.data ?? [],
        activity: activity.data ?? [],
      };
    },
  });

  if (isLoading || !data) {
    return (
      <div>
        <PageHeader title="Loading…" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />)}
        </div>
      </div>
    );
  }

  const firstName = data.profile?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there";
  const completion = computeProfileCompletion(data.profile);
  const acceptedApp = data.applications.find((a) => a.status === "accepted");
  const currentTrack = acceptedApp?.track ? getTrack(acceptedApp.track) : undefined;

  const submittedApps = data.applications.filter((a) => a.status !== "draft").length;
  const projectsCompleted = data.projects.filter((p) => p.status === "completed").length;
  const passedAssessments = data.assessments.filter((a) => a.passed).length;

  const readiness = computePlacementReadiness({
    profile: data.profile,
    projectsCompleted,
    projectsTotal: data.projects.length,
    assessmentsPassed: passedAssessments,
    assessmentsTotal: data.assessments.length,
    applicationsSubmitted: submittedApps,
    certificates: data.certificates.length,
  });

  const cards = [
    { label: "Applications", value: submittedApps, icon: FileText, to: "/applications" },
    { label: "Assessments", value: data.assessments.length, icon: ClipboardCheck, to: "/assessments" },
    { label: "Projects active", value: data.projects.filter((p) => p.status !== "completed").length, icon: FolderKanban, to: "/projects" },
    { label: "Certificates", value: data.certificates.length, icon: Award, to: "/certificates" },
  ];

  const upcoming = data.projects
    .filter((p) => p.deadline && p.status !== "completed")
    .sort((a, b) => (a.deadline! < b.deadline! ? -1 : 1))
    .slice(0, 4);

  const aiRecs = buildRecommendations(data.profile, submittedApps, data.projects.length, data.certificates.length);

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        description="Your internship journey at a glance."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((c) => (
              <Link key={c.label} to={c.to} className="block">
                <Card className="border-border/60 transition-colors hover:border-accent/60">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{c.label}</CardTitle>
                    <c.icon className="h-4 w-4 text-accent" />
                  </CardHeader>
                  <CardContent><div className="font-serif text-4xl">{c.value}</div></CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="font-serif text-lg">Current track</CardTitle>
              </CardHeader>
              <CardContent>
                {currentTrack ? (
                  <div>
                    <Badge className="mb-2 bg-accent text-accent-foreground">Accepted</Badge>
                    <div className="font-serif text-2xl">{currentTrack.title}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{currentTrack.tagline}</p>
                    <Link to="/projects" className="mt-4 inline-flex items-center gap-1 text-sm underline underline-offset-4">
                      Go to projects <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No accepted track yet. Explore open tracks and apply.
                    <div className="mt-4">
                      <Link to="/applications"><Button size="sm">Browse tracks</Button></Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="font-serif text-lg flex items-center gap-2">
                  <Target className="h-4 w-4 text-accent" /> Placement readiness
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-3 flex items-end justify-between">
                  <div className="font-serif text-4xl">{readiness.percent}%</div>
                  <div className="text-xs text-muted-foreground">weighted</div>
                </div>
                <Progress value={readiness.percent} className="h-2" />
                <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {readiness.factors.map((f) => (
                    <li key={f.label} className="flex items-center justify-between">
                      <span>{f.label}</span><span className="text-foreground">{f.score}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/60">
            <CardHeader><CardTitle className="font-serif text-lg">Recent activity</CardTitle></CardHeader>
            <CardContent>
              {data.activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet. Your actions across the portal will appear here.</p>
              ) : (
                <ol className="space-y-3">
                  {data.activity.map((a) => (
                    <li key={a.id} className="flex items-start justify-between gap-3 text-sm">
                      <span>{a.activity}</span>
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader><CardTitle className="font-serif text-lg">Upcoming tasks</CardTitle></CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing due right now. Kick off a project to see deadlines here.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {upcoming.map((u) => (
                    <li key={u.id} className="flex items-center justify-between">
                      <span>{u.title}</span>
                      <span className="text-xs text-muted-foreground">
                        due {new Date(u.deadline!).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="border-border/60">
            <CardHeader><CardTitle className="font-serif text-lg">Profile completion</CardTitle></CardHeader>
            <CardContent>
              <div className="mb-3 flex items-end justify-between">
                <div className="font-serif text-4xl">{completion.percent}%</div>
                <Link to="/profile" className="text-xs underline underline-offset-4">Edit</Link>
              </div>
              <Progress value={completion.percent} className="h-2" />
              {completion.percent < 100 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Complete your profile to unlock better track matching.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-serif text-lg flex items-center gap-2">
                <Bell className="h-4 w-4 text-accent" /> Notifications
              </CardTitle>
              <Link to="/notifications" className="text-xs underline underline-offset-4">All</Link>
            </CardHeader>
            <CardContent>
              {data.notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">You're all caught up.</p>
              ) : (
                <ul className="space-y-3 text-sm">
                  {data.notifications.map((n) => (
                    <li key={n.id} className="flex flex-col">
                      <div className="flex items-center justify-between">
                        <span className={n.read_at ? "text-muted-foreground" : "font-medium"}>{n.title}</span>
                        {!n.read_at && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="font-serif text-lg flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" /> AI recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                {aiRecs.map((r) => (
                  <li key={r.title}>
                    <Link to={r.to} className="block rounded-md border border-border/60 p-3 hover:border-accent/60">
                      <div className="font-medium">{r.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{r.body}</div>
                    </Link>
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

function buildRecommendations(profile: ProfileRow | null, apps: number, projects: number, certs: number) {
  const r: { title: string; body: string; to: string }[] = [];
  if (!profile || computeProfileCompletion(profile).percent < 80) {
    r.push({ title: "Finish your profile", body: "A stronger profile improves track matching and placement readiness.", to: "/profile" });
  }
  if (!profile?.resume_url) {
    r.push({ title: "Upload your resume", body: "A current PDF resume is required before applying to most tracks.", to: "/profile" });
  }
  if (apps === 0) {
    r.push({ title: "Apply to a track", body: "Browse open internship tracks and submit your first application.", to: "/applications" });
  }
  if (projects === 0 && apps > 0) {
    r.push({ title: "Await mentor assignment", body: "Once accepted, your first project will appear under Projects.", to: "/projects" });
  }
  if (certs === 0 && projects > 0) {
    r.push({ title: "Complete a project to earn a certificate", body: "Certificates are issued when your capstone is reviewed.", to: "/projects" });
  }
  if (r.length === 0) {
    r.push({ title: "Keep momentum", body: "Everything looks great. Review your projects and keep shipping.", to: "/projects" });
  }
  return r.slice(0, 4);
}
