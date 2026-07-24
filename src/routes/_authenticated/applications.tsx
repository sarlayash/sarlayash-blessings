import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-hooks";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { TRACKS, type TrackDef } from "@/lib/tracks";
import { computeProfileCompletion } from "@/lib/profile";
import { Clock, CheckCircle2, GraduationCap, Sparkles } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Application = Database["public"]["Tables"]["applications"]["Row"];
type Status = Database["public"]["Enums"]["application_status"];

const STATUS_LABEL: Record<Status, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  accepted: "Accepted",
  rejected: "Not selected",
  withdrawn: "Withdrawn",
};

const STATUS_TONE: Record<Status, string> = {
  draft: "bg-secondary text-secondary-foreground",
  submitted: "bg-primary/10 text-primary",
  under_review: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  accepted: "bg-accent text-accent-foreground",
  rejected: "bg-destructive/10 text-destructive",
  withdrawn: "bg-muted text-muted-foreground",
};

export const Route = createFileRoute("/_authenticated/applications")({
  head: () => ({ meta: [{ title: "Applications — SarlaYash Blessings" }] }),
  component: ApplicationsPage,
});

function ApplicationsPage() {
  const { user } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();
  const [tab, setTab] = useState<"tracks" | "mine">("tracks");

  const { data: apps = [] } = useQuery({
    queryKey: ["applications", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.from("applications")
        .select("*").eq("user_id", uid!).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Application[];
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", uid],
    enabled: !!uid,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", uid!).maybeSingle()).data,
  });

  const completion = computeProfileCompletion(profile ?? null).percent;

  const openTracks = useMemo(() => {
    return TRACKS.map((t) => ({ track: t, app: apps.find((a) => a.track === t.slug) }));
  }, [apps]);

  const withdraw = async (id: string) => {
    if (!confirm("Withdraw this application?")) return;
    const { error } = await supabase.from("applications").update({ status: "withdrawn" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Application withdrawn");
    void qc.invalidateQueries({ queryKey: ["applications", uid] });
  };

  return (
    <div>
      <PageHeader
        title="Applications"
        description="Explore internship tracks and manage your submissions."
      />

      <div className="mb-6 inline-flex rounded-md border border-border bg-secondary/40 p-1 text-sm">
        {[
          { id: "tracks", label: "Open tracks" },
          { id: "mine", label: `My applications (${apps.length})` },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as typeof tab)}
            className={
              "rounded-md px-4 py-1.5 transition-colors " +
              (tab === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "tracks" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {openTracks.map(({ track, app }) => (
            <TrackCard
              key={track.slug}
              track={track}
              existing={app}
              readyToApply={completion >= 60}
              onChanged={() => qc.invalidateQueries({ queryKey: ["applications", uid] })}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {apps.length === 0 ? (
            <Card className="border-border/60"><CardContent className="py-10 text-center text-sm text-muted-foreground">
              You haven't applied to a track yet. Switch to Open tracks to start.
            </CardContent></Card>
          ) : (
            apps.map((a) => (
              <Card key={a.id} className="border-border/60">
                <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {a.submitted_at ? `Submitted ${new Date(a.submitted_at).toLocaleDateString()}`
                          : `Started ${new Date(a.created_at).toLocaleDateString()}`}
                      </span>
                    </div>
                    <div className="mt-2 font-serif text-xl">
                      {TRACKS.find((t) => t.slug === a.track)?.title ?? a.program}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {a.status === "draft" && (
                      <Button variant="outline" size="sm" onClick={() => withdraw(a.id)}>Delete draft</Button>
                    )}
                    {(a.status === "submitted" || a.status === "under_review") && (
                      <Button variant="outline" size="sm" onClick={() => withdraw(a.id)}>Withdraw</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function TrackCard({
  track, existing, readyToApply, onChanged,
}: { track: TrackDef; existing?: Application; readyToApply: boolean; onChanged: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [motivation, setMotivation] = useState(existing?.motivation ?? "");
  const [experience, setExperience] = useState(existing?.experience ?? "");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user) return;
    if (motivation.trim().length < 100) {
      return toast.error("Please write at least 100 characters of motivation.");
    }
    setSubmitting(true);
    const payload = {
      user_id: user.id,
      program: track.program,
      track: track.slug,
      motivation,
      experience,
      status: "submitted" as Status,
      submitted_at: new Date().toISOString(),
    };
    const query = existing
      ? supabase.from("applications").update(payload).eq("id", existing.id)
      : supabase.from("applications").insert(payload);
    const { error } = await query;
    setSubmitting(false);
    if (error) return toast.error(error.message);
    void supabase.from("activity_logs").insert({
      user_id: user.id, activity: `Applied to ${track.title}`, metadata: { track: track.slug },
    });
    toast.success("Application submitted");
    setOpen(false);
    onChanged();
  };

  return (
    <Card className="border-border/60">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="font-serif text-xl">{track.title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{track.tagline}</p>
          </div>
          {existing && <Badge className={STATUS_TONE[existing.status]}>{STATUS_LABEL[existing.status]}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {track.duration}</span>
          <span className="inline-flex items-center gap-1"><GraduationCap className="h-3 w-3" /> {track.eligibility[0]}</span>
        </div>
        <div>
          <div className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">Outcomes</div>
          <ul className="space-y-1 text-sm">
            {track.learningOutcomes.slice(0, 3).map((o) => (
              <li key={o} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center justify-between gap-3 pt-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">View details</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl">{track.title}</DialogTitle>
                <DialogDescription>{track.description}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <Section title="Eligibility" items={track.eligibility} />
                <Section title="Skills you should already have" items={track.skillsRequired} />
                <Section title="What you'll learn" items={track.learningOutcomes} />
                <Section title="Projects you'll ship" items={track.projects} />
              </div>
              {!existing || existing.status === "draft" || existing.status === "withdrawn" ? (
                <div className="space-y-3 border-t border-border pt-4">
                  <div>
                    <Label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">
                      Why this track?
                    </Label>
                    <Textarea rows={4} value={motivation} onChange={(e) => setMotivation(e.target.value)}
                      placeholder="Tell us why you're a fit — at least 100 characters." />
                  </div>
                  <div>
                    <Label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">
                      Relevant experience (optional)
                    </Label>
                    <Textarea rows={3} value={experience} onChange={(e) => setExperience(e.target.value)}
                      placeholder="Projects, coursework, hackathons…" />
                  </div>
                  {!readyToApply && (
                    <p className="text-xs text-destructive">
                      Complete at least 60% of your profile before applying.
                    </p>
                  )}
                  <DialogFooter>
                    <Button onClick={submit} disabled={submitting || !readyToApply}>
                      {submitting ? "Submitting…" : "Submit application"}
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Application status: <span className="font-medium text-foreground">{STATUS_LABEL[existing.status]}</span>
                </p>
              )}
            </DialogContent>
          </Dialog>

          {!existing && (
            <Button size="sm" onClick={() => setOpen(true)} disabled={!readyToApply}>
              <Sparkles className="mr-2 h-4 w-4" /> Apply
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">{title}</div>
      <ul className="list-inside list-disc space-y-1">
        {items.map((i) => <li key={i}>{i}</li>)}
      </ul>
    </div>
  );
}
