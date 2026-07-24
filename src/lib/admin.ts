import type { Database } from "@/integrations/supabase/types";

export type PipelineStage = Database["public"]["Enums"]["pipeline_stage"];

export interface StageDef {
  key: PipelineStage;
  label: string;
  short: string;
  tone: string;
}

export const PIPELINE_STAGES: StageDef[] = [
  { key: "applied", label: "Applied", short: "Applied", tone: "bg-secondary text-secondary-foreground" },
  { key: "under_review", label: "Under Review", short: "Reviewing", tone: "bg-blue-500/10 text-blue-700 dark:text-blue-300" },
  { key: "shortlisted", label: "Shortlisted", short: "Shortlist", tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  { key: "assessment_assigned", label: "Assessment Assigned", short: "Assess.·A", tone: "bg-purple-500/10 text-purple-700 dark:text-purple-300" },
  { key: "assessment_completed", label: "Assessment Completed", short: "Assess.·D", tone: "bg-purple-500/20 text-purple-800 dark:text-purple-200" },
  { key: "project_assigned", label: "Project Assigned", short: "Project·A", tone: "bg-teal-500/10 text-teal-700 dark:text-teal-300" },
  { key: "project_submitted", label: "Project Submitted", short: "Project·D", tone: "bg-teal-500/20 text-teal-800 dark:text-teal-200" },
  { key: "interview_scheduled", label: "Interview Scheduled", short: "Interview", tone: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300" },
  { key: "selected", label: "Selected", short: "Selected", tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  { key: "offer_released", label: "Offer Released", short: "Offer", tone: "bg-accent text-accent-foreground" },
  { key: "internship_started", label: "Internship Started", short: "Started", tone: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300" },
  { key: "internship_completed", label: "Internship Completed", short: "Completed", tone: "bg-cyan-500/20 text-cyan-800 dark:text-cyan-200" },
  { key: "certificate_issued", label: "Certificate Issued", short: "Certified", tone: "bg-yellow-500/20 text-yellow-800 dark:text-yellow-200" },
  { key: "rejected", label: "Rejected", short: "Rejected", tone: "bg-destructive/10 text-destructive" },
];

export function stageDef(k: PipelineStage | string | null | undefined): StageDef {
  return PIPELINE_STAGES.find((s) => s.key === k) ?? PIPELINE_STAGES[0];
}

export const STAFF_ROLES = ["super_admin", "admin", "mentor", "reviewer", "hr", "placement", "auditor"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export function initials(name?: string | null, email?: string | null) {
  const src = name ?? email ?? "?";
  return src.split(/\s+/).map((s) => s[0]).join("").slice(0, 2).toUpperCase();
}

export function formatDate(v: string | null | undefined, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) {
  if (!v) return "—";
  try { return new Date(v).toLocaleString(undefined, opts); } catch { return "—"; }
}

export function nextOfferNumber() {
  const year = new Date().getFullYear();
  const rnd = Math.floor(Math.random() * 90000) + 10000;
  return `SYB-OF-${year}-${rnd}`;
}

export function nextCertNumber() {
  const year = new Date().getFullYear();
  const rnd = Math.floor(Math.random() * 90000) + 10000;
  return `SYB-CERT-${year}-${rnd}`;
}
