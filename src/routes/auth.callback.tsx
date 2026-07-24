import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  component: Callback,
});

function Callback() {
  const navigate = useNavigate();

  useEffect(() => {
    const finish = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email === "namaste@sarlayash.com") {
        navigate({ to: "/admin" });
      } else {
        navigate({ to: "/dashboard" });
      }
    };

    finish();
  }, [navigate]);

  return <div>Signing you in...</div>;
}