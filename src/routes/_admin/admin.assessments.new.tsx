import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-hooks";
import { PageHeader } from "@/components/app-shell";
import { AssessmentEditor } from "@/components/admin/assessment-editor";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/admin/assessments/new")({
  head: () => ({ meta: [{ title: "New assessment — Admin" }] }),
  component: NewAssessment,
});

function NewAssessment() {
  const { user } = useAuth();
  const navigate = useNavigate();

  async function create(values: Record<string, unknown>) {
    if (!user) return;
    const { data, error } = await supabase.from("assessments").insert({
      ...values, created_by: user.id,
    } as never).select("id").single();
    if (error) { toast.error(error.message); return; }
    toast.success("Assessment created — add questions next");
    navigate({ to: "/admin/assessments/$id/edit", params: { id: data.id } });
  }

  return (
    <div>
      <PageHeader title="New assessment" description="Set the basics. You'll add questions on the next step." />
      <AssessmentEditor mode="create" onSubmit={create} />
    </div>
  );
}
