import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Verify certificate — SarlaYash Blessings" },
      {
        name: "description",
        content: "Verify the authenticity of a SarlaYash Blessings certificate by verification code.",
      },
      { property: "og:title", content: "Verify certificate — SarlaYash Blessings" },
      { property: "og:description", content: "Verify a SarlaYash Blessings certificate." },
    ],
  }),
  component: VerifyPage,
});

interface VerifyResult {
  ok: boolean;
  data?: {
    title: string;
    certificate_number: string;
    track: string | null;
    issued_at: string;
    recipient_name: string | null;
  };
}

function VerifyPage() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);

  const verify = async () => {
    if (!code.trim()) return;
    setBusy(true);
    setResult(null);
    const { data, error } = await supabase
      .from("certificates")
      .select("title, certificate_number, track, issued_at, user_id, profiles:user_id(full_name)")
      .eq("verification_code", code.trim())
      .maybeSingle();
    setBusy(false);
    if (error || !data) {
      setResult({ ok: false });
      return;
    }
    setResult({
      ok: true,
      data: {
        title: data.title,
        certificate_number: data.certificate_number,
        track: data.track,
        issued_at: data.issued_at,
        recipient_name:
          (data as unknown as { profiles?: { full_name: string | null } }).profiles?.full_name ?? null,
      },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-accent" />
            <span className="font-serif text-lg font-semibold">SarlaYash Blessings</span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">Certificate verification</p>
        <h1 className="mt-3 font-serif text-4xl">Verify a certificate</h1>
        <p className="mt-3 text-muted-foreground">
          Enter the unique verification code printed on the certificate.
        </p>

        <Card className="mt-8 border-border/60">
          <CardHeader>
            <CardTitle className="font-serif">Verification code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. SYB-2026-XXXXXX"
                onKeyDown={(e) => e.key === "Enter" && verify()}
              />
              <Button onClick={verify} disabled={busy}>
                {busy ? "Verifying…" : "Verify"}
              </Button>
            </div>

            {result?.ok && result.data && (
              <div className="flex gap-3 rounded-lg border border-accent/40 bg-accent/5 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-accent" />
                <div>
                  <div className="font-medium text-foreground">Certificate verified</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {result.data.recipient_name && (
                      <>Awarded to <span className="text-foreground">{result.data.recipient_name}</span> — </>
                    )}
                    <span className="text-foreground">{result.data.title}</span>
                    {result.data.track && <> ({result.data.track})</>}
                    , issued {new Date(result.data.issued_at).toLocaleDateString()}. Certificate #{result.data.certificate_number}.
                  </div>
                </div>
              </div>
            )}

            {result && !result.ok && (
              <div className="flex gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
                <XCircle className="mt-0.5 h-5 w-5 text-destructive" />
                <div>
                  <div className="font-medium text-foreground">Not found</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    No certificate matches that code. Please check and try again.
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
