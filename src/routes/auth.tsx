import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — SarlaYash Blessings" },
      {
        name: "description",
        content: "Sign in with Google to access your SarlaYash Blessings applicant portal.",
      },
      { property: "og:title", content: "Sign in — SarlaYash Blessings" },
      { property: "og:description", content: "Google sign-in for the SarlaYash Blessings internship platform." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) navigate({ to: "/dashboard" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const handleGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Sign-in failed", { description: result.error.message });
      return;
    }
    // On redirected: browser navigates. On popup success: onAuthStateChange fires.
  };

  return (
    <div className="grid min-h-screen bg-background md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground md:flex">
        <Link to="/" className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-accent" />
          <span className="font-serif text-lg font-semibold">SarlaYash Blessings</span>
        </Link>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-accent">
            Legacy of Values
          </p>
          <h1 className="mt-4 max-w-md font-serif text-4xl leading-tight">
            Your future starts with a single application.
          </h1>
          <p className="mt-4 max-w-md text-sm text-sidebar-foreground/70">
            Track your applications, complete assessments, build projects, and earn a
            verifiable certificate — all in one portal.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/60">
          © {new Date().getFullYear()} SarlaYash Learning Solutions LLP
        </p>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <Link to="/" className="text-xs uppercase tracking-widest text-muted-foreground md:hidden">
            ← Back to home
          </Link>
          <h2 className="mt-6 font-serif text-3xl">Welcome</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to continue. We only support Google to keep your account secure.
          </p>

          <Button
            onClick={handleGoogle}
            disabled={busy}
            className="mt-8 w-full gap-3 bg-primary text-primary-foreground hover:bg-primary/90"
            size="lg"
          >
            <GoogleIcon />
            {busy ? "Redirecting…" : "Continue with Google"}
          </Button>

          <p className="mt-8 text-xs text-muted-foreground">
            By continuing, you agree to be a member of the SarlaYash Blessings platform.
            Admin access is provisioned by the organization.
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.44-1.7 4.22-5.5 4.22-3.3 0-6-2.74-6-6.12S8.7 6.08 12 6.08c1.88 0 3.14.8 3.86 1.48l2.63-2.54C16.8 3.5 14.6 2.4 12 2.4 6.98 2.4 2.9 6.48 2.9 11.5S6.98 20.6 12 20.6c6.92 0 9.5-4.86 9.5-7.3 0-.5-.05-.86-.13-1.24H12z" />
    </svg>
  );
}
