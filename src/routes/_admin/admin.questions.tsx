import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-hooks";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { QuestionForm } from "@/components/admin/questions-editor";
import { Plus, Search, Edit3, Trash2, Library } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { QUESTION_TYPES, difficultyColor, type QuestionType } from "@/lib/assessments";

export const Route = createFileRoute("/_admin/admin/questions")({
  head: () => ({ meta: [{ title: "Question bank — Admin" }] }),
  component: QuestionBank,
});

function QuestionBank() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("all");
  const [difficulty, setDifficulty] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["question-bank"],
    queryFn: async () => {
      const { data } = await supabase.from("question_bank").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const filtered = (data ?? []).filter((qq) => {
    if (type !== "all" && qq.type !== type) return false;
    if (difficulty !== "all" && qq.difficulty !== difficulty) return false;
    if (q && !qq.prompt.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  async function save(values: Record<string, unknown>) {
    if (!user) return;
    if (editing) {
      const { error } = await supabase.from("question_bank").update(values as never).eq("id", editing.id as string);
      if (error) return toast.error(error.message);
      toast.success("Question updated");
    } else {
      const { error } = await supabase.from("question_bank").insert({ ...values, created_by: user.id } as never);
      if (error) return toast.error(error.message);
      toast.success("Question added");
    }
    setOpen(false);
    setEditing(null);
    void qc.invalidateQueries({ queryKey: ["question-bank"] });
  }

  async function remove(id: string) {
    if (!confirm("Delete this question?")) return;
    const { error } = await supabase.from("question_bank").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    void qc.invalidateQueries({ queryKey: ["question-bank"] });
  }

  return (
    <div>
      <PageHeader
        title="Question bank"
        description="Reusable questions across assessments."
        actions={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />New question</Button></DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="font-serif text-xl">{editing ? "Edit question" : "New question"}</DialogTitle></DialogHeader>
              <QuestionForm initial={editing ?? undefined} onSubmit={save} submitLabel={editing ? "Save changes" : "Add to bank"} />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search questions…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {QUESTION_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={difficulty} onValueChange={setDifficulty}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded bg-muted" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Library} title="Empty bank" description="Add reusable questions here to reference across assessments." />
      ) : (
        <div className="space-y-2">
          {filtered.map((qq) => (
            <Card key={qq.id} className="border-border/60">
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{qq.prompt}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{QUESTION_TYPES.find((t) => t.value === qq.type)?.label ?? qq.type}</Badge>
                    <span className={"rounded px-1.5 py-0.5 " + difficultyColor(qq.difficulty)}>{qq.difficulty}</span>
                    <span>{Number(qq.marks)} marks</span>
                    {qq.tags?.slice(0, 4).map((t: string) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => { setEditing(qq as unknown as Record<string, unknown>); setOpen(true); }}>
                    <Edit3 className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(qq.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Question type filter — narrow to satisfy generic Select typing
void ({} as QuestionType);
