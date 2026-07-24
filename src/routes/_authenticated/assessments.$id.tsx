import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-hooks";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState } from "react";
import { Timer, Award, ListChecks, ShieldAlert, ArrowLeft, PlayCircle, RotateCcw } from "lucide-react";
import { difficultyColor } from "@/lib/assessments";

export const Route = createFileRoute("/_authenticated/assessments/$id")({
  head: () => ({ meta: [{ title: "Assessment — SarlaYash Blessings" }] }),
  component: AssessmentLanding,
});

function AssessmentLanding() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const uid = user?.id;
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["assessment-landing", id, uid],
    enabled: !!uid,
    queryFn: async () => {
      const [{ data: assessment }, { data: questions }, { data: attempts }] = await Promise.all([
        supabase.from("assessments").select("*").eq("id", id).maybeSingle(),
        supabase.from("assessment_questions").select("id,marks,difficulty,type").eq("assessment_id", id),
        supabase.from("assessment_attempts").select("*").eq("assessment_id", id).eq("user_id", uid!).order("created_at", { ascending: false }),
      ]);
      return { assessment, questions: questions ?? [], attempts: attempts ?? [] };
    },
  });

  if (isLoading || !data) {
    return <div className="h-64 animate-pulse rounded-lg bg-muted" />;
  }
  if (!data.assessment) {
    return (
      <div>
        <PageHeader title="Not found" />
        <p className="text-sm text-muted-foreground">This assessment doesn't exist or you don't have access to it.</p>
        <Link to="/assessments" className="mt-4 inline-block text-sm underline">Back to assessments</Link>
      </div>
    );
  }

  const a = data.assessment;
  const submitted = data.attempts.filter((t) => t.status !== "in_progress");
  const inProg = data.attempts.find((t) => t.status === "in_progress");
  const attemptsLeft = Math.max(0, (a.max_attempts ?? 1) - submitted.length);
  const totalMarks = a.total_marks || data.questions.reduce((s, q) => s + Number(q.marks || 0), 0);

  async function startAttempt() {
    if (!uid) return;
    setStarting(true);
    let attemptId = inProg?.id;
    if (!attemptId) {
      const { data: created, error } = await supabase.from("assessment_attempts").insert({
        user_id: uid,
        assessment_id: id,
        status: "in_progress",
        max_score: totalMarks,
      }).select("id").single();
      if (error) {
        setStarting(false);
        toast.error(error.message);
        return;
      }
      attemptId = created.id;
      void supabase.from("activity_logs").insert({
        user_id: uid,
        activity: `Started assessment: ${a.title}`,
        metadata: { assessment_id: id },
      });
    }
    navigate({ to: "/assessments/$id/attempt/$attemptId", params: { id, attemptId: attemptId! } });
  }

  return (
    <div>
      <Link to="/assessments" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> All assessments
      </Link>
      <PageHeader title={a.title} description={a.description ?? undefined} />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card className="border-border/60">
            <CardHeader><CardTitle className="font-serif text-lg">Overview</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Stat icon={<Timer className="h-4 w-4" />} label="Duration" value={`${a.duration_minutes} min`} />
                <Stat icon={<ListChecks className="h-4 w-4" />} label="Questions" value={String(data.questions.length)} />
                <Stat icon={<Award className="h-4 w-4" />} label="Total marks" value={String(totalMarks)} />
                <Stat icon={<ShieldAlert className="h-4 w-4" />} label="Passing" value={`${a.passing_score}%`} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                {a.difficulty && <span className={"rounded px-2 py-0.5 " + difficultyColor(a.difficulty)}>{a.difficulty}</span>}
                {a.track && <Badge variant="outline">{a.track}</Badge>}
                {a.cohort && <Badge variant="outline">Cohort: {a.cohort}</Badge>}
                {a.assessment_type && <Badge variant="outline">{a.assessment_type}</Badge>}
              </div>
            </CardContent>
          </Card>

          {a.instructions && (
            <Card className="border-border/60">
              <CardHeader><CardTitle className="font-serif text-lg">Instructions</CardTitle></CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm text-muted-foreground">
                  {a.instructions}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-border/60">
            <CardHeader><CardTitle className="font-serif text-lg">Rules & anti-cheat</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Tab switches and window blur are logged. After {a.violation_limit ?? 3} violations, your attempt is auto-submitted.</p>
              <p>• Answers autosave every 15 seconds; you can safely refresh and resume.</p>
              <p>• Negative marking is {a.negative_marking ? "enabled" : "disabled"}.</p>
              <p>• You have {a.max_attempts ?? 1} total attempt{(a.max_attempts ?? 1) !== 1 && "s"}.</p>
            </CardContent>
          </Card>

          {submitted.length > 0 && (
            <Card className="border-border/60">
              <CardHeader><CardTitle className="font-serif text-lg">Your attempts</CardTitle></CardHeader>
              <CardContent>
                <ul className="divide-y divide-border">
                  {submitted.map((t, i) => (
                    <li key={t.id} className="flex items-center justify-between py-3 text-sm">
                      <div>
                        <div className="font-medium">Attempt #{submitted.length - i}</div>
                        <div className="text-xs text-muted-foreground">
                          {t.submitted_at ? new Date(t.submitted_at).toLocaleString() : "—"} · {t.status === "auto_submitted" ? "auto-submitted" : "submitted"}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={"text-sm font-semibold " + (t.passed ? "text-emerald-600" : "text-muted-foreground")}>
                          {Number(t.percentage).toFixed(0)}%
                        </div>
                        {a.allow_review && (
                          <Link to="/assessments/$id/result/$attemptId" params={{ id, attemptId: t.id }}>
                            <Button size="sm" variant="outline">Report</Button>
                          </Link>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <aside>
          <Card className="border-border/60">
            <CardHeader><CardTitle className="font-serif text-lg">Ready to begin?</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {inProg
                  ? "You have an attempt in progress. Resume where you left off."
                  : attemptsLeft > 0
                  ? "Once you begin, the timer starts immediately."
                  : "You've used all attempts."}
              </p>
              <Button className="w-full" onClick={startAttempt} disabled={starting || (attemptsLeft === 0 && !inProg)}>
                {inProg ? <><RotateCcw className="mr-2 h-4 w-4" />Resume attempt</> : <><PlayCircle className="mr-2 h-4 w-4" />Start assessment</>}
              </Button>
              {!starting && data.questions.length === 0 && (
                <p className="text-xs text-destructive">This assessment has no questions yet.</p>
              )}
              <button onClick={() => refetch()} className="text-xs text-muted-foreground underline">Refresh status</button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 font-serif text-2xl">{value}</div>
    </div>
  );
}
