import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardCheck, Plus, Edit3, Copy, Archive, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { statusColor, difficultyColor } from "@/lib/assessments";

export const Route = createFileRoute("/_admin/admin/assessments")({
  head: () => ({ meta: [{ title: "Assessments — Admin" }] }),
  component: AdminAssessments,
});

function AdminAssessments() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-assessments"],
    queryFn: async () => {
      const { data: assessments } = await supabase
        .from("assessments").select("*, assessment_questions(count), assessment_attempts(count)")
        .order("created_at", { ascending: false });
      return assessments ?? [];
    },
  });

  const filtered = (data ?? []).filter((a) => {
    if (status !== "all" && a.status !== status) return false;
    if (q && !a.title.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  async function duplicate(id: string) {
    const { data: src } = await supabase.from("assessments").select("*").eq("id", id).maybeSingle();
    if (!src) return;
    const { data: qs } = await supabase.from("assessment_questions").select("*").eq("assessment_id", id);
    const { id: _oldId, created_at, updated_at, deleted_at, ...rest } = src;
    const { data: created, error } = await supabase.from("assessments").insert({
      ...rest, title: src.title + " (copy)", status: "draft",
    }).select("id").single();
    if (error || !created) { toast.error(error?.message ?? "Failed"); return; }
    if (qs && qs.length > 0) {
      const rows = qs.map(({ id: _i, created_at: _c, updated_at: _u, assessment_id: _a, ...r }) => ({
        ...r, assessment_id: created.id,
      }));
      await supabase.from("assessment_questions").insert(rows);

    }
    toast.success("Duplicated");
    void qc.invalidateQueries({ queryKey: ["admin-assessments"] });
  }

  async function archive(id: string) {
    const { error } = await supabase.from("assessments").update({ status: "archived", is_active: false }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Archived");
    void qc.invalidateQueries({ queryKey: ["admin-assessments"] });
  }

  async function remove(id: string) {
    if (!confirm("Delete this assessment? This cannot be undone.")) return;
    const { error } = await supabase.from("assessments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    void qc.invalidateQueries({ queryKey: ["admin-assessments"] });
  }

  return (
    <div>
      <PageHeader
        title="Assessments"
        description="Author, publish, and monitor assessments."
        actions={
          <>
            <Link to="/admin/questions"><Button variant="outline"><Users className="mr-1 h-4 w-4" />Question bank</Button></Link>
            <Button onClick={() => navigate({ to: "/admin/assessments/new" })}>
              <Plus className="mr-1 h-4 w-4" /> New assessment
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input placeholder="Search by title…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-md bg-muted" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No assessments"
          description="Create your first assessment to start evaluating applicants."
          action={<Button onClick={() => navigate({ to: "/admin/assessments/new" })}><Plus className="mr-1 h-4 w-4" />New assessment</Button>}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const qCount = a.assessment_questions?.[0]?.count ?? 0;
            const aCount = a.assessment_attempts?.[0]?.count ?? 0;
            return (
              <Card key={a.id} className="border-border/60">
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-serif text-lg">{a.title}</div>
                      <Badge className={statusColor(a.status)}>{a.status}</Badge>
                      {a.difficulty && <span className={"rounded px-2 py-0.5 text-[10px] " + difficultyColor(a.difficulty)}>{a.difficulty}</span>}
                      {a.track && <Badge variant="outline">{a.track}</Badge>}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {qCount} question{qCount !== 1 && "s"} · {aCount} attempt{aCount !== 1 && "s"} · {a.duration_minutes} min · pass {a.passing_score}%
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link to="/admin/assessments/$id/edit" params={{ id: a.id }}>
                      <Button size="sm" variant="outline"><Edit3 className="mr-1 h-3 w-3" />Edit</Button>
                    </Link>
                    <Button size="sm" variant="ghost" onClick={() => duplicate(a.id)}><Copy className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => archive(a.id)}><Archive className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
