import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Users, UserPlus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth-hooks";
import { formatDate } from "@/lib/admin";

export const Route = createFileRoute("/_admin/admin/cohorts")({
  head: () => ({ meta: [{ title: "Cohorts — Admin" }] }),
  component: Cohorts,
});

interface CForm { id?: string; name: string; code: string; track_id: string; starts_on: string; ends_on: string; capacity: number; status: string; }
const EMPTY: CForm = { name: "", code: "", track_id: "", starts_on: "", ends_on: "", capacity: 30, status: "planned" };

function Cohorts() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CForm>(EMPTY);
  const [selected, setSelected] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [applicantId, setApplicantId] = useState("");

  const { data: cohorts } = useQuery({
    queryKey: ["admin-cohorts"],
    queryFn: async () => {
      const { data } = await supabase.from("cohorts").select("*, cohort_members(count)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: tracks } = useQuery({
    queryKey: ["admin-tracks-select"],
    queryFn: async () => (await supabase.from("tracks").select("id, name").eq("status", "active")).data ?? [],
  });

  const { data: members } = useQuery({
    queryKey: ["cohort-members", selected],
    enabled: !!selected,
    queryFn: async () => {
      const { data: rows } = await supabase.from("cohort_members").select("*").eq("cohort_id", selected!);
      const ids = (rows ?? []).map((r) => r.user_id);
      const { data: profs } = ids.length ? await supabase.from("profiles").select("id, full_name, email").in("id", ids) : { data: [] };
      const map = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));
      return (rows ?? []).map((r) => ({ ...r, profile: map[r.user_id] }));
    },
  });

  const { data: allApplicants } = useQuery({
    queryKey: ["cohort-assignable"],
    enabled: assignOpen,
    queryFn: async () => (await supabase.from("profiles").select("id, full_name, email").order("created_at", { ascending: false }).limit(200)).data ?? [],
  });

  function openNew() { setForm(EMPTY); setOpen(true); }

  async function save() {
    if (!form.name.trim() || !form.code.trim()) return toast.error("Name and code are required");
    const payload = {
      name: form.name.trim(), code: form.code.trim(),
      track_id: form.track_id || null,
      starts_on: form.starts_on || null, ends_on: form.ends_on || null,
      capacity: Number(form.capacity), status: form.status, created_by: user?.id,
    };
    const { error } = form.id
      ? await supabase.from("cohorts").update(payload).eq("id", form.id)
      : await supabase.from("cohorts").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setOpen(false);
    void qc.invalidateQueries({ queryKey: ["admin-cohorts"] });
  }

  async function addMember() {
    if (!selected || !applicantId) return;
    const { error } = await supabase.from("cohort_members").insert({ cohort_id: selected, user_id: applicantId, added_by: user?.id });
    if (error) return toast.error(error.message);
    toast.success("Added");
    setApplicantId("");
    void qc.invalidateQueries({ queryKey: ["cohort-members", selected] });
    void qc.invalidateQueries({ queryKey: ["admin-cohorts"] });
  }

  async function removeMember(id: string) {
    const { error } = await supabase.from("cohort_members").delete().eq("id", id);
    if (error) return toast.error(error.message);
    void qc.invalidateQueries({ queryKey: ["cohort-members", selected] });
    void qc.invalidateQueries({ queryKey: ["admin-cohorts"] });
  }

  const trackName = (id: string | null) => (tracks ?? []).find((t) => t.id === id)?.name ?? "—";

  return (
    <div>
      <PageHeader
        title="Cohorts"
        description="Group applicants into batches with mentors, assessments and timelines."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button onClick={openNew}><Plus className="mr-1 h-4 w-4" /> New cohort</Button></DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader><DialogTitle>{form.id ? "Edit cohort" : "New cohort"}</DialogTitle></DialogHeader>
              <div className="grid gap-3 md:grid-cols-2">
                <F label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></F>
                <F label="Code"><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="COH-2026-01" /></F>
                <F label="Track">
                  <Select value={form.track_id} onValueChange={(v) => setForm({ ...form, track_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select track" /></SelectTrigger>
                    <SelectContent>{(tracks ?? []).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </F>
                <F label="Capacity"><Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></F>
                <F label="Starts"><Input type="date" value={form.starts_on} onChange={(e) => setForm({ ...form, starts_on: e.target.value })} /></F>
                <F label="Ends"><Input type="date" value={form.ends_on} onChange={(e) => setForm({ ...form, ends_on: e.target.value })} /></F>
                <F label="Status">
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </F>
              </div>
              <DialogFooter><Button onClick={save}>Save cohort</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-3">
        {(cohorts ?? []).length === 0 ? (
          <EmptyState icon={Users} title="No cohorts yet" description="Create your first cohort to onboard applicants in batches." />
        ) : (
          (cohorts ?? []).map((c: any) => {
            const count = c.cohort_members?.[0]?.count ?? 0;
            return (
              <Card key={c.id} className="border-border/60">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="font-serif text-lg">{c.name}</div>
                      <Badge variant="outline">{c.code}</Badge>
                      <Badge>{c.status}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {trackName(c.track_id)} · {count}/{c.capacity} members · {formatDate(c.starts_on)} → {formatDate(c.ends_on)}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => { setSelected(c.id); setAssignOpen(true); }}>
                    <UserPlus className="mr-1 h-3 w-3" /> Manage members
                  </Button>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Cohort members</DialogTitle></DialogHeader>
          <div className="flex gap-2">
            <Select value={applicantId} onValueChange={setApplicantId}>
              <SelectTrigger><SelectValue placeholder="Select applicant to add" /></SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {(allApplicants ?? []).map((a) => <SelectItem key={a.id} value={a.id}>{a.full_name ?? a.email}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={addMember} disabled={!applicantId}>Add</Button>
          </div>
          <div className="mt-4 max-h-[360px] space-y-2 overflow-auto">
            {(members ?? []).length === 0 && <div className="text-xs text-muted-foreground">No members yet.</div>}
            {(members ?? []).map((m: any) => (
              <div key={m.id} className="flex items-center justify-between rounded-md border border-border/60 p-2 text-sm">
                <div>
                  <div>{m.profile?.full_name ?? m.profile?.email ?? m.user_id}</div>
                  <div className="text-xs text-muted-foreground">{m.role}</div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => removeMember(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="mb-1 block text-xs">{label}</Label>{children}</div>;
}
