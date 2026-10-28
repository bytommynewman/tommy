import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { LEAGUES } from "../catalog/teams";
import { DraftQuestionSchema } from "../server/services/questions";
import type { PredictionStructurer, StructurerContext, Suggestion } from "./types";

/**
 * Optional Claude-backed structurer. Enabled only when AI_PROVIDER=anthropic
 * and ANTHROPIC_API_KEY is set as a server-side secret (paid API — off by default).
 * Claude may only map the take onto catalog questions/options or propose a
 * binary draft; every id and draft is re-validated server-side, and the user
 * still approves the exact wording before lock. Claude never scores anything.
 */
const Out = z.object({
  interpretations: z.array(z.object({
    kind: z.enum(["existing", "draft", "debate"]),
    questionId: z.string().nullable(),
    optionId: z.string().nullable(),
    pYes: z.number().nullable(),
    league: z.enum(LEAGUES as [string, ...string[]]).nullable(),
    category: z.enum(["award", "trade", "breakout", "team", "comparison"]).nullable(),
    title: z.string().nullable(),
    criteria: z.string().nullable(),
    resolvesBy: z.string().nullable(),
    specificity: z.number().nullable(),
    rationale: z.string(),
  })),
});

export class ClaudeStructurer implements PredictionStructurer {
  readonly name = "claude";
  private client = new Anthropic();
  private model = process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5";

  async suggest(text: string, ctx: StructurerContext): Promise<Suggestion[]> {
    const catalog = ctx.openQuestions.map((q) => ({ id: q.id, league: q.league, kind: q.kind, title: q.title, options: q.options?.map((o) => `${o.id}=${o.label}`) }));
    const res = await this.client.messages.parse({
      model: this.model,
      max_tokens: 4000,
      output_config: { effort: "low", format: zodOutputFormat(Out) },
      system: [
        "You turn sports takes into measurable, objectively verifiable predictions for a prediction-tracking app.",
        "Never change the meaning of the user's take. Prefer an existing catalog question when one matches (use its exact id, and an exact option id for categorical questions).",
        "Otherwise propose a binary draft with an exact title, official resolution criteria, an ISO-8601 resolvesBy datetime in the future, and specificity 0..1.",
        "If the take is opinion and can't be objectively verified, return kind=debate. Return at most 3 interpretations, best first.",
      ].join(" "),
      messages: [{ role: "user", content: `Today: ${ctx.now.toISOString()}\nCatalog: ${JSON.stringify(catalog)}\nTake: ${text}` }],
    });
    if (res.stop_reason === "refusal" || !res.parsed_output) return [];
    const out: Suggestion[] = [];
    for (const i of res.parsed_output.interpretations) {
      if (i.kind === "existing") {
        const q = ctx.openQuestions.find((x) => x.id === i.questionId);
        if (!q) continue;
        const opt = q.options?.find((o) => o.id === i.optionId);
        out.push({
          key: `existing:${q.id}`, kind: "existing", questionId: q.id, league: q.league, category: q.category,
          statement: opt ? `${opt.label} — ${q.title}` : q.title, rationale: i.rationale,
          suggestedForecast: q.kind === "binary" ? { type: "binary", pYes: clamp(i.pYes ?? 0.6) } : opt ? { type: "categorical", primary: { optionId: opt.id, p: 0.35 } } : undefined,
        });
      } else if (i.kind === "draft") {
        const d = DraftQuestionSchema.safeParse({ league: i.league, category: i.category, title: i.title, criteria: i.criteria, resolutionSource: `${i.league}.com official results`, specificity: i.specificity ?? 0.5, resolvesBy: i.resolvesBy });
        if (!d.success || new Date(d.data.resolvesBy) <= ctx.now) continue;
        out.push({ key: `draft:${d.data.title}`, kind: "draft", draft: d.data, league: d.data.league as Suggestion["league"], category: d.data.category, statement: d.data.title, rationale: i.rationale, suggestedForecast: { type: "binary", pYes: clamp(i.pYes ?? 0.6) } });
      }
    }
    return out;
  }
}

const clamp = (p: number) => Math.min(0.99, Math.max(0.01, p));
