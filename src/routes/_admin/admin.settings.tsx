import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, UserPlus } from "lucide-react";
import { STAFF_ROLES } from "@/lib/admin";
import { useAuth } from "@/lib/auth-hooks";

export const Route = createFileRoute("/_admin/admin/settings")({
  head: () => ({ meta: [{ title: "System settings — Admin" }] }),
  component: SysSettings,
});

interface OrgSettings {
  organization_name: string; support_email: string; primary_color: string;
  address: string; certificate_prefix: string;
}

const DEFAULT_ORG: OrgSettings = {
  organization_name: "SarlaYash Blessings", support_email: "team@sarlayash.blessings",
  primary_color: "#d4af37", address: "", certificate_prefix: "SYB-CERT",
};

function SysSettings() {
  const qc = useQueryClient();
  const { isSuperAdmin } = useAuth();
  const [org, setOrg] = useState<OrgSettings>(DEFAULT_ORG);
  const [rulesJSON, setRulesJSON] = useState("{}");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("admin");

  const { data: settings } = useQuery({
    queryKey: ["system-settings"],
    queryFn: async () => (await supabase.from("system_settings").select("*")).data ?? [],
  });

  useEffect(() => {
    const orgRow = settings?.find((s) => s.key === "organization");
    if (orgRow?.value && typeof orgRow.value === "object") setOrg({ ...DEFAULT_ORG, ...(orgRow.value as any) });
    const rulesRow = settings?.find((s) => s.key === "placement_rules");
    if (rulesRow?.value) setRulesJSON(JSON.stringify(rulesRow.value, null, 2));
  }, [settings]);

  const { data: staff } = useQuery({
    queryKey: ["staff-list"],
    queryFn: async () => {
      const { data: rows } = await supabase.from("user_roles").select("*");
      const ids = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
      const { data: profs } = ids.length ? await supabase.from("profiles").select("id, full_name, email").in("id", ids) : { data: [] };
      const map = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));
      return (rows ?? []).filter((r) => r.role !== "applicant").map((r) => ({ ...r, profile: map[r.user_id] }));
    },
  });

  async function saveOrg() {
    const { error } = await supabase.from("system_settings").upsert({ key: "organization", value: org as any });
    if (error) return toast.error(error.message);
    toast.success("Organization saved");
    void qc.invalidateQueries({ queryKey: ["system-settings"] });
  }

  async function saveRules() {
    try {
      const parsed = JSON.parse(rulesJSON);
      const { error } = await supabase.from("system_settings").upsert({ key: "placement_rules", value: parsed });
      if (error) throw error;
      toast.success("Rules saved");
      void qc.invalidateQueries({ queryKey: ["system-settings"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Invalid JSON");
    }
  }

  async function grantRole() {
    if (!inviteEmail.trim()) return;
    const { data: user } = await supabase.from("profiles").select("id").eq("email", inviteEmail.trim().toLowerCase()).maybeSingle();
    if (!user) return toast.error("No user with that email — they must sign in once first.");
    const { error } = await supabase.from("user_roles").insert({ user_id: user.id, role: inviteRole as any });
    if (error) return toast.error(error.message);
    toast.success(`${inviteRole} granted to ${inviteEmail}`);
    setInviteEmail("");
    void qc.invalidateQueries({ queryKey: ["staff-list"] });
  }

  async function removeRole(id: string) {
    if (!confirm("Remove this role?")) return;
    const { error } = await supabase.from("user_roles").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    void qc.invalidateQueries({ queryKey: ["staff-list"] });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="System settings" description="Organization, placement rules and staff role management." />

      <Card className="border-border/60">
        <CardHeader><CardTitle className="text-sm">Organization & branding</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <F label="Organization name"><Input value={org.organization_name} onChange={(e) => setOrg({ ...org, organization_name: e.target.value })} /></F>
          <F label="Support email"><Input value={org.support_email} onChange={(e) => setOrg({ ...org, support_email: e.target.value })} /></F>
          <F label="Primary color"><Input value={org.primary_color} onChange={(e) => setOrg({ ...org, primary_color: e.target.value })} /></F>
          <F label="Certificate prefix"><Input value={org.certificate_prefix} onChange={(e) => setOrg({ ...org, certificate_prefix: e.target.value })} /></F>
          <F label="Address" className="md:col-span-2"><Textarea rows={2} value={org.address} onChange={(e) => setOrg({ ...org, address: e.target.value })} /></F>
          <div className="md:col-span-2"><Button onClick={saveOrg}>Save organization</Button></div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader><CardTitle className="text-sm">Placement / assessment / certificate rules (JSON)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea rows={10} value={rulesJSON} onChange={(e) => setRulesJSON(e.target.value)} className="font-mono text-xs" />
          <Button onClick={saveRules}>Save rules</Button>
          <p className="text-xs text-muted-foreground">Store rule thresholds like <code>{`{ "assessment_passing": 60, "min_projects": 2 }`}</code>. Rules are read by the app where applicable.</p>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader><CardTitle className="text-sm">Staff roles</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {isSuperAdmin ? (
            <div className="flex flex-wrap items-end gap-2">
              <F label="Email of existing user"><Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="user@example.com" /></F>
              <div>
                <Label className="mb-1 block text-xs">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAFF_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={grantRole}><UserPlus className="mr-1 h-4 w-4" />Grant role</Button>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">Only super admins can grant or revoke staff roles.</div>
          )}

          <div className="grid gap-2">
            {(staff ?? []).map((s: any) => (
              <div key={s.id} className="flex items-center justify-between rounded-md border border-border/60 p-2 text-sm">
                <div>
                  <div>{s.profile?.full_name ?? s.profile?.email ?? s.user_id}</div>
                  <div className="text-xs text-muted-foreground">{s.profile?.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{s.role}</Badge>
                  {isSuperAdmin && <Button size="icon" variant="ghost" onClick={() => removeRole(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                </div>
              </div>
            ))}
            {(staff ?? []).length === 0 && <div className="text-xs text-muted-foreground">No staff roles granted yet.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function F({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return <div className={className}><Label className="mb-1 block text-xs">{label}</Label>{children}</div>;
}
