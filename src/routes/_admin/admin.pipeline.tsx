import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { PIPELINE_STAGES, stageDef } from "@/lib/admin";

export const Route = createFileRoute("/_admin/admin/pipeline")({
  head: () => ({ meta: [{ title: "Pipeline — Admin" }] }),
  component: Pipeline,
});

function Pipeline() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-pipeline"],
    queryFn: async () => {
      const { data: apps } = await supabase.from("applications")
        .select("id, program, track, pipeline_stage, user_id, created_at").order("created_at", { ascending: false }).limit(500);
      const ids = Array.from(new Set((apps ?? []).map((a) => a.user_id)));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, full_name, email").in("id", ids)
        : { data: [] };
      const byId = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));
      return (apps ?? []).map((a) => ({ ...a, profile: byId[a.user_id] }));
    },
  });

  async function move(id: string, stage: string) {
    const { error } = await supabase.from("applications").update({ pipeline_stage: stage as any }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Moved");
    void qc.invalidateQueries({ queryKey: ["admin-pipeline"] });
  }

  return (
    <div>
      <PageHeader title="Application pipeline" description="Move applicants through the hiring funnel." />
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((s) => {
            const items = (data ?? []).filter((a) => a.pipeline_stage === s.key);
            return (
              <Card key={s.key} className="w-72 shrink-0 border-border/60">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs uppercase tracking-widest">{s.short}</CardTitle>
                  <Badge className={s.tone}>{items.length}</Badge>
                </CardHeader>
                <CardContent className="space-y-2">
                  {items.length === 0 && <div className="text-xs text-muted-foreground">Empty</div>}
                  {items.map((a: any) => (
                    <div key={a.id} className="rounded-md border border-border/60 bg-card p-2 text-xs">
                      <Link to="/admin/applicants/$id" params={{ id: a.user_id }} className="font-medium hover:underline">
                        {a.profile?.full_name ?? a.profile?.email ?? "Applicant"}
                      </Link>
                      <div className="text-muted-foreground">{a.program}{a.track ? ` · ${a.track}` : ""}</div>
                      <Select value={a.pipeline_stage} onValueChange={(v) => move(a.id, v)}>
                        <SelectTrigger className="mt-2 h-7 text-[11px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PIPELINE_STAGES.map((st) => <SelectItem key={st.key} value={st.key}>{st.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
