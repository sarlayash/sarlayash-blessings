import type { Database } from "@/integrations/supabase/types";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

interface CompletionWeights {
  key: string;
  label: string;
  weight: number;
  filled: (p: ProfileRow) => boolean;
}

export const PROFILE_WEIGHTS: CompletionWeights[] = [
  { key: "photo", label: "Profile photo", weight: 5, filled: (p) => !!p.avatar_url },
  { key: "basics", label: "Basic info (name, phone, DOB, location)", weight: 10, filled: (p) =>
      !!p.full_name && !!p.phone && !!p.date_of_birth && !!p.city && !!p.country },
  { key: "education", label: "Education details", weight: 20, filled: (p) =>
      !!p.college && !!p.degree && !!p.branch && !!p.passing_year },
  { key: "skills", label: "Skills", weight: 15, filled: (p) => (p.skills ?? []).length >= 3 },
  { key: "resume", label: "Resume uploaded", weight: 20, filled: (p) => !!p.resume_url },
  { key: "linkedin", label: "LinkedIn URL", weight: 10, filled: (p) => !!p.linkedin_url },
  { key: "github", label: "GitHub URL", weight: 10, filled: (p) => !!p.github_url },
  { key: "objective", label: "Career objective", weight: 10, filled: (p) =>
      !!p.career_objective && p.career_objective.trim().length >= 40 },
];

export function computeProfileCompletion(p: ProfileRow | null | undefined) {
  if (!p) return { percent: 0, items: PROFILE_WEIGHTS.map((w) => ({ ...w, done: false })) };
  const items = PROFILE_WEIGHTS.map((w) => ({ ...w, done: w.filled(p) }));
  const percent = items.reduce((s, i) => s + (i.done ? i.weight : 0), 0);
  return { percent, items };
}

export interface ReadinessInputs {
  profile: ProfileRow | null;
  projectsCompleted: number;
  projectsTotal: number;
  assessmentsPassed: number;
  assessmentsTotal: number;
  applicationsSubmitted: number;
  certificates: number;
}

export function computePlacementReadiness(i: ReadinessInputs) {
  const p = i.profile;
  const factors: { label: string; score: number; weight: number }[] = [
    { label: "Profile", weight: 15, score: p ? computeProfileCompletion(p).percent : 0 },
    { label: "Skills", weight: 10, score: p ? Math.min(100, (p.skills?.length ?? 0) * 15) : 0 },
    { label: "Resume", weight: 10, score: p?.resume_url ? 100 : 0 },
    { label: "LinkedIn", weight: 5, score: p?.linkedin_url ? 100 : 0 },
    { label: "GitHub", weight: 5, score: p?.github_url ? 100 : 0 },
    { label: "Applications", weight: 10, score: Math.min(100, i.applicationsSubmitted * 100) },
    {
      label: "Assessments",
      weight: 15,
      score: i.assessmentsTotal === 0 ? 0 : Math.round((i.assessmentsPassed / i.assessmentsTotal) * 100),
    },
    {
      label: "Projects",
      weight: 20,
      score: i.projectsTotal === 0 ? 0 : Math.round((i.projectsCompleted / i.projectsTotal) * 100),
    },
    { label: "Certificates", weight: 10, score: Math.min(100, i.certificates * 50) },
  ];
  const total = factors.reduce((s, f) => s + (f.score * f.weight) / 100, 0);
  return { percent: Math.round(total), factors };
}

export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
