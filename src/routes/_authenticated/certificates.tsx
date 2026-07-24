import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-hooks";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, Download, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/certificates")({
  head: () => ({ meta: [{ title: "Certificates — SarlaYash Blessings" }] }),
  component: CertificatesPage,
});

function CertificatesPage() {
  const { user } = useAuth();
  const uid = user?.id;
  const { data: certs = [] } = useQuery({
    queryKey: ["certificates", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.from("certificates")
        .select("*").eq("user_id", uid!).order("issued_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div>
      <PageHeader title="Certificates" description="Your verifiable achievements from the program." />
      {certs.length === 0 ? (
        <EmptyState icon={Award} title="No certificates yet"
          description="Certificates are issued when your capstone is reviewed and approved." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {certs.map((c) => {
            const verifyUrl = `${origin}/verify?code=${c.verification_code}`;
            return (
              <Card key={c.id} className="border-border/60 bg-card overflow-hidden">
                <div className="border-b border-border/60 bg-gradient-to-br from-primary/5 via-background to-accent/10 p-6">
                  <div className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Certificate of completion
                  </div>
                  <div className="font-serif text-2xl">{c.title}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {c.track ? `${c.track} · ` : ""}Issued {new Date(c.issued_at).toLocaleDateString()}
                  </div>
                </div>
                <CardContent className="flex items-center justify-between gap-4 py-5">
                  <div className="text-xs text-muted-foreground">
                    <div>Certificate #</div>
                    <div className="font-mono text-foreground">{c.certificate_number}</div>
                    <div className="mt-2">Code</div>
                    <div className="font-mono text-foreground">{c.verification_code.slice(0, 12)}…</div>
                  </div>
                  <div className="shrink-0 rounded-md border border-border/60 bg-background p-2">
                    <QRCodeSVG value={verifyUrl} size={88} />
                  </div>
                </CardContent>
                <div className="flex justify-between border-t border-border/60 px-6 py-3 text-sm">
                  <a href={verifyUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                    Verify <ExternalLink className="h-3 w-3" />
                  </a>
                  {c.pdf_url && (
                    <a href={c.pdf_url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline">
                        <Download className="mr-2 h-4 w-4" /> PDF
                      </Button>
                    </a>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
