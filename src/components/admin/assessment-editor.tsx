import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TRACKS } from "@/lib/tracks";

interface Props {
  mode: "create" | "edit";
  initial?: Partial<{
    title: string; description: string | null; instructions: string | null;
    track: string | null; cohort: string | null; assessment_type: string;
    difficulty: string; duration_minutes: number; passing_score: number;
    max_attempts: number; violation_limit: number; deadline: string | null;
    negative_marking: boolean; shuffle_questions: boolean; shuffle_options: boolean;
    allow_review: boolean; anti_cheat: unknown;
  }>;
  onSubmit: (values: Record<string, unknown>) => Promise<unknown> | unknown;
}

export function AssessmentEditor({ mode, initial, onSubmit }: Props) {
  const anti = (initial?.anti_cheat as { tab_switch?: boolean; blur?: boolean; fullscreen?: boolean } | undefined) ?? {};
  const [values, setValues] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    instructions: initial?.instructions ?? "",
    track: initial?.track ?? "",
    cohort: initial?.cohort ?? "",
    assessment_type: initial?.assessment_type ?? "screening",
    difficulty: initial?.difficulty ?? "medium",
    duration_minutes: initial?.duration_minutes ?? 30,
    passing_score: initial?.passing_score ?? 70,
    max_attempts: initial?.max_attempts ?? 1,
    violation_limit: initial?.violation_limit ?? 3,
    deadline: initial?.deadline ? initial.deadline.slice(0, 16) : "",
    negative_marking: initial?.negative_marking ?? false,
    shuffle_questions: initial?.shuffle_questions ?? false,
    shuffle_options: initial?.shuffle_options ?? false,
    allow_review: initial?.allow_review ?? true,
    anti_tab: anti.tab_switch ?? true,
    anti_blur: anti.blur ?? true,
    anti_fs: anti.fullscreen ?? false,
  });
  const [busy, setBusy] = useState(false);

  function update<K extends keyof typeof values>(k: K, v: typeof values[K]) {
    setValues((prev) => ({ ...prev, [k]: v }));
  }

  async function save() {
    if (!values.title.trim()) return;
    setBusy(true);
    await onSubmit({
      title: values.title.trim(),
      description: values.description || null,
      instructions: values.instructions || null,
      track: values.track || null,
      cohort: values.cohort || null,
      assessment_type: values.assessment_type,
      difficulty: values.difficulty,
      duration_minutes: Number(values.duration_minutes),
      passing_score: Number(values.passing_score),
      max_attempts: Number(values.max_attempts),
      violation_limit: Number(values.violation_limit),
      deadline: values.deadline ? new Date(values.deadline).toISOString() : null,
      negative_marking: values.negative_marking,
      shuffle_questions: values.shuffle_questions,
      shuffle_options: values.shuffle_options,
      allow_review: values.allow_review,
      anti_cheat: { tab_switch: values.anti_tab, blur: values.anti_blur, fullscreen: values.anti_fs },
    });
    setBusy(false);
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="md:col-span-2">
        <CardHeader><CardTitle className="font-serif text-lg">Basics</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={values.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Full-Stack Screening" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={2} value={values.description} onChange={(e) => update("description", e.target.value)} />
          </div>
          <div>
            <Label>Instructions (shown to candidate)</Label>
            <Textarea rows={5} value={values.instructions} onChange={(e) => update("instructions", e.target.value)} placeholder="What the candidate needs to know before starting." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-serif text-lg">Targeting</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Track</Label>
            <Select value={values.track} onValueChange={(v) => update("track", v)}>
              <SelectTrigger><SelectValue placeholder="Any track" /></SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">Any track</SelectItem>
                {TRACKS.map((t) => <SelectItem key={t.slug} value={t.slug}>{t.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cohort</Label>
            <Input value={values.cohort} onChange={(e) => update("cohort", e.target.value)} placeholder="e.g. Fall 2026" />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={values.assessment_type} onValueChange={(v) => update("assessment_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="screening">Screening</SelectItem>
                <SelectItem value="skill_check">Skill check</SelectItem>
                <SelectItem value="coding">Coding challenge</SelectItem>
                <SelectItem value="capstone">Capstone</SelectItem>
                <SelectItem value="quiz">Quick quiz</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Difficulty</Label>
            <Select value={values.difficulty} onValueChange={(v) => update("difficulty", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Deadline (optional)</Label>
            <Input type="datetime-local" value={values.deadline} onChange={(e) => update("deadline", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-serif text-lg">Timing & scoring</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Duration (min)</Label><Input type="number" min={1} value={values.duration_minutes} onChange={(e) => update("duration_minutes", Number(e.target.value))} /></div>
            <div><Label>Passing %</Label><Input type="number" min={0} max={100} value={values.passing_score} onChange={(e) => update("passing_score", Number(e.target.value))} /></div>
            <div><Label>Max attempts</Label><Input type="number" min={1} value={values.max_attempts} onChange={(e) => update("max_attempts", Number(e.target.value))} /></div>
            <div><Label>Violation limit</Label><Input type="number" min={0} value={values.violation_limit} onChange={(e) => update("violation_limit", Number(e.target.value))} /></div>
          </div>
          <Toggle label="Enable negative marking" checked={values.negative_marking} onChange={(v) => update("negative_marking", v)} />
          <Toggle label="Allow candidate to review report" checked={values.allow_review} onChange={(v) => update("allow_review", v)} />
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader><CardTitle className="font-serif text-lg">Delivery & integrity</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Toggle label="Shuffle question order" checked={values.shuffle_questions} onChange={(v) => update("shuffle_questions", v)} />
          <Toggle label="Shuffle option order" checked={values.shuffle_options} onChange={(v) => update("shuffle_options", v)} />
          <Toggle label="Log tab switches" checked={values.anti_tab} onChange={(v) => update("anti_tab", v)} />
          <Toggle label="Log window blur" checked={values.anti_blur} onChange={(v) => update("anti_blur", v)} />
          <Toggle label="Require fullscreen" checked={values.anti_fs} onChange={(v) => update("anti_fs", v)} />
        </CardContent>
      </Card>

      <div className="md:col-span-2 flex justify-end">
        <Button onClick={save} disabled={busy || !values.title.trim()}>
          {busy ? "Saving…" : mode === "create" ? "Create assessment" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
      <Label className="text-sm">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
