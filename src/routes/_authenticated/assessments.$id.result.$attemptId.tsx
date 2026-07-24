import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, MinusCircle, ArrowLeft, Award, Clock, ShieldAlert } from "lucide-react";
import { parseOptions } from "@/lib/assessments";

export const Route = createFileRoute("/_authenticated/assessments/$id/result/$attemptId")({
  head: () => ({ meta: [{ title: "Result — SarlaYash Blessings" }] }),
  component: ResultPage,
});

function ResultPage() {
  const { id, attemptId } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["attempt-result", attemptId],
    queryFn: async () => {
      const [{ data: attempt }, { data: assessment }, { data: questions }, { data: answers }, { data: violations }] = await Promise.all([
        supabase.from("assessment_attempts").select("*").eq("id", attemptId).maybeSingle(),
        supabase.from("assessments").select("*").eq("id", id).maybeSingle(),
        supabase.from("assessment_questions").select("*").eq("assessment_id", id).order("order_index"),
        supabase.from("attempt_answers").select("*").eq("attempt_id", attemptId),
        supabase.from("assessment_violations").select("*").eq("attempt_id", attemptId).order("created_at"),
      ]);
      return { attempt, assessment, questions: questions ?? [], answers: answers ?? [], violations: violations ?? [] };
    },
  });

  if (isLoading || !data) return <div className="h-64 animate-pulse rounded-lg bg-muted" />;
  if (!data.attempt || !data.assessment) {
    return <div className="p-8 text-sm text-muted-foreground">Result not found. <Link to="/assessments" className="underline">Back</Link></div>;
  }
  const a = data.attempt;
  const asmt = data.assessment;
  const answerByQ = new Map(data.answers.map((x) => [x.question_id, x]));
  const totalQ = data.questions.length;
  const correct = data.answers.filter((x) => x.is_correct === true).length;
  const wrong = data.answers.filter((x) => x.is_correct === false).length;
  const pending = totalQ - correct - wrong;
  const spentMin = Math.floor((a.time_spent_seconds ?? 0) / 60);

  const showAnswers = asmt.allow_review && a.status !== "in_progress";

  return (
    <div>
      <Link to="/assessments/$id" params={{ id }} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Back to assessment
      </Link>
      <PageHeader title="Assessment report" description={asmt.title} />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card className="border-border/60">
            <CardHeader><CardTitle className="font-serif text-lg">Overall performance</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <div className="font-serif text-6xl">{Number(a.percentage).toFixed(0)}%</div>
                  <div className="text-sm text-muted-foreground">Passing: {asmt.passing_score}%</div>
                </div>
                <Badge className={a.passed ? "bg-emerald-600 text-white" : "bg-destructive text-destructive-foreground"}>
                  {a.passed ? "Passed" : "Not passed"}
                </Badge>
              </div>
              <Progress value={Number(a.percentage)} className="h-2" />
              <div className="grid grid-cols-3 gap-4 text-center text-sm">
                <div><div className="font-serif text-2xl text-emerald-600">{correct}</div><div className="text-xs text-muted-foreground">Correct</div></div>
                <div><div className="font-serif text-2xl text-destructive">{wrong}</div><div className="text-xs text-muted-foreground">Wrong</div></div>
                <div><div className="font-serif text-2xl text-muted-foreground">{pending}</div><div className="text-xs text-muted-foreground">Pending review</div></div>
              </div>
            </CardContent>
          </Card>

          {showAnswers && (
            <Card className="border-border/60">
              <CardHeader><CardTitle className="font-serif text-lg">Question review</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {data.questions.map((q, i) => {
                  const ans = answerByQ.get(q.id);
                  const state = ans?.is_correct === true ? "correct" : ans?.is_correct === false ? "wrong" : "pending";
                  const icon = state === "correct" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    : state === "wrong" ? <XCircle className="h-4 w-4 text-destructive" />
                    : <MinusCircle className="h-4 w-4 text-muted-foreground" />;
                  return (
                    <div key={q.id} className="rounded-md border border-border p-4">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm font-medium">{icon} Q{i + 1}. {q.prompt}</div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">{Number(ans?.marks_awarded ?? 0)}/{Number(q.marks)} marks</div>
                      </div>
                      <AnswerDisplay q={q} answer={ans?.answer} />
                      {q.explanation && (
                        <div className="mt-2 rounded bg-secondary/50 p-2 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Explanation: </span>{q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>

        <aside className="space-y-4">
          <Card className="border-border/60">
            <CardHeader><CardTitle className="font-serif text-lg">Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row icon={<Award className="h-4 w-4" />} label="Score">{Number(a.score)}/{Number(a.max_score)}</Row>
              <Row icon={<Clock className="h-4 w-4" />} label="Time taken">{spentMin} min</Row>
              <Row icon={<ShieldAlert className="h-4 w-4" />} label="Violations">{a.violations_count ?? 0}</Row>
              <Row label="Status">{a.status === "auto_submitted" ? "Auto-submitted" : "Submitted"}</Row>
              <Row label="Submitted">{a.submitted_at ? new Date(a.submitted_at).toLocaleString() : "—"}</Row>
            </CardContent>
          </Card>

          {data.violations.length > 0 && (
            <Card className="border-border/60">
              <CardHeader><CardTitle className="font-serif text-lg">Violations</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2 text-xs">
                  {data.violations.map((v) => (
                    <li key={v.id} className="flex justify-between">
                      <span className="capitalize">{v.type.replace("_", " ")}</span>
                      <span className="text-muted-foreground">{new Date(v.created_at).toLocaleTimeString()}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Link to="/assessments"><Button className="w-full" variant="outline">Back to assessments</Button></Link>
        </aside>
      </div>
    </div>
  );
}

function Row({ icon, label, children }: { icon?: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-muted-foreground">{icon}{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}

function AnswerDisplay({ q, answer }: { q: { type: string; options: unknown; correct_answer: unknown }; answer: unknown }) {
  const opts = parseOptions(q.options);
  const optText = (id: unknown) => opts.find((o) => o.id === String(id))?.text ?? String(id ?? "—");
  if (q.type === "mcq" || q.type === "true_false") {
    return (
      <div className="text-xs">
        <div><span className="text-muted-foreground">Your answer:</span> {answer ? optText(answer) : <em>Skipped</em>}</div>
        <div><span className="text-muted-foreground">Correct:</span> {q.correct_answer ? optText(q.correct_answer) : "—"}</div>
      </div>
    );
  }
  if (q.type === "multi_select") {
    const given = Array.isArray(answer) ? answer.map(optText).join(", ") : "";
    const correct = Array.isArray(q.correct_answer) ? q.correct_answer.map(optText).join(", ") : "";
    return (
      <div className="text-xs">
        <div><span className="text-muted-foreground">Your answer:</span> {given || <em>Skipped</em>}</div>
        <div><span className="text-muted-foreground">Correct:</span> {correct || "—"}</div>
      </div>
    );
  }
  if (typeof answer === "string") {
    return <div className="whitespace-pre-wrap rounded bg-secondary/40 p-2 text-xs">{answer || <em>Skipped</em>}</div>;
  }
  if (answer && typeof answer === "object") {
    return <pre className="overflow-auto rounded bg-secondary/40 p-2 text-xs">{JSON.stringify(answer, null, 2)}</pre>;
  }
  return <div className="text-xs text-muted-foreground"><em>Skipped</em></div>;
}
