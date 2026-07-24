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
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Award, Plus, RotateCcw, Ban, Search as SearchIcon } from "lucide-react";
import { formatDate, nextCertNumber } from "@/lib/admin";

export const Route = createFileRoute("/_admin/admin/certificates")({
  head: () => ({ meta: [{ title: "Certificates — Admin" }] }),
  component: Certificates,
});

interface CForm { user_id: string; title: string; track: string; }
const EMPTY: CForm = { user_id: "", title: "Certificate of Internship Completion", track: "" };

function Certificates() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CForm>(EMPTY);
  const [q, setQ] = useState("");

  const { data } = useQuery({
    queryKey: ["admin-certificates", q],
    queryFn: async () => {
      let query = supabase.from("certificates").select("*").order("issued_at", { ascending: false }).limit(200);
      if (q) query = query.or(`title.ilike.%${q}%,certificate_number.ilike.%${q}%,verification_code.ilike.%${q}%`);
      const { data: rows } = await query;
      const ids = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
      const { data: profs } = ids.length ? await supabase.from("profiles").select("id, full_name, email").in("id", ids) : { data: [] };
      const map = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));
      return (rows ?? []).map((r) => ({ ...r, profile: map[r.user_id] }));
    },
  });

  const { data: applicants } = useQuery({
    queryKey: ["applicants-for-cert"], enabled: open,
    queryFn: async () => (await supabase.from("profiles").select("id, full_name, email").order("full_name").limit(500)).data ?? [],
  });

  async function issue() {
    if (!form.user_id || !form.title.trim()) return toast.error("Recipient and title required");
    const certNo = nextCertNumber();
    const verify = Math.random().toString(36).slice(2, 10).toUpperCase();
    const { error } = await supabase.from("certificates").insert({
      user_id: form.user_id, title: form.title.trim(), track: form.track || null,
      certificate_number: certNo, verification_code: verify,
      issued_at: new Date().toISOString(),
    });
    if (error) return toast.error(error.message);
    await supabase.from("notifications").insert({
      user_id: form.user_id, title: "Certificate issued",
      body: `Your certificate ${certNo} has been issued. Download and share from your Certificates page.`,
      category: "certificate",
    });
    toast.success("Certificate issued");
    setOpen(false); setForm(EMPTY);
    void qc.invalidateQueries({ queryKey: ["admin-certificates", q] });
  }

  async function revoke(id: string) {
    if (!confirm("Revoke (soft-delete) this certificate?")) return;
    const { error } = await supabase.from("certificates").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Revoked");
    void qc.invalidateQueries({ queryKey: ["admin-certificates", q] });
  }

  async function reissue(id: string) {
    const { error } = await supabase.from("certificates").update({ deleted_at: null, issued_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Reissued");
    void qc.invalidateQueries({ queryKey: ["admin-certificates", q] });
  }

  return (
    <div>
      <PageHeader title="Certificates" description="Issue, revoke and reissue completion certificates." actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />Issue certificate</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Issue certificate</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label className="mb-1 block text-xs">Recipient</Label>
                <Select value={form.user_id} onValueChange={(v) => setForm({ ...form, user_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Choose recipient" /></SelectTrigger>
                  <SelectContent className="max-h-[280px]">
                    {(applicants ?? []).map((a) => <SelectItem key={a.id} value={a.id}>{a.full_name ?? a.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block text-xs">Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1 block text-xs">Track</Label>
                <Input value={form.track} onChange={(e) => setForm({ ...form, track: e.target.value })} placeholder="e.g. Full-Stack Web Development" />
              </div>
            </div>
            <DialogFooter><Button onClick={issue}>Issue certificate</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      } />

      <div className="mb-4 flex items-center gap-2">
        <SearchIcon className="h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title, certificate number or verification code…" className="max-w-md" />
      </div>

      {(data ?? []).length === 0 ? (
        <EmptyState icon={Award} title="No certificates" description="Issued certificates will appear here." />
      ) : (
        <div className="grid gap-3">
          {(data ?? []).map((c: any) => (
            <Card key={c.id} className="border-border/60">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-serif text-lg">{c.title}</div>
                    {c.deleted_at ? <Badge variant="destructive">Revoked</Badge> : <Badge>Active</Badge>}
                    <span className="text-xs text-muted-foreground">{c.certificate_number}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Issued to {c.profile?.full_name ?? c.profile?.email ?? "—"} on {formatDate(c.issued_at)} · Verify: {c.verification_code}
                  </div>
                </div>
                <div className="flex gap-1">
                  <a className="text-xs text-accent hover:underline" href={`/verify?code=${c.verification_code}`} target="_blank" rel="noreferrer">Verify link</a>
                  {c.deleted_at
                    ? <Button size="sm" variant="ghost" onClick={() => reissue(c.id)}><RotateCcw className="h-4 w-4" /></Button>
                    : <Button size="sm" variant="ghost" onClick={() => revoke(c.id)}><Ban className="h-4 w-4 text-destructive" /></Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
