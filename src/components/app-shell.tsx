import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  User,
  FileText,
  ClipboardCheck,
  FolderKanban,
  Award,
  Bell,
  Settings,
  Users,
  BarChart3,
  Mail,
  FileBarChart,
  Cog,
  LogOut,
  Sparkles,
  Send,
  GitBranch,
  Layers,
  CalendarClock,
  Megaphone,
  ShieldCheck,
  Search as SearchIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signOut, useAuth } from "@/lib/auth-hooks";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const applicantNav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/applications", label: "Applications", icon: FileText },
  { to: "/assessments", label: "Assessments", icon: ClipboardCheck },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/certificates", label: "Certificates", icon: Award },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/settings", label: "Settings", icon: Settings },
];

const adminNav: NavItem[] = [
  { to: "/admin", label: "Command Center", icon: LayoutDashboard },
  { to: "/admin/applicants", label: "Applicants", icon: Users },
  { to: "/admin/pipeline", label: "Pipeline", icon: GitBranch },
  { to: "/admin/tracks", label: "Tracks", icon: Layers },
  { to: "/admin/cohorts", label: "Cohorts", icon: Users },
  { to: "/admin/assessments", label: "Assessments", icon: ClipboardCheck },
  { to: "/admin/questions", label: "Question bank", icon: FileText },
  { to: "/admin/projects", label: "Projects", icon: FolderKanban },
  { to: "/admin/interviews", label: "Interviews", icon: CalendarClock },
  { to: "/admin/offers", label: "Offers", icon: Sparkles },
  { to: "/admin/certificates", label: "Certificates", icon: Award },
  { to: "/admin/communications", label: "Communications", icon: Megaphone },
  { to: "/admin/emails", label: "Email queue", icon: Mail },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/reports", label: "Reports", icon: FileBarChart },
  { to: "/admin/audit", label: "Audit log", icon: ShieldCheck },
  { to: "/admin/search", label: "Global search", icon: SearchIcon },
  { to: "/admin/settings", label: "System settings", icon: Cog },
];

export function AppShell({ mode }: { mode: "applicant" | "admin" }) {
  const { user, isAdmin } = useAuth();
  const nav = mode === "admin" ? adminNav : applicantNav;
  const location = useLocation();
  const navigate = useNavigate();

  const initials = (user?.user_metadata?.full_name ?? user?.email ?? "?")
    .split(" ")
    .map((s: string) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="grid min-h-screen bg-background md:grid-cols-[260px_1fr]">
      <aside className="hidden flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <Link to="/" className="flex items-center gap-2 border-b border-sidebar-border px-6 py-5">
          <span className="inline-block h-2 w-2 rounded-full bg-accent" />
          <span className="font-serif text-base font-semibold">SarlaYash Blessings</span>
        </Link>

        <div className="px-4 pt-4 text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/50">
          {mode === "admin" ? "Admin portal" : "Applicant portal"}
        </div>

        <nav className="flex-1 space-y-1 px-3 py-3">
          {nav.map((item) => {
            const active =
              item.to === "/admin"
                ? location.pathname === "/admin"
                : location.pathname === item.to || location.pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors " +
                  (active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground")
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {isAdmin && (
          <div className="border-t border-sidebar-border p-3">
            <Link
              to={mode === "admin" ? "/dashboard" : "/admin"}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            >
              <Send className="h-4 w-4" />
              Switch to {mode === "admin" ? "applicant" : "admin"} portal
            </Link>
          </div>
        )}

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-sidebar-foreground">
                {user?.user_metadata?.full_name ?? user?.email}
              </div>
              <div className="truncate text-xs text-sidebar-foreground/60">{user?.email}</div>
            </div>
          </div>
          <Button
            onClick={() => signOut()}
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-start gap-2 text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b border-border bg-background/80 px-6 py-4 backdrop-blur md:hidden">
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-accent" />
            <span className="font-serif text-base font-semibold">SarlaYash Blessings</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => signOut()}>
            <LogOut className="h-4 w-4" />
          </Button>
        </header>
        <div className="md:hidden overflow-x-auto border-b border-border bg-secondary/30 px-4 py-2">
          <div className="flex gap-2">
            {nav.map((n) => (
              <button
                key={n.to}
                onClick={() => navigate({ to: n.to })}
                className={
                  "whitespace-nowrap rounded-md px-3 py-1.5 text-xs " +
                  (location.pathname === n.to
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {n.label}
              </button>
            ))}
          </div>
        </div>
        <main className="flex-1 px-6 py-8 md:px-10 md:py-12">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-3xl md:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Sparkles,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: typeof Sparkles;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card px-8 py-16 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <h3 className="font-serif text-xl">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
