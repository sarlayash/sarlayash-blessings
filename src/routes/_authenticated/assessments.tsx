import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-hooks";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, Timer, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { difficultyColor } from "@/lib/assessments";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/assessments")({
  head: () => ({ meta: [{ title: "Assessments — SarlaYash Blessings" }] }),
  component: AssessmentsPage,
});

function AssessmentsPage() {
  const { user } = useAuth();
  const uid = user?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["assessments-list", uid],
    enabled: !!uid,
    queryFn: async () => {
      const [{ data: assessments }, { data: apps }, { data: assigns }, { data: attempts }] = await Promise.all([
        supabase.from("assessments").select("*").eq("status", "published").eq("is_active", true).order("created_at", { ascending: false }),
        supabase.from("applications").select("track,status").eq("user_id", uid!),
        supabase.from("assessment_assignments").select("assessment_id").eq("user_id", uid!),
        supabase.from("assessment_attempts").select("*").eq("user_id", uid!),
      ]);
      const applicableTracks = new Set((apps ?? []).filter((a) => a.status !== "withdrawn" && a.status !== "rejected").map((a) => a.track));
      const assignedIds = new Set((assigns ?? []).map((a) => a.assessment_id));
      const list = (assessments ?? []).filter((a) => !a.track || applicableTracks.has(a.track) || assignedIds.has(a.id));
      return { list, attempts: attempts ?? [] };
    },
  });

  return (
    <div>
      <PageHeader title="Assessments" description="Track evaluations, skill checks, and coding challenges." />
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />)}
        </div>
      ) : !data || data.list.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="No assessments assigned" description="New assessments will appear here as tracks release them." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.list.map((a) => {
            const mine = data.attempts.filter((t) => t.assessment_id === a.id);
            const submitted = mine.filter((t) => t.status !== "in_progress");
            const inProg = mine.find((t) => t.status === "in_progress");
            const best = submitted.sort((x, y) => Number(y.percentage) - Number(x.percentage))[0];
            const attemptsLeft = Math.max(0, (a.max_attempts ?? 1) - submitted.length);
            const canStart = attemptsLeft > 0 || !!inProg;
            const overdue = a.deadline && new Date(a.deadline) < new Date();

            return (
              <Card key={a.id} className="border-border/60">
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="font-serif text-lg">{a.title}</CardTitle>
                      {a.description && <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {best?.passed && <Badge className="bg-accent text-accent-foreground"><CheckCircle2 className="mr-1 h-3 w-3" />Passed</Badge>}
                      {inProg && <Badge variant="outline">In progress</Badge>}
                      {a.difficulty && <span className={"rounded px-2 py-0.5 text-[10px] font-medium " + difficultyColor(a.difficulty)}>{a.difficulty}</span>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Timer className="h-3 w-3" /> {a.duration_minutes} min</span>
                    <span>Pass ≥ {a.passing_score}%</span>
                    {a.total_marks > 0 && <span>{a.total_marks} marks</span>}
                    {a.track && <span>Track: {a.track}</span>}
                  </div>
                  {a.deadline && (
                    <div className={"text-xs " + (overdue ? "text-destructive" : "text-muted-foreground")}>
                      {overdue ? "Deadline passed" : `Due ${formatDistanceToNow(new Date(a.deadline), { addSuffix: true })}`}
                    </div>
                  )}
                  {best && (
                    <div className="text-sm">
                      Best score: <span className="font-medium">{Number(best.percentage).toFixed(0)}%</span>
                      <span className="text-muted-foreground"> · {submitted.length} attempt{submitted.length !== 1 && "s"} used</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground">
                      {attemptsLeft > 0 ? `${attemptsLeft} attempt${attemptsLeft !== 1 ? "s" : ""} remaining` : (
                        <span className="inline-flex items-center gap-1 text-destructive"><AlertCircle className="h-3 w-3" /> No attempts left</span>
                      )}
                    </span>
                    <Link to="/assessments/$id" params={{ id: a.id }}>
                      <Button size="sm" disabled={!canStart || Boolean(overdue && !inProg)}>
                        {inProg ? "Resume" : best ? "Retake" : "View"}
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
