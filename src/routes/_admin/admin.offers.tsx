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
import { Sparkles, Plus, Send as SendIcon, Ban } from "lucide-react";
import { useAuth } from "@/lib/auth-hooks";
import { formatDate, nextOfferNumber } from "@/lib/admin";

export const Route = createFileRoute("/_admin/admin/offers")({
  head: () => ({ meta: [{ title: "Offers — Admin" }] }),
  component: Offers,
});

interface OForm {
  id?: string; applicant_id: string; role_title: string; track: string;
  stipend: string; start_date: string; end_date: string; location: string;
  body: string; deadline: string;
}
const EMPTY: OForm = { applicant_id: "", role_title: "Intern", track: "", stipend: "", start_date: "", end_date: "", location: "Remote", body: "", deadline: "" };

const TEMPLATE = (name: string, role: string, track: string, stipend: string, start: string, end: string) => `Dear ${name || "Candidate"},

We are pleased to extend an offer for the position of ${role}${track ? ` on the ${track} track` : ""} with the SarlaYash Blessings Internship Program.

• Duration: ${start || "TBD"} to ${end || "TBD"}
• Stipend: ${stipend || "As per program guidelines"}
• Reporting: Remote / Hybrid (as coordinated with your mentor)

Please review the terms and confirm your acceptance through your applicant portal by the response deadline.

Warm regards,
SarlaYash Blessings Placement Team`;

function Offers() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<OForm>(EMPTY);
  const [statusF, setStatusF] = useState("all");

  const { data } = useQuery({
    queryKey: ["admin-offers", statusF],
    queryFn: async () => {
      let q = supabase.from("offers").select("*").order("created_at", { ascending: false });
      if (statusF !== "all") q = q.eq("status", statusF);
      const { data: rows } = await q.limit(200);
      const ids = Array.from(new Set((rows ?? []).map((r) => r.applicant_id)));
      const { data: profs } = ids.length ? await supabase.from("profiles").select("id, full_name, email").in("id", ids) : { data: [] };
      const map = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));
      return (rows ?? []).map((r) => ({ ...r, profile: map[r.applicant_id] }));
    },
  });

  const { data: applicants } = useQuery({
    queryKey: ["applicants-for-offer"],
    enabled: open,
    queryFn: async () => (await supabase.from("profiles").select("id, full_name, email").order("full_name").limit(500)).data ?? [],
  });

  function openNew() { setForm({ ...EMPTY, body: TEMPLATE("", "Intern", "", "", "", "") }); setOpen(true); }

  function fillTemplate() {
    const applicant = (applicants ?? []).find((a) => a.id === form.applicant_id);
    setForm({ ...form, body: TEMPLATE(applicant?.full_name ?? "", form.role_title, form.track, form.stipend, form.start_date, form.end_date) });
  }

  async function create(sendNow: boolean) {
    if (!form.applicant_id || !form.role_title.trim()) return toast.error("Applicant and role are required");
    const payload = {
      applicant_id: form.applicant_id,
      offer_number: nextOfferNumber(),
      role_title: form.role_title.trim(),
      track: form.track || null,
      stipend: form.stipend || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      location: form.location || null,
      body: form.body,
      deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      status: sendNow ? "sent" : "draft",
      issued_at: sendNow ? new Date().toISOString() : null,
      created_by: user?.id,
    };
    const { data: created, error } = await supabase.from("offers").insert(payload).select("id").single();
    if (error || !created) return toast.error(error?.message ?? "Failed");
    if (sendNow) {
      await supabase.from("notifications").insert({
        user_id: form.applicant_id,
        title: `Offer released: ${form.role_title}`,
        body: "Your internship offer has been released. Review and respond from your portal.",
        category: "offer",
      });
    }
    toast.success(sendNow ? "Offer sent" : "Draft saved");
    setOpen(false); setForm(EMPTY);
    void qc.invalidateQueries({ queryKey: ["admin-offers", statusF] });
  }

  async function sendDraft(id: string, applicant_id: string, role_title: string) {
    const { error } = await supabase.from("offers").update({ status: "sent", issued_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    await supabase.from("notifications").insert({
      user_id: applicant_id, title: `Offer released: ${role_title}`,
      body: "Your internship offer has been released. Review and respond from your portal.", category: "offer",
    });
    toast.success("Sent");
    void qc.invalidateQueries({ queryKey: ["admin-offers", statusF] });
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this offer?")) return;
    const { error } = await supabase.from("offers").update({ status: "revoked" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Revoked");
    void qc.invalidateQueries({ queryKey: ["admin-offers", statusF] });
  }

  return (
    <div>
      <PageHeader title="Offers" description="Generate, send, and track internship offer letters." actions={
        <div className="flex items-center gap-2">
          <Select value={statusF} onValueChange={setStatusF}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="revoked">Revoked</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button onClick={openNew}><Plus className="mr-1 h-4 w-4" />New offer</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>New offer letter</DialogTitle></DialogHeader>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label className="mb-1 block text-xs">Applicant</Label>
                  <Select value={form.applicant_id} onValueChange={(v) => setForm({ ...form, applicant_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select applicant" /></SelectTrigger>
                    <SelectContent className="max-h-[280px]">
                      {(applicants ?? []).map((a) => <SelectItem key={a.id} value={a.id}>{a.full_name ?? a.email}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <F label="Role title"><Input value={form.role_title} onChange={(e) => setForm({ ...form, role_title: e.target.value })} /></F>
                <F label="Track"><Input value={form.track} onChange={(e) => setForm({ ...form, track: e.target.value })} /></F>
                <F label="Stipend"><Input value={form.stipend} onChange={(e) => setForm({ ...form, stipend: e.target.value })} placeholder="e.g. ₹25,000/month" /></F>
                <F label="Location"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></F>
                <F label="Start date"><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></F>
                <F label="End date"><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></F>
                <F label="Response deadline" className="md:col-span-2"><Input type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></F>
                <div className="md:col-span-2">
                  <div className="mb-1 flex items-center justify-between">
                    <Label className="text-xs">Letter body</Label>
                    <Button type="button" size="sm" variant="ghost" onClick={fillTemplate}>Re-generate from template</Button>
                  </div>
                  <Textarea rows={10} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => create(false)}>Save draft</Button>
                <Button onClick={() => create(true)}><SendIcon className="mr-1 h-4 w-4" />Save & send</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      } />

      {(data ?? []).length === 0 ? (
        <EmptyState icon={Sparkles} title="No offers" description="Generate an offer letter to see it listed here." />
      ) : (
        <div className="grid gap-3">
          {(data ?? []).map((o: any) => (
            <Card key={o.id} className="border-border/60">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-serif text-lg">{o.role_title}</div>
                    <Badge>{o.status}</Badge>
                    <span className="text-xs text-muted-foreground">{o.offer_number}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    To {o.profile?.full_name ?? o.profile?.email ?? "—"} · Issued {formatDate(o.issued_at)}
                    {o.deadline && ` · Deadline ${formatDate(o.deadline)}`}
                    {o.responded_at && ` · Responded ${formatDate(o.responded_at)}`}
                  </div>
                </div>
                <div className="flex gap-1">
                  {o.status === "draft" && <Button size="sm" onClick={() => sendDraft(o.id, o.applicant_id, o.role_title)}><SendIcon className="mr-1 h-3 w-3" />Send</Button>}
                  {(o.status === "sent" || o.status === "accepted") && <Button size="sm" variant="ghost" onClick={() => revoke(o.id)}><Ban className="h-4 w-4 text-destructive" /></Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function F({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return <div className={className}><Label className="mb-1 block text-xs">{label}</Label>{children}</div>;
}
