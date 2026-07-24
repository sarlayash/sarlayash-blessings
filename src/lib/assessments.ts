import type { Database } from "@/integrations/supabase/types";

export type QuestionType =
  | "mcq"
  | "multi_select"
  | "true_false"
  | "short_answer"
  | "long_answer"
  | "coding"
  | "file_upload"
  | "case_study"
  | "video_response";

export const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "mcq", label: "Multiple Choice" },
  { value: "multi_select", label: "Multiple Select" },
  { value: "true_false", label: "True / False" },
  { value: "short_answer", label: "Short Answer" },
  { value: "long_answer", label: "Long Answer" },
  { value: "coding", label: "Coding Challenge" },
  { value: "file_upload", label: "File Upload" },
  { value: "case_study", label: "Case Study" },
];

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export type Assessment = Database["public"]["Tables"]["assessments"]["Row"];
export type AssessmentQuestion = Database["public"]["Tables"]["assessment_questions"]["Row"];
export type AssessmentAttempt = Database["public"]["Tables"]["assessment_attempts"]["Row"];
export type AttemptAnswer = Database["public"]["Tables"]["attempt_answers"]["Row"];

export interface QuestionOption {
  id: string;
  text: string;
}

export function parseOptions(raw: unknown): QuestionOption[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((o, i) => {
      if (typeof o === "string") return { id: String(i), text: o };
      if (o && typeof o === "object" && "text" in o) {
        const obj = o as { id?: string; text: string };
        return { id: obj.id ?? String(i), text: obj.text };
      }
      return null;
    })
    .filter((x): x is QuestionOption => !!x);
}

/**
 * Score a single answer against the question's correct_answer.
 * Returns { marks_awarded, is_correct } — is_correct is null for subjective types.
 */
export function scoreAnswer(
  question: Pick<AssessmentQuestion, "type" | "marks" | "negative_marks" | "correct_answer" | "options">,
  answer: unknown,
): { marks_awarded: number; is_correct: boolean | null } {
  const marks = Number(question.marks) || 0;
  const neg = Number(question.negative_marks) || 0;

  if (answer === undefined || answer === null || (Array.isArray(answer) && answer.length === 0) || answer === "") {
    return { marks_awarded: 0, is_correct: null };
  }

  switch (question.type) {
    case "mcq":
    case "true_false": {
      const correct = String(question.correct_answer ?? "");
      const given = String(answer);
      const ok = correct !== "" && correct === given;
      return { marks_awarded: ok ? marks : -neg, is_correct: ok };
    }
    case "multi_select": {
      const correctArr = Array.isArray(question.correct_answer) ? (question.correct_answer as unknown[]).map(String) : [];
      const givenArr = Array.isArray(answer) ? (answer as unknown[]).map(String) : [];
      if (correctArr.length === 0) return { marks_awarded: 0, is_correct: null };
      const correctSet = new Set(correctArr);
      const givenSet = new Set(givenArr);
      let correctPicks = 0;
      let wrongPicks = 0;
      givenSet.forEach((g) => (correctSet.has(g) ? correctPicks++ : wrongPicks++));
      const perOption = marks / correctSet.size;
      const partial = Math.max(0, correctPicks * perOption - wrongPicks * perOption);
      const allCorrect = correctPicks === correctSet.size && wrongPicks === 0;
      return {
        marks_awarded: allCorrect ? marks : Math.round(partial * 100) / 100,
        is_correct: allCorrect,
      };
    }
    case "short_answer": {
      const correct = String(question.correct_answer ?? "").trim().toLowerCase();
      const given = String(answer).trim().toLowerCase();
      if (!correct) return { marks_awarded: 0, is_correct: null }; // needs manual review
      const ok = correct === given;
      return { marks_awarded: ok ? marks : 0, is_correct: ok };
    }
    // Subjective / requires review — no auto marks
    case "long_answer":
    case "coding":
    case "file_upload":
    case "case_study":
    case "video_response":
      return { marks_awarded: 0, is_correct: null };
  }
}

/** Validate a short answer — reject empty, keyboard mashing, or single chars. */
export function isReasonableShortAnswer(text: string, min = 1): boolean {
  const t = text.trim();
  if (t.length < min) return false;
  // reject strings that are purely non-word characters or a single repeating char
  if (!/[a-zA-Z0-9]/.test(t)) return false;
  const uniqueChars = new Set(t.replace(/\s+/g, "").split("")).size;
  if (t.length > 6 && uniqueChars <= 2) return false;
  // reject long asdf-style mashes: no vowels AND length > 8
  if (t.length > 8 && !/[aeiouAEIOU]/.test(t)) return false;
  return true;
}

export function wordCount(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

export function difficultyColor(d?: string | null): string {
  switch (d) {
    case "easy":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    case "hard":
      return "bg-red-500/10 text-red-700 dark:text-red-400";
    default:
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
  }
}

export function statusColor(s?: string | null): string {
  switch (s) {
    case "published":
      return "bg-accent text-accent-foreground";
    case "archived":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-secondary text-secondary-foreground";
  }
}
