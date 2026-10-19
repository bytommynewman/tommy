import type { Category } from "../domain";
import type { League } from "../catalog/teams";
import type { Forecast } from "../scoring";
import type { DraftQuestion } from "../server/services/questions";

/**
 * A measurable interpretation of a user's free-text take. The user always
 * reviews and approves one before anything is locked; the original text is
 * stored alongside it unchanged.
 */
export interface Suggestion {
  /** Stable key for the UI. */
  key: string;
  kind: "existing" | "draft" | "debate";
  questionId?: string;
  draft?: DraftQuestion;
  league: League | null;
  category: Category | "debate";
  /** Plain-English measurable statement. */
  statement: string;
  /** Pre-filled forecast the user can adjust. */
  suggestedForecast?: Forecast;
  /** Why this interpretation — shown to the user. */
  rationale: string;
}

export interface CatalogQuestionSummary {
  id: string;
  league: League;
  category: Category;
  kind: "binary" | "categorical";
  title: string;
  options?: { id: string; label: string }[];
}

export interface StructurerContext {
  now: Date;
  openQuestions: CatalogQuestionSummary[];
}

export interface PredictionStructurer {
  readonly name: string;
  suggest(text: string, ctx: StructurerContext): Promise<Suggestion[]>;
}
