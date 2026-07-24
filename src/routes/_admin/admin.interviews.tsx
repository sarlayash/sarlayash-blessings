import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarClock, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth-hooks";
import { formatDate } from "@/lib/admin";

export const Route = createFileRoute("/_admin/admin/interviews")({
  head: () => ({ meta: [{ title: "Interviews — Admin" }] }),
  component: Interviews,
});

interface IForm { id?: string; applicant_id: string; application_id: string; scheduled_at: string; duration_minutes: number; mode: string; meeting_url: string; location: string; }
const EMPTY: IForm = { applicant_id: "", application_id: "", scheduled_at: "", duration_minutes: 45, mode: "video", meeting_url: "", location: "" };

function Interviews() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<IForm>(EMPTY);
  const [feedbackOpen, setFeedbackOpen] = useState<any | null>(null);
  const [rating, setRating] = useState<number | "">("");
  const [rec, setRec] = useState("");
  const [notes, setNotes] = useState("");
  const [statusF, setStatusF] = useState("scheduled");

  const { data } = useQuery({
    queryKey: ["admin-interviews"],
    queryFn: async () => {
      const { data: rows } = await supabase.from("interviews").select("*").order("scheduled_at", { ascending: false });
      const ids = Array.from(new Set((rows ?? []).map((r) => r.applicant_id)));
      const { data: profs } = ids.length ? await supabase.from("profiles").select("id, full_name, email").in("id", ids) : { data: [] };
      const map = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));
      return (rows ?? []).map((r) => ({ ...r, profile: map[r.applicant_id] }));
    },
  });

  const { data: applicants } = useQuery({
    queryKey: ["all-applicants-for-interview"],
    enabled: open,
    queryFn: async () => (await supabase.from("profiles").select("id, full_name, email").order("full_name").limit(500)).data ?? [],
  });

  async function schedule() {
    if (!form.applicant_id || !form.scheduled_at) return toast.error("Applicant and time are required");
    const { error } = await supabase.from("interviews").insert({
      applicant_id: form.applicant_id,
      application_id: form.application_id || null,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      duration_minutes: Number(form.duration_minutes),
      mode: form.mode, meeting_url: form.meeting_url || null, location: form.location || null,
      created_by: user?.id,
    });
    if (error) return toast.error(error.message);
    await supabase.from("notifications").insert({
      user_id: form.applicant_id,
      title: "Interview scheduled",
      body: `Your interview is scheduled for ${new Date(form.scheduled_at).toLocaleString()}.`,
      category: "interview",
    });
    toast.success("Interview scheduled");
    setOpen(false); setForm(EMPTY);
    void qc.invalidateQueries({ queryKey: ["admin-interviews"] });
  }

  function openFeedback(i: any) {
    setFeedbackOpen(i);
    setRating(i.rating ?? "");
    setRec(i.recommendation ?? "");
    setNotes(i.feedback ?? "");
    setStatusF(i.status);
  }

  async function saveFeedback() {
    if (!feedbackOpen) return;
    const { error } = await supabase.from("interviews").update({
      rating: rating === "" ? null : Number(rating),
      recommendation: rec || null,
      feedback: notes || null,
      status: statusF,
    }).eq("id", feedbackOpen.id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setFeedbackOpen(null);
    void qc.invalidateQueries({ queryKey: ["admin-interviews"] });
  }

  async function cancel(id: string) {
    if (!confirm("Cancel this interview?")) return;
    const { error } = await supabase.from("interviews").update({ status: "cancelled" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Cancelled");
    void qc.invalidateQueries({ queryKey: ["admin-interviews"] });
  }

  return (
    <div>
      <PageHeader title="Interviews" description="Schedule interviews, capture feedback, ratings and recommendations." actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> Schedule interview</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Schedule interview</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label className="mb-1 block text-xs">Applicant</Label>
                <Select value={form.applicant_id} onValueChange={(v) => setForm({ ...form, applicant_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Choose applicant" /></SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {(applicants ?? []).map((a) => <SelectItem key={a.id} value={a.id}>{a.full_name ?? a.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1 block text-xs">Date & time</Label>
                  <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-1 block text-xs">Duration (min)</Label>
                  <Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1 block text-xs">Mode</Label>
                  <Select value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="onsite">On-site</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1 block text-xs">Location</Label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Optional" />
                </div>
              </div>
              <div>
                <Label className="mb-1 block text-xs">Meeting URL</Label>
                <Input value={form.meeting_url} onChange={(e) => setForm({ ...form, meeting_url: e.target.value })} placeholder="Zoom / Meet link" />
              </div>
            </div>
            <DialogFooter><Button onClick={schedule}>Schedule</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      } />

      {(data ?? []).length === 0 ? (
        <EmptyState icon={CalendarClock} title="No interviews yet" description="Schedule interviews and record feedback here." />
      ) : (
        <div className="grid gap-3">
          {(data ?? []).map((i: any) => (
            <Card key={i.id} className="border-border/60">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-serif text-lg">{i.profile?.full_name ?? i.profile?.email ?? "Applicant"}</div>
                    <Badge>{i.status}</Badge>
                    <Badge variant="outline">{i.mode}</Badge>
                    {i.recommendation && <Badge variant="secondary">{i.recommendation}</Badge>}
                    {i.rating != null && <Badge variant="outline">Rating {i.rating}/10</Badge>}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatDate(i.scheduled_at, { dateStyle: "medium", timeStyle: "short" })} · {i.duration_minutes} min
                    {i.meeting_url && <> · <a className="text-accent hover:underline" href={i.meeting_url} target="_blank" rel="noreferrer">Join</a></>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => openFeedback(i)}>Feedback</Button>
                  {i.status !== "cancelled" && <Button size="sm" variant="ghost" onClick={() => cancel(i.id)}>Cancel</Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!feedbackOpen} onOpenChange={(o) => !o && setFeedbackOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Interview feedback</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block text-xs">Status</Label>
                <Select value={statusF} onValueChange={setStatusF}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="no_show">No show</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block text-xs">Rating (1–10)</Label>
                <Input type="number" min={1} max={10} value={rating} onChange={(e) => setRating(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>
            </div>
            <div>
              <Label className="mb-1 block text-xs">Recommendation</Label>
              <Select value={rec} onValueChange={setRec}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="select">Select</SelectItem>
                  <SelectItem value="hold">Hold</SelectItem>
                  <SelectItem value="reject">Reject</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-xs">Notes</Label>
              <Textarea rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter><Button onClick={saveFeedback}>Save feedback</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
