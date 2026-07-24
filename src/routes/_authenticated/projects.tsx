import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-hooks";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { FolderKanban, Github, ExternalLink, Send, User } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Project = Database["public"]["Tables"]["projects"]["Row"];
type Status = Database["public"]["Enums"]["project_status"];

interface Milestone { title: string; done: boolean }
interface Resource { title: string; url: string }

const STATUS_LABEL: Record<Status, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  reviewed: "Reviewed",
  completed: "Completed",
};

const STATUS_TONE: Record<Status, string> = {
  not_started: "bg-secondary text-secondary-foreground",
  in_progress: "bg-primary/10 text-primary",
  submitted: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  reviewed: "bg-accent/20 text-accent-foreground",
  completed: "bg-accent text-accent-foreground",
};

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({ meta: [{ title: "Projects — SarlaYash Blessings" }] }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const { user } = useAuth();
  const uid = user?.id;
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.from("projects")
        .select("*").eq("user_id", uid!).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Project[];
    },
  });

  const open = projects.find((p) => p.id === openId);

  return (
    <div>
      <PageHeader title="Projects" description="Milestones, submissions, and mentor feedback." />
      {projects.length === 0 ? (
        <EmptyState icon={FolderKanban} title="No projects assigned yet"
          description="Once you're accepted into a track, mentor-assigned projects will appear here." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((p) => <ProjectCard key={p.id} p={p} onOpen={() => setOpenId(p.id)} />)}
        </div>
      )}
      {open && <ProjectSheet project={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function progress(p: Project) {
  const ms = (Array.isArray(p.milestones) ? p.milestones : []) as unknown as Milestone[];
  if (ms.length === 0) {
    return p.status === "completed" ? 100 : p.status === "reviewed" ? 90
      : p.status === "submitted" ? 70 : p.status === "in_progress" ? 40 : 0;
  }
  return Math.round((ms.filter((m) => m.done).length / ms.length) * 100);
}

function ProjectCard({ p, onOpen }: { p: Project; onOpen: () => void }) {
  const pct = progress(p);
  return (
    <Card className="border-border/60 hover:border-accent/60 transition-colors">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="font-serif text-lg">{p.title}</CardTitle>
          <Badge className={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
        </div>
        {p.description && <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>}
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span><span>{pct}%</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {p.mentor && <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> {p.mentor}</span>}
          {p.deadline && <span>Due {new Date(p.deadline).toLocaleDateString()}</span>}
          {p.difficulty && <span>Level: {p.difficulty}</span>}
        </div>
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={onOpen}>Open</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectSheet({ project, onClose }: { project: Project; onClose: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const ms = useMemo(() => (Array.isArray(project.milestones) ? project.milestones : []) as unknown as Milestone[], [project.milestones]);
  const resources = (Array.isArray(project.resources) ? project.resources : []) as unknown as Resource[];
  const [repo, setRepo] = useState(project.repo_url ?? "");
  const [demo, setDemo] = useState(project.demo_url ?? "");
  const [notes, setNotes] = useState(project.student_notes ?? "");
  const [saving, setSaving] = useState(false);

  const toggleMilestone = async (idx: number) => {
    const next = ms.map((m, i) => i === idx ? { ...m, done: !m.done } : m);
    const status: Status = next.every((m) => m.done) ? "submitted"
      : next.some((m) => m.done) ? "in_progress" : project.status;
    const { error } = await supabase.from("projects")
      .update({ milestones: next as never, status }).eq("id", project.id);
    if (error) return toast.error(error.message);
    void qc.invalidateQueries({ queryKey: ["projects", user?.id] });
  };

  const saveLinks = async () => {
    setSaving(true);
    const { error } = await supabase.from("projects")
      .update({ repo_url: repo || null, demo_url: demo || null, student_notes: notes || null })
      .eq("id", project.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    void qc.invalidateQueries({ queryKey: ["projects", user?.id] });
  };

  const submitForReview = async () => {
    if (!repo && !demo) return toast.error("Add a repo or demo URL first.");
    const { error } = await supabase.from("projects").update({
      status: "submitted", submitted_at: new Date().toISOString(),
      repo_url: repo || null, demo_url: demo || null, student_notes: notes || null,
    }).eq("id", project.id);
    if (error) return toast.error(error.message);
    void supabase.from("activity_logs").insert({
      user_id: user!.id, activity: `Submitted project: ${project.title}`, metadata: { project_id: project.id },
    });
    toast.success("Submitted for review");
    void qc.invalidateQueries({ queryKey: ["projects", user?.id] });
    onClose();
  };

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="font-serif text-2xl">{project.title}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          {project.description && <p className="text-sm text-muted-foreground">{project.description}</p>}

          {ms.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Milestones</h3>
              <ul className="space-y-2">
                {ms.map((m, i) => (
                  <li key={i} className="flex items-center gap-3 rounded-md border border-border/60 p-3">
                    <input type="checkbox" checked={m.done} onChange={() => toggleMilestone(i)}
                      className="h-4 w-4 rounded border-input" />
                    <span className={m.done ? "line-through text-muted-foreground" : ""}>{m.title}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {resources.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Resources</h3>
              <ul className="space-y-1 text-sm">
                {resources.map((r, i) => (
                  <li key={i}>
                    <a href={r.url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 underline underline-offset-4">
                      {r.title} <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="space-y-3">
            <h3 className="text-xs uppercase tracking-widest text-muted-foreground">Submission</h3>
            <div>
              <Label className="mb-1 block text-xs">Repository URL</Label>
              <Input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="https://github.com/…" />
            </div>
            <div>
              <Label className="mb-1 block text-xs">Live demo URL</Label>
              <Input value={demo} onChange={(e) => setDemo(e.target.value)} placeholder="https://…" />
            </div>
            <div>
              <Label className="mb-1 block text-xs">Notes for reviewer</Label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={saveLinks} disabled={saving}>Save draft</Button>
              <Button onClick={submitForReview} disabled={project.status === "completed"}>
                <Send className="mr-2 h-4 w-4" /> Submit for review
              </Button>
            </div>
          </section>

          {project.feedback && (
            <section className="rounded-md border border-accent/40 bg-accent/5 p-4 text-sm">
              <div className="mb-1 text-xs uppercase tracking-widest text-accent-foreground/80">Mentor feedback</div>
              <div className="whitespace-pre-line">{project.feedback}</div>
              {project.score != null && <div className="mt-2 text-xs">Score: {project.score}/100</div>}
            </section>
          )}

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {project.repo_url && (
              <a href={project.repo_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-4">
                <Github className="h-3 w-3" /> Repo
              </a>
            )}
            {project.demo_url && (
              <a href={project.demo_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-4">
                <ExternalLink className="h-3 w-3" /> Demo
              </a>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
