import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth, signOut } from "@/lib/auth-hooks";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LogOut, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — SarlaYash Blessings" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifProduct, setNotifProduct] = useState(true);
  const [busy, setBusy] = useState(false);

  const deleteAccount = async () => {
    if (!user) return;
    if (!confirm("Delete your account? Your profile will be marked deleted and you'll be signed out.")) return;
    setBusy(true);
    const now = new Date().toISOString();
    await supabase.from("profiles").update({ deleted_at: now }).eq("id", user.id);
    await signOut();
    toast.success("Account deletion requested");
    setBusy(false);
  };

  return (
    <div>
      <PageHeader title="Settings" description="Account, preferences, and privacy." />
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader><CardTitle className="font-serif">Account</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">Email</Label>
              <div>{user?.email}</div>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">Sign-in method</Label>
              <div>Google (managed by SarlaYash Blessings)</div>
            </div>
            <div className="pt-2">
              <Button variant="outline" onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader><CardTitle className="font-serif">Preferences</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Row label="Email notifications" description="Application updates, mentor reviews, milestones."
              checked={notifEmail} onChange={setNotifEmail} />
            <Row label="Product announcements" description="New tracks, features, and cohort news."
              checked={notifProduct} onChange={setNotifProduct} />
          </CardContent>
        </Card>

        <Card className="border-destructive/40 md:col-span-2">
          <CardHeader>
            <CardTitle className="font-serif flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-4 w-4" /> Danger zone
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 text-sm">
            <div>
              <div className="font-medium">Delete account</div>
              <div className="text-muted-foreground">
                Marks your profile for deletion. Certificates you've already earned remain verifiable.
              </div>
            </div>
            <Button variant="destructive" onClick={deleteAccount} disabled={busy}>Delete account</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
