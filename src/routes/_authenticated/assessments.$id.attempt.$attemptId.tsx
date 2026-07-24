import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-hooks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, Flag, Eraser, Clock, ShieldAlert, Save, Send, Loader2, Maximize2, FileUp,
} from "lucide-react";
import { parseOptions, scoreAnswer, wordCount, isReasonableShortAnswer, type QuestionOption } from "@/lib/assessments";
import type { Database } from "@/integrations/supabase/types";

type Q = Database["public"]["Tables"]["assessment_questions"]["Row"];
type Attempt = Database["public"]["Tables"]["assessment_attempts"]["Row"];
type Answer = Database["public"]["Tables"]["attempt_answers"]["Row"];

const CODING_LANGS = ["python", "javascript", "java", "cpp"] as const;

export const Route = createFileRoute("/_authenticated/assessments/$id/attempt/$attemptId")({
  head: () => ({ meta: [{ title: "Attempt — SarlaYash Blessings" }] }),
  component: AttemptRunner,
});

interface LocalAnswer {
  answer: unknown;
  marked_for_review: boolean;
  dirty: boolean;
  saved_at?: number;
}

function AttemptRunner() {
  const { id, attemptId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, LocalAnswer>>({});
  const [violations, setViolations] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [warned, setWarned] = useState<string | null>(null);
  const startedAtRef = useRef<number>(Date.now());
  const questionStartRef = useRef<number>(Date.now());
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const { data, isLoading } = useQuery({
    queryKey: ["attempt", attemptId],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: attempt }, { data: assessment }, { data: questions }, { data: prior }] = await Promise.all([
        supabase.from("assessment_attempts").select("*").eq("id", attemptId).maybeSingle(),
        supabase.from("assessments").select("*").eq("id", id).maybeSingle(),
        supabase.from("assessment_questions").select("*").eq("assessment_id", id).order("order_index"),
        supabase.from("attempt_answers").select("*").eq("attempt_id", attemptId),
      ]);
      return { attempt, assessment, questions: questions ?? [], prior: prior ?? [] };
    },
  });

  const questions = useMemo(() => {
    if (!data?.assessment?.shuffle_questions) return data?.questions ?? [];
    const arr = [...(data?.questions ?? [])];
    // stable seed by attempt id
    let seed = attemptId.split("").reduce((s: number, c: string) => s + c.charCodeAt(0), 0);
    const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [data?.questions, data?.assessment?.shuffle_questions, attemptId]);

  // hydrate local answers from server prior
  useEffect(() => {
    if (!data?.prior) return;
    const map: Record<string, LocalAnswer> = {};
    for (const p of data.prior as Answer[]) {
      map[p.question_id] = { answer: p.answer, marked_for_review: p.marked_for_review, dirty: false };
    }
    setAnswers(map);
    if (data.attempt) {
      setCurrent(Math.min(Math.max(0, data.attempt.current_question_index), Math.max(0, questions.length - 1)));
      setViolations(data.attempt.violations_count);
    }
  }, [data?.prior, data?.attempt, questions.length]);

  // Timer
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const deadlineMs = data?.attempt ? new Date(data.attempt.started_at).getTime() + (data.assessment?.duration_minutes ?? 30) * 60_000 : 0;
  const secondsLeft = Math.max(0, Math.floor((deadlineMs - now) / 1000));
  const timerLow = secondsLeft > 0 && secondsLeft < 60;

  // Anti-cheat
  const violationLimit = data?.assessment?.violation_limit ?? 3;
  const antiCheat = (data?.assessment?.anti_cheat as { tab_switch?: boolean; blur?: boolean; fullscreen?: boolean } | null) ?? {};

  const logViolation = useCallback(async (type: string, detail?: string) => {
    if (!user || !data?.attempt || data.attempt.status !== "in_progress") return;
    setViolations((v) => v + 1);
    setWarned(type);
    await supabase.from("assessment_violations").insert({
      attempt_id: attemptId, user_id: user.id, type, detail: detail ?? null,
    });
    await supabase.from("assessment_attempts").update({ violations_count: (data.attempt.violations_count ?? 0) + 1 }).eq("id", attemptId);
  }, [user, data?.attempt, attemptId]);

  useEffect(() => {
    if (!data?.assessment) return;
    if (data.attempt?.status !== "in_progress") return;
    const onVis = () => { if (document.hidden && antiCheat.tab_switch !== false) void logViolation("tab_switch"); };
    const onBlur = () => { if (antiCheat.blur !== false) void logViolation("blur"); };
    const onFsChange = () => { if (antiCheat.fullscreen && !document.fullscreenElement) void logViolation("fullscreen_exit"); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFsChange);
    };
  }, [data?.assessment, data?.attempt?.status, antiCheat.tab_switch, antiCheat.blur, antiCheat.fullscreen, logViolation]);

  // Warn before leaving
  useEffect(() => {
    if (data?.attempt?.status !== "in_progress") return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [data?.attempt?.status]);

  // Autosave dirty answers every 15s
  const saveDirty = useCallback(async () => {
    if (!user || !data?.attempt || data.attempt.status !== "in_progress") return;
    const dirty = Object.entries(answersRef.current).filter(([, a]) => a.dirty);
    if (dirty.length === 0) return;
    const rows = dirty.map(([question_id, a]) => ({
      attempt_id: attemptId,
      question_id,
      user_id: user.id,
      answer: (a.answer ?? null) as never,
      marked_for_review: a.marked_for_review,
      autosaved_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from("attempt_answers").upsert(rows, { onConflict: "attempt_id,question_id" });
    if (error) { console.error(error); return; }
    setAnswers((prev) => {
      const next = { ...prev };
      const savedAt = Date.now();
      for (const [qid] of dirty) if (next[qid]) next[qid] = { ...next[qid], dirty: false, saved_at: savedAt };
      return next;
    });
  }, [user, data?.attempt, attemptId]);

  useEffect(() => {
    const t = setInterval(() => { void saveDirty(); }, 15_000);
    return () => clearInterval(t);
  }, [saveDirty]);

  const submitAttempt = useCallback(async (auto = false) => {
    if (!user || !data?.assessment || !data.attempt) return;
    setSubmitting(true);
    await saveDirty();
    const questionsById = new Map(questions.map((q) => [q.id, q]));
    const { data: latest } = await supabase.from("attempt_answers").select("*").eq("attempt_id", attemptId);
    let totalAwarded = 0;
    let totalMax = 0;
    const updates: { id: string; marks_awarded: number; is_correct: boolean | null }[] = [];
    for (const q of questions) {
      totalMax += Number(q.marks) || 0;
      const ans = (latest ?? []).find((a) => a.question_id === q.id);
      const { marks_awarded, is_correct } = scoreAnswer(q, ans?.answer);
      if (ans) updates.push({ id: ans.id, marks_awarded, is_correct });
      totalAwarded += marks_awarded;
    }
    for (const u of updates) {
      await supabase.from("attempt_answers").update({ marks_awarded: u.marks_awarded, is_correct: u.is_correct }).eq("id", u.id);
    }
    const pct = totalMax > 0 ? Math.max(0, Math.round((totalAwarded / totalMax) * 10000) / 100) : 0;
    const passed = pct >= (data.assessment.passing_score ?? 0);
    const timeSpent = Math.floor((Date.now() - startedAtRef.current) / 1000);
    await supabase.from("assessment_attempts").update({
      status: auto ? "auto_submitted" : "submitted",
      submitted_at: new Date().toISOString(),
      score: totalAwarded,
      max_score: totalMax,
      percentage: pct,
      passed,
      time_spent_seconds: (data.attempt.time_spent_seconds ?? 0) + timeSpent,
    }).eq("id", attemptId);
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      activity: `${passed ? "Passed" : "Completed"} assessment: ${data.assessment.title}`,
      metadata: { assessment_id: id, attempt_id: attemptId, percentage: pct },
    });
    setSubmitting(false);
    void qc.invalidateQueries();
    navigate({ to: "/assessments/$id/result/$attemptId", params: { id, attemptId } });
  }, [user, data?.assessment, data?.attempt, questions, saveDirty, attemptId, id, navigate, qc]);

  // Time expiry / violation auto-submit
  useEffect(() => {
    if (!data?.attempt || data.attempt.status !== "in_progress") return;
    if (secondsLeft === 0 && deadlineMs > 0) {
      toast.warning("Time is up. Auto-submitting…");
      void submitAttempt(true);
    }
  }, [secondsLeft, deadlineMs, data?.attempt, submitAttempt]);

  useEffect(() => {
    if (!data?.attempt || data.attempt.status !== "in_progress") return;
    if (violations >= violationLimit && violationLimit > 0) {
      toast.error("Violation limit reached. Auto-submitting…");
      void submitAttempt(true);
    }
  }, [violations, violationLimit, data?.attempt, submitAttempt]);

  if (isLoading || !data) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!data.attempt || !data.assessment) {
    return <div className="p-8 text-sm text-muted-foreground">Attempt not found. <Link to="/assessments" className="underline">Back</Link></div>;
  }
  if (data.attempt.status !== "in_progress") {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h2 className="font-serif text-2xl">This attempt is already submitted</h2>
        <p className="mt-2 text-sm text-muted-foreground">View your result to see the report.</p>
        <div className="mt-4 flex justify-center gap-2">
          <Link to="/assessments/$id/result/$attemptId" params={{ id, attemptId }}><Button>View report</Button></Link>
          <Link to="/assessments"><Button variant="outline">All assessments</Button></Link>
        </div>
      </div>
    );
  }

  const q = questions[current];
  if (!q) {
    return <div className="p-8 text-sm text-muted-foreground">This assessment has no questions.</div>;
  }
  const localAns = answers[q.id];
  const answered = questions.filter((qq) => hasAnswer(answers[qq.id]?.answer)).length;
  const flagged = questions.filter((qq) => answers[qq.id]?.marked_for_review).length;
  const skipped = questions.length - answered;

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  function updateAnswer(next: unknown) {
    setAnswers((prev) => ({ ...prev, [q.id]: { answer: next, marked_for_review: prev[q.id]?.marked_for_review ?? false, dirty: true } }));
  }
  function toggleReview() {
    setAnswers((prev) => ({ ...prev, [q.id]: { answer: prev[q.id]?.answer, marked_for_review: !prev[q.id]?.marked_for_review, dirty: true } }));
  }
  function clearAnswer() {
    setAnswers((prev) => ({ ...prev, [q.id]: { answer: null, marked_for_review: prev[q.id]?.marked_for_review ?? false, dirty: true } }));
  }
  async function goto(idx: number) {
    if (idx < 0 || idx >= questions.length) return;
    const spent = Math.floor((Date.now() - questionStartRef.current) / 1000);
    questionStartRef.current = Date.now();
    // Persist per-question time
    const cur = answersRef.current[q.id];
    if (cur) {
      await supabase.from("attempt_answers").upsert({
        attempt_id: attemptId,
        question_id: q.id,
        user_id: user!.id,
        answer: (cur.answer ?? null) as never,
        marked_for_review: cur.marked_for_review,
        time_spent_seconds: spent,
        autosaved_at: new Date().toISOString(),
      }, { onConflict: "attempt_id,question_id" });
      setAnswers((prev) => ({ ...prev, [q.id]: { ...prev[q.id]!, dirty: false, saved_at: Date.now() } }));
    }
    await supabase.from("assessment_attempts").update({ current_question_index: idx }).eq("id", attemptId);
    setCurrent(idx);
  }

  return (
    <div className="mx-auto -mx-6 -my-8 min-h-screen bg-background md:-mx-10 md:-my-12">
      {/* Header bar */}
      <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:px-8">
        <div>
          <div className="font-serif text-lg leading-tight">{data.assessment.title}</div>
          <div className="text-xs text-muted-foreground">Question {current + 1} of {questions.length}</div>
        </div>
        <div className="flex items-center gap-3">
          <div className={"flex items-center gap-2 rounded-md border px-3 py-1.5 font-mono text-lg tabular-nums " + (timerLow ? "border-destructive text-destructive animate-pulse" : "border-border")}>
            <Clock className="h-4 w-4" />
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </div>
          <Button size="sm" variant="outline" onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}>
            <Maximize2 className="mr-1 h-3 w-3" /> Fullscreen
          </Button>
          <Button size="sm" onClick={() => setConfirmOpen(true)}>
            <Send className="mr-1 h-3 w-3" /> Submit
          </Button>
        </div>
      </div>

      {violations > 0 && (
        <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive md:px-8">
          <ShieldAlert className="mr-1 inline h-3 w-3" />
          {violations}/{violationLimit} violation{violations !== 1 && "s"} logged. Attempt will auto-submit at the limit.
        </div>
      )}

      <div className="grid gap-6 px-4 py-6 md:grid-cols-[1fr_260px] md:px-8">
        {/* Question panel */}
        <div className="space-y-6">
          <Progress value={((current + 1) / questions.length) * 100} className="h-1" />
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline">{typeLabel(q.type)}</Badge>
              <Badge variant="outline">{Number(q.marks)} mark{Number(q.marks) !== 1 && "s"}</Badge>
              <Badge variant="outline">{q.difficulty}</Badge>
              {q.tags?.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
              {localAns?.marked_for_review && <Badge className="bg-amber-500/20 text-amber-800">Marked for review</Badge>}
              {localAns?.saved_at && !localAns.dirty && <span className="ml-auto text-muted-foreground"><Save className="mr-1 inline h-3 w-3" />Saved</span>}
            </div>
            <div className="mb-2 text-lg font-medium">{current + 1}. {q.prompt}</div>
            {q.description && <div className="mb-4 whitespace-pre-wrap text-sm text-muted-foreground">{q.description}</div>}
            {q.image_url && <img src={q.image_url} alt="" className="mb-4 max-h-72 rounded border" />}
            {q.attachment_url && <a href={q.attachment_url} target="_blank" rel="noreferrer" className="mb-4 inline-block text-sm underline">Download attachment</a>}

            <div className="mt-4">
              <QuestionInput
                q={q}
                value={localAns?.answer}
                shuffleOptions={!!data.assessment.shuffle_options}
                attemptId={attemptId}
                userId={user!.id}
                onChange={updateAnswer}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => goto(current - 1)} disabled={current === 0}>
                <ChevronLeft className="mr-1 h-3 w-3" /> Previous
              </Button>
              <Button size="sm" variant="outline" onClick={clearAnswer}>
                <Eraser className="mr-1 h-3 w-3" /> Clear
              </Button>
              <Button size="sm" variant="outline" onClick={toggleReview}>
                <Flag className="mr-1 h-3 w-3" /> {localAns?.marked_for_review ? "Unmark" : "Mark for review"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => void saveDirty()}>
                <Save className="mr-1 h-3 w-3" /> Save
              </Button>
            </div>
            <Button size="sm" onClick={() => goto(current + 1)} disabled={current === questions.length - 1}>
              Next <ChevronRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Palette */}
        <aside className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between text-xs">
              <div className="font-medium">Question palette</div>
              <div className="text-muted-foreground">{answered}/{questions.length}</div>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {questions.map((qq, i) => {
                const a = answers[qq.id];
                const state = i === current ? "current"
                  : a?.marked_for_review ? "review"
                  : hasAnswer(a?.answer) ? "answered" : "skipped";
                const cls =
                  state === "current" ? "bg-primary text-primary-foreground ring-2 ring-primary"
                  : state === "answered" ? "bg-emerald-500 text-white"
                  : state === "review" ? "bg-amber-400 text-black"
                  : "bg-muted text-foreground";
                return (
                  <button key={qq.id} onClick={() => goto(i)} className={"h-8 w-8 rounded text-xs font-medium " + cls}>
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
              <li><span className="mr-2 inline-block h-3 w-3 rounded bg-emerald-500 align-middle" />Answered ({answered})</li>
              <li><span className="mr-2 inline-block h-3 w-3 rounded bg-amber-400 align-middle" />Marked ({flagged})</li>
              <li><span className="mr-2 inline-block h-3 w-3 rounded bg-muted align-middle" />Skipped ({skipped})</li>
            </ul>
          </div>
        </aside>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-2xl">Submit attempt?</AlertDialogTitle>
            <AlertDialogDescription>
              You have {answered} answered, {flagged} marked for review, and {skipped} unanswered questions.
              {" "}Time remaining: {mins}m {secs}s. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep working</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmOpen(false); void submitAttempt(false); }} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit final"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!warned} onOpenChange={() => setWarned(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-xl flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-destructive" />Violation logged</AlertDialogTitle>
            <AlertDialogDescription>
              {warned === "tab_switch" && "Switching tabs during an assessment is not allowed."}
              {warned === "blur" && "Leaving the assessment window is not allowed."}
              {warned === "fullscreen_exit" && "Exiting fullscreen is not allowed for this assessment."}
              {" "}You have {Math.max(0, violationLimit - violations)} warning{violationLimit - violations !== 1 && "s"} left before auto-submit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setWarned(null)}>Understood</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function hasAnswer(a: unknown): boolean {
  if (a === null || a === undefined || a === "") return false;
  if (Array.isArray(a) && a.length === 0) return false;
  return true;
}

function typeLabel(t: Q["type"]): string {
  const m: Record<string, string> = {
    mcq: "MCQ", multi_select: "Multi-select", true_false: "True/False",
    short_answer: "Short answer", long_answer: "Long answer", coding: "Coding",
    file_upload: "File upload", case_study: "Case study", video_response: "Video",
  };
  return m[t] ?? t;
}

function QuestionInput({
  q, value, shuffleOptions, attemptId, userId, onChange,
}: {
  q: Q; value: unknown; shuffleOptions: boolean;
  attemptId: string; userId: string;
  onChange: (v: unknown) => void;
}) {
  const options = useMemo<QuestionOption[]>(() => {
    const base = parseOptions(q.options);
    if (!shuffleOptions) return base;
    const arr = [...base];
    let seed = (attemptId + q.id).split("").reduce((s: number, c: string) => s + c.charCodeAt(0), 0);
    const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [q.options, q.id, shuffleOptions, attemptId]);

  if (q.type === "mcq") {
    return (
      <RadioGroup value={value ? String(value) : ""} onValueChange={onChange}>
        {options.map((o) => (
          <div key={o.id} className="flex items-start gap-2 rounded-md border border-border p-3 hover:bg-secondary/40">
            <RadioGroupItem id={q.id + o.id} value={o.id} className="mt-0.5" />
            <Label htmlFor={q.id + o.id} className="flex-1 cursor-pointer text-sm">{o.text}</Label>
          </div>
        ))}
      </RadioGroup>
    );
  }

  if (q.type === "true_false") {
    return (
      <RadioGroup value={value ? String(value) : ""} onValueChange={onChange} className="grid grid-cols-2 gap-3">
        {["true", "false"].map((v) => (
          <div key={v} className="flex items-center gap-2 rounded-md border border-border p-3">
            <RadioGroupItem id={q.id + v} value={v} />
            <Label htmlFor={q.id + v} className="cursor-pointer capitalize">{v}</Label>
          </div>
        ))}
      </RadioGroup>
    );
  }

  if (q.type === "multi_select") {
    const arr = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className="space-y-2">
        {options.map((o) => {
          const checked = arr.includes(o.id);
          return (
            <div key={o.id} className="flex items-start gap-2 rounded-md border border-border p-3 hover:bg-secondary/40">
              <Checkbox id={q.id + o.id} checked={checked} onCheckedChange={(c) => {
                const next = c ? [...arr, o.id] : arr.filter((x) => x !== o.id);
                onChange(next);
              }} className="mt-0.5" />
              <Label htmlFor={q.id + o.id} className="flex-1 cursor-pointer text-sm">{o.text}</Label>
            </div>
          );
        })}
      </div>
    );
  }

  if (q.type === "short_answer") {
    const meta = (q.metadata as { min_words?: number; max_words?: number } | null) ?? {};
    const text = typeof value === "string" ? value : "";
    const wc = wordCount(text);
    const reasonable = text.length === 0 || isReasonableShortAnswer(text);
    return (
      <div className="space-y-2">
        <Input value={text} onChange={(e) => onChange(e.target.value)} placeholder="Your answer" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{wc} word{wc !== 1 && "s"}{meta.min_words ? ` · min ${meta.min_words}` : ""}{meta.max_words ? ` · max ${meta.max_words}` : ""}</span>
          {!reasonable && <span className="text-destructive">Please write a meaningful answer.</span>}
        </div>
      </div>
    );
  }

  if (q.type === "long_answer" || q.type === "case_study") {
    const meta = (q.metadata as { min_words?: number; max_words?: number } | null) ?? {};
    const text = typeof value === "string" ? value : "";
    const wc = wordCount(text);
    return (
      <div className="space-y-2">
        <Textarea rows={10} value={text} onChange={(e) => onChange(e.target.value)} placeholder="Write your answer here…" />
        <div className="text-xs text-muted-foreground">
          {wc} word{wc !== 1 && "s"}{meta.min_words ? ` · min ${meta.min_words}` : ""}{meta.max_words ? ` · max ${meta.max_words}` : ""}
        </div>
      </div>
    );
  }

  if (q.type === "coding") {
    const meta = (q.metadata as { languages?: string[]; starter?: Record<string, string>; test_cases?: { input: string; expected: string }[] } | null) ?? {};
    const val = (value && typeof value === "object" ? value : {}) as { language?: string; code?: string };
    const langs = (meta.languages && meta.languages.length > 0 ? meta.languages : CODING_LANGS) as readonly string[];
    const lang = val.language ?? langs[0];
    const code = val.code ?? meta.starter?.[lang] ?? "";
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Label className="text-xs">Language</Label>
          <Select value={lang} onValueChange={(l) => onChange({ language: l, code })}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {langs.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Textarea rows={14} spellCheck={false} className="font-mono text-sm" value={code}
          onChange={(e) => onChange({ language: lang, code: e.target.value })} placeholder="// Write your solution here" />
        {meta.test_cases && meta.test_cases.length > 0 && (
          <div className="rounded-md border border-border bg-secondary/40 p-3 text-xs">
            <div className="mb-1 font-medium">Sample test cases</div>
            <ul className="space-y-1">
              {meta.test_cases.slice(0, 3).map((tc, i) => (
                <li key={i}><span className="text-muted-foreground">in:</span> <code>{tc.input}</code> · <span className="text-muted-foreground">out:</span> <code>{tc.expected}</code></li>
              ))}
            </ul>
            <p className="mt-2 text-muted-foreground">Grading integration (Judge0) runs upon admin review.</p>
          </div>
        )}
      </div>
    );
  }

  if (q.type === "file_upload") {
    const meta = (q.metadata as { max_mb?: number; accept?: string[] } | null) ?? {};
    const val = (value && typeof value === "object" ? value : {}) as { path?: string; name?: string };
    return (
      <div className="space-y-2">
        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border p-4 text-sm hover:bg-secondary/40">
          <FileUp className="h-4 w-4" />
          <span>{val.name ?? "Click to choose a file"}</span>
          <input
            type="file"
            className="hidden"
            accept={(meta.accept ?? [".pdf", ".docx", ".zip", ".png", ".jpg", ".jpeg"]).join(",")}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const max = (meta.max_mb ?? 10) * 1024 * 1024;
              if (f.size > max) { toast.error(`File exceeds ${meta.max_mb ?? 10} MB`); return; }
              const path = `${userId}/${attemptId}/${q.id}-${Date.now()}-${f.name}`;
              const { error } = await supabase.storage.from("project-submissions").upload(path, f, { upsert: true });
              if (error) { toast.error(error.message); return; }
              onChange({ path, name: f.name, size: f.size });
              toast.success("File uploaded");
            }}
          />
        </label>
        {val.path && <p className="text-xs text-muted-foreground">Uploaded: {val.name}</p>}
        <p className="text-xs text-muted-foreground">Accepted: {(meta.accept ?? [".pdf", ".docx", ".zip", ".png", ".jpg"]).join(", ")} · Max {meta.max_mb ?? 10} MB</p>
      </div>
    );
  }

  return <p className="text-sm text-muted-foreground">This question type is not yet supported.</p>;
}
