import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users } from "lucide-react";
import { PIPELINE_STAGES, stageDef } from "@/lib/admin";

export const Route = createFileRoute("/_admin/admin/applicants")({
  head: () => ({ meta: [{ title: "Applicants — Admin" }] }),
  component: Applicants,
});

const PAGE = 25;

function Applicants() {
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<string>("all");
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-applicants", q, stage, page],
    queryFn: async () => {
      let query = supabase.from("profiles")
        .select("id, full_name, email, phone, city, state, college, degree, created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE, page * PAGE + PAGE - 1);
      if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,college.ilike.%${q}%`);
      const { data: profileRows, count, error } = await query;
      if (error) throw error;
      const ids = (profileRows ?? []).map((p) => p.id);
      let appsByUser: Record<string, any[]> = {};
      if (ids.length) {
        const { data: appRows } = await supabase.from("applications")
          .select("id, user_id, program, pipeline_stage, status, created_at")
          .in("user_id", ids)
          .order("created_at", { ascending: false });
        for (const a of appRows ?? []) (appsByUser[a.user_id] ??= []).push(a);
      }
      let rows = (profileRows ?? []).map((p) => ({ ...p, applications: appsByUser[p.id] ?? [] }));
      if (stage !== "all") rows = rows.filter((r) => r.applications.some((a) => a.pipeline_stage === stage));
      return { rows, count: count ?? 0 };
    },
  });

  const totalPages = useMemo(() => Math.max(1, Math.ceil((data?.count ?? 0) / PAGE)), [data?.count]);

  return (
    <div>
      <PageHeader title="Applicants" description={`${data?.count ?? 0} registered users on the platform.`} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input placeholder="Search by name, email or college…" value={q} onChange={(e) => { setPage(0); setQ(e.target.value); }} className="max-w-sm" />
        <Select value={stage} onValueChange={(v) => { setPage(0); setStage(v); }}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Pipeline stage" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All pipeline stages</SelectItem>
            {PIPELINE_STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>College</TableHead>
              <TableHead>Pipeline</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>}
            {!isLoading && (data?.rows ?? []).length === 0 && (
              <TableRow><TableCell colSpan={5} className="py-10"><EmptyState icon={Users} title="No applicants found" description="Try widening your filters or search terms." /></TableCell></TableRow>
            )}
            {(data?.rows ?? []).map((p: any) => {
              const latest = (p.applications ?? []).sort((a: any, b: any) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))[0];
              const s = stageDef(latest?.pipeline_stage);
              return (
                <TableRow key={p.id} className="cursor-pointer">
                  <TableCell className="font-medium">
                    <Link to="/admin/applicants/$id" params={{ id: p.id }} className="hover:underline">{p.full_name ?? "—"}</Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.email ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.college ?? "—"}</TableCell>
                  <TableCell>{latest ? <Badge className={s.tone}>{s.label}</Badge> : <span className="text-xs text-muted-foreground">No application</span>}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <div>Page {page + 1} of {totalPages}</div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Previous</Button>
          <Button size="sm" variant="outline" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}
