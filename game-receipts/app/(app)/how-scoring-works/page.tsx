import { Card, SectionTitle } from "@/components/ui/primitives";
import { PageHeader } from "@/components/app/Shell";
import {
  DAILY_LOCK_LIMIT, GRADING_VERSION, MIN_RESOLVED_ALL_TIME, MIN_RESOLVED_MONTHLY, PRESTIGE_WEIGHTS, PRIOR_SCORE, PRIOR_WEIGHT,
  RECEIPT_MIN_LEAD_HOURS, TIMING_SATURATION_DAYS, WITHDRAW_GRACE_MINUTES,
} from "@/lib/scoring";

export const metadata = { title: "How grading works" };

const P = ({ children }: { children: React.ReactNode }) => <p className="text-sm leading-relaxed text-ink-300">{children}</p>;
const M = ({ children }: { children: React.ReactNode }) => <code className="rounded bg-ink-900 px-1.5 py-0.5 font-mono text-[13px] text-volt">{children}</code>;

export default function ScoringPage() {
  const w = PRESTIGE_WEIGHTS;
  return (
    <div className="space-y-5">
      <PageHeader title="How grading works" sub={`Rubric ${GRADING_VERSION}. Deterministic: the same inputs always give the same score. No AI decides a grade.`} />
      <Card className="space-y-3 p-5">
        <SectionTitle>1 · Accuracy (0–100)</SectionTitle>
        <P>Every graded take is a probability forecast. We score it with the <b className="text-white">Brier score</b>, a <i>proper</i> scoring rule: your best expected score always comes from reporting what you actually believe. For outcomes <M>i</M> with your probabilities <M>pᵢ</M>:</P>
        <P><M>Brier = Σ (pᵢ − oᵢ)²</M> &nbsp; (0 = perfect, 2 = certain and wrong) &nbsp;→&nbsp; <M>Accuracy = 100 × (1 − Brier / 2)</M></P>
        <P><b className="text-white">Award ballots:</b> your primary pick and optional dark horse carry the confidences you set. The remainder is spread across <i>every other candidate</i> in proportion to consensus, so “the field” is never a single lumped outcome — a long shot that hits still gives you a little credit, but you can’t game it.</P>
      </Card>
      <Card className="space-y-3 p-5">
        <SectionTitle>2 · Take Prestige (0–100)</SectionTitle>
        <P>The headline number on a receipt. A weighted blend (weights are configurable and versioned):</P>
        <ul className="space-y-2 text-sm text-ink-300">
          <li><b className="text-white">{w.relativeAccuracy * 100}% Accuracy vs. expectations</b> — your Brier vs. the consensus baseline snapshotted at lock: <M>100 × clamp(0.5 + (Brier_consensus − Brier_you)/4)</M>. Matching consensus scores exactly 50.</li>
          <li><b className="text-white">{w.boldness * 100}% Boldness</b> — <M>(1 − consensus on outcome) × how far you moved toward it</M>. Only leaning toward what actually happened counts.</li>
          <li><b className="text-white">{w.timing * 100}% Timing</b> — log-scaled lead time from lock to confirmation (saturates at {TIMING_SATURATION_DAYS} days), multiplied by your probability on the outcome.</li>
          <li><b className="text-white">{w.specificity * 100}% Specificity</b> — how narrow the claim is (set per question), multiplied by your probability on the outcome.</li>
        </ul>
        <P>Early, specific, bold — and wrong — earns nothing for timing or specificity.</P>
      </Card>
      <Card className="space-y-3 p-5">
        <SectionTitle>3 · Reputation & leaderboards</SectionTitle>
        <P>Your grade is your average Take Prestige, <b className="text-white">shrunk toward {PRIOR_SCORE}</b> (roughly what copying consensus earns) by {PRIOR_WEIGHT} phantom predictions: <M>(Σ prestige + {PRIOR_WEIGHT}×{PRIOR_SCORE}) / (n + {PRIOR_WEIGHT})</M>. One lucky call can’t beat a long strong record. Ranking needs {MIN_RESOLVED_ALL_TIME} resolved takes all-time, or {MIN_RESOLVED_MONTHLY} in a monthly or league board. Monthly grades count takes in the UTC month they resolve; pending takes never count against you.</P>
      </Card>
      <Card className="space-y-3 p-5">
        <SectionTitle>4 · Anti-manipulation</SectionTitle>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-300">
          <li>One live take per question. Changing your mind posts a timestamped <b className="text-white">revision</b>; the chain is scored time-weighted by how long each revision stood, so a late flip can’t erase an early miss.</li>
          <li>Withdrawals inside {WITHDRAW_GRACE_MINUTES} minutes (typos) are voided. After that, withdrawn takes stay on your record and <b className="text-white">are still graded</b>.</li>
          <li>Picking chalk earns accuracy but little prestige — relative accuracy rewards beating consensus, not agreeing with it.</li>
          <li>At most {DAILY_LOCK_LIMIT} graded locks per day. User-created questions only count after moderator approval.</li>
          <li>Receipt awards (earliest correct, most impressive, best calibrated) require the final revision to be correct and locked at least {RECEIPT_MIN_LEAD_HOURS}h before confirmation.</li>
          <li>Paid plans never change scoring or verification.</li>
        </ul>
      </Card>
      <Card className="space-y-3 p-5">
        <SectionTitle>5 · Verification & disputes</SectionTitle>
        <P>Outcomes are resolved by reviewers against official league sources, with evidence links attached to every resolution. Any user can dispute a graded take; reviewers respond, and a corrected outcome regrades everyone deterministically. Each receipt is sealed with a SHA-256 hash chained to the author’s previous receipt — tamper-evident, not a blockchain.</P>
        <P>Hot takes that can’t be objectively verified are labelled debates: community votes, never a grade.</P>
      </Card>
    </div>
  );
}
