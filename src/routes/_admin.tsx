import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-hooks";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { loading, session, isStaff, roles } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session) { navigate({ to: "/auth" }); return; }
    if (roles.length === 0) return;
    if (!isStaff) navigate({ to: "/dashboard" });
  }, [loading, session, roles, isStaff, navigate]);

  if (loading || !session || !isStaff) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <div className="text-sm">Checking access…</div>
      </div>
    );
  }
  return <AppShell mode="admin" />;
}
