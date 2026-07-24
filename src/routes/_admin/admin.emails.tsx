import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail } from "lucide-react";
import { formatDate } from "@/lib/admin";

export const Route = createFileRoute("/_admin/admin/emails")({
  head: () => ({ meta: [{ title: "Email queue — Admin" }] }),
  component: EmailQueue,
});

function EmailQueue() {
  const { data } = useQuery({
    queryKey: ["email-queue"],
    refetchInterval: 30_000,
    queryFn: async () => (await supabase.from("email_queue").select("*").order("created_at", { ascending: false }).limit(100)).data ?? [],
  });

  return (
    <div>
      <PageHeader title="Email queue" description="Queued, sent and failed emails from broadcasts and system events." />
      {(data ?? []).length === 0 ? (
        <EmptyState icon={Mail} title="No emails in the queue" description="Emails triggered by broadcasts and system events will appear here." />
      ) : (
        <div className="grid gap-2">
          {(data ?? []).map((e) => (
            <Card key={e.id} className="border-border/60">
              <CardContent className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{e.subject}</span>
                    <Badge>{e.status}</Badge>
                    <span className="text-xs text-muted-foreground">→ {e.to_email}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">Template · {e.template} · attempts {e.attempts}</div>
                  {e.last_error && <div className="mt-1 text-xs text-destructive">{e.last_error}</div>}
                </div>
                <div className="text-xs text-muted-foreground">{formatDate(e.sent_at ?? e.created_at, { dateStyle: "medium", timeStyle: "short" })}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
