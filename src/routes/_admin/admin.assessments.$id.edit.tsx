import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { AssessmentEditor } from "@/components/admin/assessment-editor";
import { QuestionsEditor } from "@/components/admin/questions-editor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Send, Users } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/assessments/$id/edit")({
  head: () => ({ meta: [{ title: "Edit assessment — Admin" }] }),
  component: EditAssessment,
});

function EditAssessment() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-assessment", id],
    queryFn: async () => {
      const [{ data: assessment }, { data: questions }, { data: attempts }] = await Promise.all([
        supabase.from("assessments").select("*").eq("id", id).maybeSingle(),
        supabase.from("assessment_questions").select("*").eq("assessment_id", id).order("order_index"),
        supabase.from("assessment_attempts").select("id,status,percentage,passed").eq("assessment_id", id),
      ]);
      return { assessment, questions: questions ?? [], attempts: attempts ?? [] };
    },
  });

  if (isLoading || !data) return <div className="h-64 animate-pulse rounded-lg bg-muted" />;
  if (!data.assessment) return <div className="p-8">Not found.</div>;

  async function saveMeta(values: Record<string, unknown>) {
    const { error } = await supabase.from("assessments").update(values as never).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    void refetch();
  }

  async function publish() {
    if ((data?.questions.length ?? 0) === 0) return toast.error("Add at least one question first");
    await saveMeta({ status: "published", is_active: true });
    void qc.invalidateQueries({ queryKey: ["admin-assessments"] });
  }

  const totalMarks = data.questions.reduce((s, q) => s + Number(q.marks || 0), 0);
  const submitted = data.attempts.filter((a) => a.status !== "in_progress").length;
  const passRate = submitted > 0 ? Math.round((data.attempts.filter((a) => a.passed).length / submitted) * 100) : 0;

  return (
    <div>
      <Link to="/admin/assessments" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> All assessments
      </Link>
      <PageHeader
        title={data.assessment.title}
        description={`${data.questions.length} questions · ${totalMarks} marks · status: ${data.assessment.status}`}
        actions={
          <>
            {data.assessment.status !== "published" && (
              <Button onClick={publish}><Send className="mr-1 h-4 w-4" />Publish</Button>
            )}
          </>
        }
      />

      <Tabs defaultValue="questions" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="questions">
          <QuestionsEditor assessmentId={id} questions={data.questions} onChange={() => void refetch()} />
        </TabsContent>

        <TabsContent value="settings">
          <AssessmentEditor mode="edit" initial={data.assessment} onSubmit={saveMeta} />
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid gap-4 md:grid-cols-3">
            <Card><CardHeader><CardTitle className="font-serif text-lg">Attempts</CardTitle></CardHeader><CardContent><div className="font-serif text-4xl">{data.attempts.length}</div></CardContent></Card>
            <Card><CardHeader><CardTitle className="font-serif text-lg">Submitted</CardTitle></CardHeader><CardContent><div className="font-serif text-4xl">{submitted}</div></CardContent></Card>
            <Card><CardHeader><CardTitle className="font-serif text-lg">Pass rate</CardTitle></CardHeader><CardContent><div className="font-serif text-4xl">{passRate}%</div></CardContent></Card>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            <Users className="mr-1 inline h-3 w-3" /> Deeper per-question analytics ship in the Reports module.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
