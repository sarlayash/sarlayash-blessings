import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FolderKanban, ExternalLink } from "lucide-react";
import { formatDate } from "@/lib/admin";

export const Route = createFileRoute("/_admin/admin/projects")({
  head: () => ({ meta: [{ title: "Projects — Admin" }] }),
  component: AdminProjects,
});

function AdminProjects() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const [reviewing, setReviewing] = useState<any | null>(null);
  const [score, setScore] = useState<number | "">("");
  const [feedback, setFeedback] = useState("");
  const [newStatus, setNewStatus] = useState("reviewed");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-projects", status],
    queryFn: async () => {
      let q = supabase.from("projects").select("*").order("submitted_at", { ascending: false, nullsFirst: false });
      if (status !== "all") q = q.eq("status", status as any);
      const { data: rows } = await q.limit(200);
      const ids = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
      const { data: profs } = ids.length ? await supabase.from("profiles").select("id, full_name, email").in("id", ids) : { data: [] };
      const map = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));
      return (rows ?? []).map((r) => ({ ...r, profile: map[r.user_id] }));
    },
  });

  function openReview(p: any) {
    setReviewing(p);
    setScore(p.score ?? "");
    setFeedback(p.feedback ?? "");
    setNewStatus(p.status);
  }

  async function saveReview() {
    if (!reviewing) return;
    const { error } = await supabase.from("projects").update({
      score: score === "" ? null : Number(score),
      feedback: feedback || null,
      status: newStatus as any,
      reviewed_at: new Date().toISOString(),
    }).eq("id", reviewing.id);
    if (error) return toast.error(error.message);
    toast.success("Review saved");
    setReviewing(null);
    void qc.invalidateQueries({ queryKey: ["admin-projects", status] });
  }

  return (
    <div>
      <PageHeader title="Projects" description="Review submissions, provide feedback and approve completion." actions={
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="not_started">Not started</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      } />

      {isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> : (data ?? []).length === 0 ? (
        <EmptyState icon={FolderKanban} title="No projects" description="No projects match the current filter." />
      ) : (
        <div className="grid gap-3">
          {(data ?? []).map((p: any) => (
            <Card key={p.id} className="border-border/60">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-serif text-lg">{p.title}</div>
                      <Badge>{p.status}</Badge>
                      {p.difficulty && <Badge variant="outline">{p.difficulty}</Badge>}
                      {p.track && <Badge variant="outline">{p.track}</Badge>}
                      {p.score != null && <Badge variant="secondary">Score {p.score}</Badge>}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      By {p.profile?.full_name ?? p.profile?.email ?? "—"} · Submitted {formatDate(p.submitted_at)}
                    </div>
                    {p.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}
                    <div className="mt-2 flex gap-3 text-xs">
                      {p.repo_url && <a className="inline-flex items-center gap-1 text-accent hover:underline" href={p.repo_url} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" />Repo</a>}
                      {p.demo_url && <a className="inline-flex items-center gap-1 text-accent hover:underline" href={p.demo_url} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" />Demo</a>}
                      {p.submission_url && <a className="inline-flex items-center gap-1 text-accent hover:underline" href={p.submission_url} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" />Submission</a>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Button size="sm" onClick={() => openReview(p)}>Review</Button>
                    <Link to="/admin/applicants/$id" params={{ id: p.user_id }} className="text-xs text-accent hover:underline">View applicant</Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Review project</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="mb-1 block text-xs">Score (0–100)</Label>
              <Input type="number" min={0} max={100} value={score} onChange={(e) => setScore(e.target.value === "" ? "" : Number(e.target.value))} />
            </div>
            <div>
              <Label className="mb-1 block text-xs">Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-xs">Mentor feedback</Label>
              <Textarea rows={5} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Strengths, revisions requested, next steps…" />
            </div>
          </div>
          <DialogFooter><Button onClick={saveReview}>Save review</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
