import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit3, Archive, RotateCcw, Trash2, Layers } from "lucide-react";
import { useAuth } from "@/lib/auth-hooks";

export const Route = createFileRoute("/_admin/admin/tracks")({
  head: () => ({ meta: [{ title: "Tracks — Admin" }] }),
  component: Tracks,
});

interface TrackFormState {
  id?: string;
  slug: string; name: string; tagline: string; description: string;
  duration_weeks: number; capacity: number;
  prerequisites: string; skills: string; outcomes: string;
  status: string;
}

const EMPTY: TrackFormState = {
  slug: "", name: "", tagline: "", description: "",
  duration_weeks: 8, capacity: 40, prerequisites: "", skills: "", outcomes: "", status: "active",
};

function Tracks() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<TrackFormState>(EMPTY);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-tracks"],
    queryFn: async () => {
      const { data } = await supabase.from("tracks").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  function openNew() { setForm(EMPTY); setOpen(true); }
  function openEdit(t: any) {
    setForm({
      id: t.id, slug: t.slug, name: t.name, tagline: t.tagline ?? "", description: t.description ?? "",
      duration_weeks: t.duration_weeks, capacity: t.capacity,
      prerequisites: (t.prerequisites ?? []).join(", "),
      skills: (t.skills ?? []).join(", "),
      outcomes: (t.outcomes ?? []).join(", "),
      status: t.status,
    });
    setOpen(true);
  }

  async function save() {
    if (!form.slug.trim() || !form.name.trim()) return toast.error("Slug and name are required");
    const payload = {
      slug: form.slug.trim(), name: form.name.trim(), tagline: form.tagline || null,
      description: form.description || null, duration_weeks: Number(form.duration_weeks),
      capacity: Number(form.capacity),
      prerequisites: form.prerequisites.split(",").map((s) => s.trim()).filter(Boolean),
      skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
      outcomes: form.outcomes.split(",").map((s) => s.trim()).filter(Boolean),
      status: form.status, created_by: user?.id,
    };
    const { error } = form.id
      ? await supabase.from("tracks").update(payload).eq("id", form.id)
      : await supabase.from("tracks").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(form.id ? "Track updated" : "Track created");
    setOpen(false);
    void qc.invalidateQueries({ queryKey: ["admin-tracks"] });
  }

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("tracks").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    void qc.invalidateQueries({ queryKey: ["admin-tracks"] });
  }

  async function remove(id: string) {
    if (!confirm("Delete this track?")) return;
    const { error } = await supabase.from("tracks").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    void qc.invalidateQueries({ queryKey: ["admin-tracks"] });
  }

  return (
    <div>
      <PageHeader
        title="Tracks"
        description="Create, edit and manage internship tracks."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button onClick={openNew}><Plus className="mr-1 h-4 w-4" /> New track</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>{form.id ? "Edit track" : "New track"}</DialogTitle></DialogHeader>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Slug"><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="e.g. full-stack" /></Field>
                <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
                <Field label="Tagline" className="md:col-span-2"><Input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} /></Field>
                <Field label="Duration (weeks)"><Input type="number" min={1} value={form.duration_weeks} onChange={(e) => setForm({ ...form, duration_weeks: Number(e.target.value) })} /></Field>
                <Field label="Capacity"><Input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></Field>
                <Field label="Status">
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Skills (comma-separated)" className="md:col-span-2"><Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} /></Field>
                <Field label="Prerequisites" className="md:col-span-2"><Input value={form.prerequisites} onChange={(e) => setForm({ ...form, prerequisites: e.target.value })} /></Field>
                <Field label="Outcomes" className="md:col-span-2"><Input value={form.outcomes} onChange={(e) => setForm({ ...form, outcomes: e.target.value })} /></Field>
                <Field label="Description" className="md:col-span-2"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
              </div>
              <DialogFooter><Button onClick={save}>{form.id ? "Save changes" : "Create track"}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (data ?? []).length === 0 ? (
        <EmptyState icon={Layers} title="No tracks yet" description="Create your first internship track to accept applications." action={<Button onClick={openNew}><Plus className="mr-1 h-4 w-4" />New track</Button>} />
      ) : (
        <div className="grid gap-3">
          {(data ?? []).map((t: any) => (
            <Card key={t.id} className="border-border/60">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-serif text-lg">{t.name}</div>
                    <Badge variant={t.status === "active" ? "default" : "outline"}>{t.status}</Badge>
                    <span className="text-xs text-muted-foreground">/{t.slug}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{t.tagline}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{t.duration_weeks} weeks · capacity {t.capacity} · {(t.skills ?? []).length} skills</div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(t)}><Edit3 className="mr-1 h-3 w-3" /> Edit</Button>
                  {t.status === "active"
                    ? <Button size="sm" variant="ghost" onClick={() => setStatus(t.id, "archived")}><Archive className="h-4 w-4" /></Button>
                    : <Button size="sm" variant="ghost" onClick={() => setStatus(t.id, "active")}><RotateCcw className="h-4 w-4" /></Button>}
                  <Button size="sm" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return <div className={className}><Label className="mb-1 block text-xs">{label}</Label>{children}</div>;
}
