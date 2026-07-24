import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-hooks";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const CATEGORIES = ["all", "info", "application", "assessment", "project", "certificate"] as const;

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — SarlaYash Blessings" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("all");

  const { data: notifs = [] } = useQuery({
    queryKey: ["notifications", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.from("notifications")
        .select("*").eq("user_id", uid!).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(
    () => category === "all" ? notifs : notifs.filter((n) => n.category === category),
    [notifs, category],
  );

  const markAllRead = async () => {
    if (!uid) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() })
      .eq("user_id", uid).is("read_at", null);
    void qc.invalidateQueries({ queryKey: ["notifications", uid] });
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    void qc.invalidateQueries({ queryKey: ["notifications", uid] });
  };

  const unread = notifs.filter((n) => !n.read_at).length;

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Program updates, invites, reminders and reviews."
        actions={unread > 0 ? <Button variant="outline" size="sm" onClick={markAllRead}><Check className="mr-2 h-4 w-4" />Mark all read</Button> : undefined}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={
              "rounded-md border px-3 py-1.5 text-xs uppercase tracking-widest transition-colors " +
              (category === c
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border text-muted-foreground hover:text-foreground")
            }
          >
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Bell} title="You're all caught up" description="New notifications will appear here." />
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <Card key={n.id}
              className={"border-border/60 " + (!n.read_at ? "border-l-4 border-l-accent" : "")}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={"font-medium " + (!n.read_at ? "" : "text-muted-foreground")}>{n.title}</span>
                    <Badge variant="secondary" className="text-[10px] uppercase">{n.category}</Badge>
                  </div>
                  {n.body && <div className="mt-1 text-sm text-muted-foreground">{n.body}</div>}
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </div>
                </div>
                <div className="flex gap-2">
                  {n.link && <a href={n.link} className="text-xs underline underline-offset-4">Open</a>}
                  {!n.read_at && <Button size="sm" variant="outline" onClick={() => markRead(n.id)}>Mark read</Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
