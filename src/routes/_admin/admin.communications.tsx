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
import { Megaphone, Send } from "lucide-react";
import { useAuth } from "@/lib/auth-hooks";
import { formatDate } from "@/lib/admin";

export const Route = createFileRoute("/_admin/admin/communications")({
  head: () => ({ meta: [{ title: "Communications — Admin" }] }),
  component: Communications,
});

function Communications() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("all");
  const [track, setTrack] = useState("");
  const [cohortId, setCohortId] = useState("");
  const [sendEmail, setSendEmail] = useState(false);
  const [sendNotif, setSendNotif] = useState(true);

  const { data: cohorts } = useQuery({
    queryKey: ["cohorts-for-comm"],
    queryFn: async () => (await supabase.from("cohorts").select("id, name, code").order("created_at", { ascending: false })).data ?? [],
  });

  const { data: history } = useQuery({
    queryKey: ["comm-history"],
    queryFn: async () => (await supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(50)).data ?? [],
  });

  async function resolveRecipients(): Promise<string[]> {
    if (audience === "all") {
      const { data } = await supabase.from("profiles").select("id");
      return (data ?? []).map((p) => p.id);
    }
    if (audience === "track" && track) {
      const { data } = await supabase.from("applications").select("user_id").eq("track", track);
      return Array.from(new Set((data ?? []).map((a) => a.user_id)));
    }
    if (audience === "cohort" && cohortId) {
      const { data } = await supabase.from("cohort_members").select("user_id").eq("cohort_id", cohortId);
      return Array.from(new Set((data ?? []).map((a) => a.user_id)));
    }
    return [];
  }

  async function send() {
    if (!title.trim() || !body.trim()) return toast.error("Title and message are required");
    const recipients = await resolveRecipients();
    if (recipients.length === 0) return toast.error("No recipients matched — check audience");

    if (sendNotif) {
      const chunks: any[] = recipients.map((uid) => ({
        user_id: uid, title: title.trim(), body: body.trim(), category: "announcement",
      }));
      const { error } = await supabase.from("notifications").insert(chunks);
      if (error) return toast.error(error.message);
    }
    if (sendEmail) {
      const { data: profs } = await supabase.from("profiles").select("id, email, full_name").in("id", recipients);
      const emailRows = (profs ?? []).filter((p) => p.email).map((p) => ({
        to_email: p.email!, template: "broadcast", subject: title.trim(),
        payload: { name: p.full_name, body: body.trim() }, status: "queued" as const,
      }));
      if (emailRows.length) {
        const { error } = await supabase.from("email_queue").insert(emailRows);
        if (error) return toast.error(error.message);
      }
    }

    const { error: aErr } = await supabase.from("announcements").insert({
      title: title.trim(), body: body.trim(), audience,
      track: audience === "track" ? track : null,
      cohort_id: audience === "cohort" ? cohortId : null,
      recipient_ids: recipients, send_email: sendEmail, send_notification: sendNotif,
      status: "sent", sent_at: new Date().toISOString(), sent_count: recipients.length,
      created_by: user?.id,
    });
    if (aErr) return toast.error(aErr.message);

    toast.success(`Delivered to ${recipients.length} recipient${recipients.length !== 1 ? "s" : ""}`);
    setTitle(""); setBody("");
    void qc.invalidateQueries({ queryKey: ["comm-history"] });
  }

  return (
    <div>
      <PageHeader title="Communications" description="Broadcast announcements to applicants, tracks or cohorts." />
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="border-border/60">
          <CardContent className="space-y-4 p-6">
            <div>
              <Label className="mb-1 block text-xs">Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Announcement title" />
            </div>
            <div>
              <Label className="mb-1 block text-xs">Message</Label>
              <Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block text-xs">Audience</Label>
                <Select value={audience} onValueChange={setAudience}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Everyone</SelectItem>
                    <SelectItem value="track">By track (applications)</SelectItem>
                    <SelectItem value="cohort">By cohort</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {audience === "track" && (
                <div>
                  <Label className="mb-1 block text-xs">Track slug</Label>
                  <Input value={track} onChange={(e) => setTrack(e.target.value)} placeholder="e.g. Full-Stack" />
                </div>
              )}
              {audience === "cohort" && (
                <div>
                  <Label className="mb-1 block text-xs">Cohort</Label>
                  <Select value={cohortId} onValueChange={setCohortId}>
                    <SelectTrigger><SelectValue placeholder="Choose cohort" /></SelectTrigger>
                    <SelectContent>{(cohorts ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="flex items-center gap-6 text-xs">
              <label className="flex items-center gap-2"><input type="checkbox" checked={sendNotif} onChange={(e) => setSendNotif(e.target.checked)} /> In-app notification</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} /> Also queue email</label>
            </div>
            <Button onClick={send}><Send className="mr-1 h-4 w-4" />Send broadcast</Button>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="space-y-2 p-6">
            <div className="mb-2 text-sm font-medium">Recent broadcasts</div>
            {(history ?? []).length === 0 && <EmptyState icon={Megaphone} title="No broadcasts yet" description="Send your first announcement to see history here." />}
            {(history ?? []).map((h: any) => (
              <div key={h.id} className="rounded-md border border-border/60 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-medium">{h.title}</div>
                  <Badge>{h.status}</Badge>
                  <Badge variant="outline">{h.audience}</Badge>
                  <span className="text-xs text-muted-foreground">{h.sent_count} recipients</span>
                </div>
                <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{h.body}</div>
                <div className="mt-1 text-[10px] text-muted-foreground">{formatDate(h.sent_at, { dateStyle: "medium", timeStyle: "short" })}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
