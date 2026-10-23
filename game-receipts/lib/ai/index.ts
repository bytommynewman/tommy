import { RuleStructurer } from "./rules";
import type { StructurerContext, Suggestion } from "./types";

const rules = new RuleStructurer();

/** Provider switch. Default is the free, deterministic rule structurer. */
export async function structureTake(text: string, ctx: StructurerContext): Promise<{ provider: string; suggestions: Suggestion[] }> {
  const ruleOut = await rules.suggest(text, ctx);
  if (process.env.AI_PROVIDER !== "anthropic" || !process.env.ANTHROPIC_API_KEY) return { provider: rules.name, suggestions: ruleOut };
  try {
    const { ClaudeStructurer } = await import("./claude");
    const llm = await new ClaudeStructurer().suggest(text, ctx);
    const seen = new Set(llm.map((s) => s.key));
    return { provider: "claude", suggestions: [...llm, ...ruleOut.filter((s) => !seen.has(s.key))] };
  } catch (e) {
    console.error("[ai] Claude structurer failed, using rules", e instanceof Error ? e.message : e);
    return { provider: rules.name, suggestions: ruleOut };
  }
}

export type { Suggestion } from "./types";
