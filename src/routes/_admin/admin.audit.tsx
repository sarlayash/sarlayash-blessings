import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";
import { formatDate } from "@/lib/admin";

export const Route = createFileRoute("/_admin/admin/audit")({
  head: () => ({ meta: [{ title: "Audit log — Admin" }] }),
  component: Audit,
});

function Audit() {
  const [q, setQ] = useState("");
  const [entity, setEntity] = useState("all");

  const { data } = useQuery({
    queryKey: ["audit", q, entity],
    refetchInterval: 60_000,
    queryFn: async () => {
      let query = supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200);
      if (entity !== "all") query = query.eq("entity", entity);
      if (q) query = query.ilike("action", `%${q}%`);
      return (await query).data ?? [];
    },
  });

  return (
    <div>
      <PageHeader title="Audit log" description="Every admin action, who did it, and when." />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input placeholder="Search action…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
        <Select value={entity} onValueChange={setEntity}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entities</SelectItem>
            <SelectItem value="application">Application</SelectItem>
            <SelectItem value="assessment">Assessment</SelectItem>
            <SelectItem value="project">Project</SelectItem>
            <SelectItem value="offer">Offer</SelectItem>
            <SelectItem value="certificate">Certificate</SelectItem>
            <SelectItem value="cohort">Cohort</SelectItem>
            <SelectItem value="track">Track</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(data ?? []).length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No audit entries" description="Audit entries recorded by the platform will appear here." />
      ) : (
        <div className="grid gap-2">
          {(data ?? []).map((a) => (
            <Card key={a.id} className="border-border/60">
              <CardContent className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{a.action}</span>
                    {a.entity && <Badge variant="outline">{a.entity}</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Actor {a.actor_id ?? "system"} {a.ip_address && `· ${a.ip_address}`}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">{formatDate(a.created_at, { dateStyle: "medium", timeStyle: "medium" })}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
