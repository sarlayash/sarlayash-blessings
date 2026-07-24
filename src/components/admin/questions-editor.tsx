import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit3, ArrowUp, ArrowDown, Library } from "lucide-react";
import { toast } from "sonner";
import { QUESTION_TYPES, difficultyColor, parseOptions, type QuestionType } from "@/lib/assessments";
import type { Database } from "@/integrations/supabase/types";

type Q = Database["public"]["Tables"]["assessment_questions"]["Row"];

interface EditorProps {
  assessmentId: string;
  questions: Q[];
  onChange: () => void;
}

export function QuestionsEditor({ assessmentId, questions, onChange }: EditorProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Q | null>(null);
  const [bankOpen, setBankOpen] = useState(false);

  async function save(values: Record<string, unknown>) {
    if (editing) {
      const { error } = await supabase.from("assessment_questions").update(values as never).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Question updated");
    } else {
      const nextIndex = questions.length;
      const { error } = await supabase.from("assessment_questions").insert({
        ...values, assessment_id: assessmentId, order_index: nextIndex,
      } as never);
      if (error) return toast.error(error.message);
      toast.success("Question added");
    }
    await recomputeTotalMarks(assessmentId);
    setOpen(false);
    setEditing(null);
    onChange();
  }

  async function remove(id: string) {
    if (!confirm("Delete this question?")) return;
    const { error } = await supabase.from("assessment_questions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await recomputeTotalMarks(assessmentId);
    onChange();
  }

  async function reorder(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= questions.length) return;
    const a = questions[index], b = questions[target];
    await supabase.from("assessment_questions").update({ order_index: b.order_index }).eq("id", a.id);
    await supabase.from("assessment_questions").update({ order_index: a.order_index }).eq("id", b.id);
    onChange();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">{questions.length} question{questions.length !== 1 && "s"}</div>
        <div className="flex gap-2">
          <Dialog open={bankOpen} onOpenChange={setBankOpen}>
            <DialogTrigger asChild><Button variant="outline"><Library className="mr-1 h-4 w-4" />Import from bank</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="font-serif text-xl">Question bank</DialogTitle></DialogHeader>
              <BankImporter assessmentId={assessmentId} nextIndex={questions.length} onDone={() => { setBankOpen(false); onChange(); }} />
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />Add question</Button></DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="font-serif text-xl">{editing ? "Edit question" : "New question"}</DialogTitle></DialogHeader>
              <QuestionForm initial={editing ?? undefined} onSubmit={save} submitLabel={editing ? "Save changes" : "Add question"} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {questions.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          No questions yet. Add your first one to get started.
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {questions.map((q, i) => (
            <Card key={q.id} className="border-border/60">
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono text-muted-foreground">Q{i + 1}</span>
                    <Badge variant="outline">{QUESTION_TYPES.find((t) => t.value === q.type)?.label ?? q.type}</Badge>
                    <span className={"rounded px-1.5 py-0.5 " + difficultyColor(q.difficulty)}>{q.difficulty}</span>
                    <span className="text-muted-foreground">{Number(q.marks)} mark{Number(q.marks) !== 1 && "s"}</span>
                    {Number(q.negative_marks) > 0 && <span className="text-destructive">-{Number(q.negative_marks)}</span>}
                  </div>
                  <div className="mt-1 line-clamp-2 text-sm font-medium">{q.prompt}</div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => reorder(i, -1)} disabled={i === 0}><ArrowUp className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => reorder(i, 1)} disabled={i === questions.length - 1}><ArrowDown className="h-3 w-3" /></Button>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => { setEditing(q); setOpen(true); }}><Edit3 className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(q.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

async function recomputeTotalMarks(assessmentId: string) {
  const { data } = await supabase.from("assessment_questions").select("marks").eq("assessment_id", assessmentId);
  const total = (data ?? []).reduce((s, q) => s + Number(q.marks || 0), 0);
  await supabase.from("assessments").update({ total_marks: total }).eq("id", assessmentId);
}

function BankImporter({ assessmentId, nextIndex, onDone }: { assessmentId: string; nextIndex: number; onDone: () => void }) {
  const [items, setItems] = useState<Array<Record<string, unknown>> | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  if (items === null) {
    void (async () => {
      const { data } = await supabase.from("question_bank").select("*").order("created_at", { ascending: false });
      setItems((data ?? []) as Array<Record<string, unknown>>);
    })();
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading bank…</div>;
  }
  if (items.length === 0) return <div className="p-8 text-center text-sm text-muted-foreground">Bank is empty. Add questions from the Question bank page.</div>;

  async function importSelected() {
    const rows = items!.filter((i) => selected.has(i.id as string)).map((i, k) => ({
      assessment_id: assessmentId,
      prompt: i.prompt,
      description: i.description,
      type: i.type,
      options: i.options,
      correct_answer: i.correct_answer,
      explanation: i.explanation,
      marks: i.marks,
      difficulty: i.difficulty,
      tags: i.tags,
      order_index: nextIndex + k,
    }));
    if (rows.length === 0) return;
    const { error } = await supabase.from("assessment_questions").insert(rows as never);
    if (error) return toast.error(error.message);
    await recomputeTotalMarks(assessmentId);
    toast.success(`Imported ${rows.length} question${rows.length !== 1 ? "s" : ""}`);
    onDone();
  }

  return (
    <div className="space-y-2">
      <div className="max-h-[50vh] space-y-1 overflow-y-auto">
        {items.map((q) => {
          const on = selected.has(q.id as string);
          return (
            <label key={q.id as string} className="flex cursor-pointer items-start gap-3 rounded border border-border p-3 hover:bg-secondary/40">
              <input type="checkbox" checked={on} onChange={(e) => {
                const next = new Set(selected);
                if (e.target.checked) next.add(q.id as string); else next.delete(q.id as string);
                setSelected(next);
              }} className="mt-1" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{q.prompt as string}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {QUESTION_TYPES.find((t) => t.value === q.type)?.label ?? String(q.type)} · {String(q.difficulty)} · {Number(q.marks)} marks
                </div>
              </div>
            </label>
          );
        })}
      </div>
      <div className="flex justify-end pt-2">
        <Button onClick={importSelected} disabled={selected.size === 0}>Import {selected.size || ""}</Button>
      </div>
    </div>
  );
}

// ============================================================
// Shared question form (used in assessment editor + bank page)
// ============================================================

interface QuestionFormProps {
  initial?: Partial<{
    prompt: string; description: string | null; type: QuestionType;
    options: unknown; correct_answer: unknown; explanation: string | null;
    marks: number; negative_marks: number; difficulty: string; tags: string[];
    metadata: unknown;
  }>;
  onSubmit: (values: Record<string, unknown>) => Promise<unknown> | unknown;
  submitLabel: string;
}

export function QuestionForm({ initial, onSubmit, submitLabel }: QuestionFormProps) {
  const [prompt, setPrompt] = useState(initial?.prompt ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [type, setType] = useState<QuestionType>((initial?.type as QuestionType) ?? "mcq");
  const [options, setOptions] = useState(() => {
    const parsed = parseOptions(initial?.options);
    return parsed.length > 0 ? parsed : [{ id: "a", text: "" }, { id: "b", text: "" }];
  });
  const [correct, setCorrect] = useState<string>(() => {
    const c = initial?.correct_answer;
    if (typeof c === "string") return c;
    return "";
  });
  const [correctMulti, setCorrectMulti] = useState<string[]>(() => {
    const c = initial?.correct_answer;
    return Array.isArray(c) ? (c as unknown[]).map(String) : [];
  });
  const [correctBool, setCorrectBool] = useState<string>(() => {
    const c = initial?.correct_answer;
    return typeof c === "string" ? c : "";
  });
  const [correctText, setCorrectText] = useState<string>(() => {
    const c = initial?.correct_answer;
    return typeof c === "string" ? c : "";
  });
  const [explanation, setExplanation] = useState(initial?.explanation ?? "");
  const [marks, setMarks] = useState(initial?.marks ?? 1);
  const [negativeMarks, setNegativeMarks] = useState(initial?.negative_marks ?? 0);
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? "medium");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [busy, setBusy] = useState(false);

  function addOption() {
    setOptions([...options, { id: String.fromCharCode(97 + options.length), text: "" }]);
  }
  function removeOption(i: number) {
    const next = options.filter((_, idx) => idx !== i);
    setOptions(next);
  }

  async function submit() {
    if (!prompt.trim()) return toast.error("Prompt required");
    let correct_answer: unknown = null;
    let optionsPayload: unknown = null;
    if (type === "mcq") {
      optionsPayload = options.filter((o) => o.text.trim());
      correct_answer = correct || null;
    } else if (type === "multi_select") {
      optionsPayload = options.filter((o) => o.text.trim());
      correct_answer = correctMulti;
    } else if (type === "true_false") {
      correct_answer = correctBool || null;
    } else if (type === "short_answer") {
      correct_answer = correctText || null;
    }
    setBusy(true);
    await onSubmit({
      prompt: prompt.trim(),
      description: description || null,
      type,
      options: optionsPayload ?? [],
      correct_answer,
      explanation: explanation || null,
      marks: Number(marks),
      negative_marks: Number(negativeMarks),
      difficulty,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    });
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
        <div>
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as QuestionType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {QUESTION_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Difficulty</Label>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Prompt</Label>
        <Textarea rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="The question the candidate sees" />
      </div>
      <div>
        <Label>Extra context (optional)</Label>
        <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      {(type === "mcq" || type === "multi_select") && (
        <div className="space-y-2">
          <Label>Options {type === "mcq" ? "(pick the correct one)" : "(check every correct option)"}</Label>
          {options.map((o, i) => (
            <div key={o.id} className="flex items-center gap-2">
              {type === "mcq" ? (
                <input type="radio" name="correct" checked={correct === o.id} onChange={() => setCorrect(o.id)} />
              ) : (
                <input type="checkbox" checked={correctMulti.includes(o.id)} onChange={(e) => {
                  setCorrectMulti(e.target.checked ? [...correctMulti, o.id] : correctMulti.filter((x) => x !== o.id));
                }} />
              )}
              <Input value={o.text} onChange={(e) => {
                const next = [...options]; next[i] = { ...o, text: e.target.value }; setOptions(next);
              }} placeholder={`Option ${i + 1}`} />
              <Button size="sm" variant="ghost" onClick={() => removeOption(i)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={addOption}><Plus className="mr-1 h-3 w-3" />Add option</Button>
        </div>
      )}

      {type === "true_false" && (
        <div>
          <Label>Correct answer</Label>
          <Select value={correctBool} onValueChange={setCorrectBool}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="true">True</SelectItem>
              <SelectItem value="false">False</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {type === "short_answer" && (
        <div>
          <Label>Expected answer (used for auto-grading, case-insensitive)</Label>
          <Input value={correctText} onChange={(e) => setCorrectText(e.target.value)} placeholder="Leave blank for manual review" />
        </div>
      )}

      {(type === "long_answer" || type === "coding" || type === "file_upload" || type === "case_study") && (
        <div className="rounded-md border border-dashed border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
          This question type requires manual review by a mentor. Grading UI ships with the Reviews module.
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div><Label>Marks</Label><Input type="number" min={0} step={0.5} value={marks} onChange={(e) => setMarks(Number(e.target.value))} /></div>
        <div><Label>Negative marks</Label><Input type="number" min={0} step={0.5} value={negativeMarks} onChange={(e) => setNegativeMarks(Number(e.target.value))} /></div>
        <div><Label>Tags (comma-separated)</Label><Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="react, hooks" /></div>
      </div>

      <div>
        <Label>Explanation (shown after submission)</Label>
        <Textarea rows={2} value={explanation} onChange={(e) => setExplanation(e.target.value)} />
      </div>

      <div className="flex justify-end">
        <Button onClick={submit} disabled={busy || !prompt.trim()}>{busy ? "Saving…" : submitLabel}</Button>
      </div>
    </div>
  );
}
