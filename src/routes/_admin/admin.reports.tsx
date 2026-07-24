import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/admin/reports")({
  head: () => ({ meta: [{ title: "Reports — Admin" }] }),
  component: Reports,
});

function toCSV(rows: any[]): string {
  if (!rows.length) return "";
  const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const esc = (v: any) => {
    if (v == null) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
}

function download(name: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

function Reports() {
  const { data } = useQuery({
    queryKey: ["reports-summary"],
    queryFn: async () => {
      const [profiles, apps, attempts, projects, offers, certs] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("applications").select("id", { count: "exact", head: true }),
        supabase.from("assessment_attempts").select("id", { count: "exact", head: true }),
        supabase.from("projects").select("id", { count: "exact", head: true }),
        supabase.from("offers").select("id", { count: "exact", head: true }),
        supabase.from("certificates").select("id", { count: "exact", head: true }),
      ]);
      return {
        profiles: profiles.count ?? 0, apps: apps.count ?? 0, attempts: attempts.count ?? 0,
        projects: projects.count ?? 0, offers: offers.count ?? 0, certs: certs.count ?? 0,
      };
    },
  });

  async function exportCSV(table: "profiles" | "applications" | "assessment_attempts" | "projects" | "offers" | "certificates") {
    const { data, error } = await supabase.from(table).select("*").limit(5000);
    if (error) return toast.error(error.message);
    const csv = toCSV(data ?? []);
    download(`${table}-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    toast.success(`Exported ${data?.length ?? 0} rows`);
  }

  const reports = [
    { key: "profiles", label: "Applicants", n: data?.profiles ?? 0 },
    { key: "applications", label: "Applications", n: data?.apps ?? 0 },
    { key: "assessment_attempts", label: "Assessment attempts", n: data?.attempts ?? 0 },
    { key: "projects", label: "Projects", n: data?.projects ?? 0 },
    { key: "offers", label: "Offers", n: data?.offers ?? 0 },
    { key: "certificates", label: "Certificates", n: data?.certs ?? 0 },
  ] as const;

  return (
    <div>
      <PageHeader title="Reports & exports" description="Download filtered data as CSV for downstream analysis or archival." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => (
          <Card key={r.key} className="border-border/60">
            <CardHeader className="pb-2"><CardTitle className="text-sm">{r.label}</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="font-serif text-3xl">{r.n}</div>
              <Button size="sm" variant="outline" onClick={() => exportCSV(r.key as any)}>
                <Download className="mr-1 h-3 w-3" /> Export CSV
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
