import type { DB, Prediction, Question } from "../domain";
import { toPublic, type PublicUser } from "./auth";
import { engagement } from "./services/social";
import { optionLabel } from "./services/questions";
import { subjectLite, type SubjectLite } from "../catalog/subjects";

export interface PredictionView {
  p: Prediction;
  author: PublicUser;
  question: Question | null;
  likes: number;
  comments: number;
  likedByViewer: boolean;
  revisions: number;
  subject: SubjectLite | null;
}

export function viewPrediction(d: DB, p: Prediction, viewerId: string | null): PredictionView {
  const author = d.users.find((u) => u.id === p.userId)!;
  const e = engagement(d, p.id);
  return {
    p,
    author: toPublic(author),
    question: p.questionId ? d.questions.find((q) => q.id === p.questionId) ?? null : null,
    ...e,
    likedByViewer: !!viewerId && d.likes.some((l) => l.userId === viewerId && l.predictionId === p.id),
    revisions: d.predictions.filter((x) => x.chainId === p.chainId).length,
    subject: subjectLite(p.subject),
  };
}

/** Forecast rows for display: [label, probability, role]. */
export function forecastRows(q: Question | null, p: Prediction): { label: string; p: number; role: "primary" | "dark" | "yes" | "no" | "field" }[] {
  const f = p.forecast;
  if (!f || !q) return [];
  if (f.type === "binary") return [{ label: "Yes", p: f.pYes, role: "yes" }, { label: "No", p: 1 - f.pYes, role: "no" }];
  const rows: ReturnType<typeof forecastRows> = [{ label: optionLabel(q, f.primary.optionId), p: f.primary.p, role: "primary" }];
  if (f.darkHorse) rows.push({ label: optionLabel(q, f.darkHorse.optionId), p: f.darkHorse.p, role: "dark" });
  rows.push({ label: "Rest of field", p: Math.max(0, 1 - f.primary.p - (f.darkHorse?.p ?? 0)), role: "field" });
  return rows;
}

export const userByName = (d: DB, username: string) => d.users.find((u) => u.username === username.toLowerCase());
