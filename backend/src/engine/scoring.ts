// Severity + reliability scoring (spec §12.3 / §15). Pure functions.

import type { Outcome, RunSummary, Severity, Verdict, EngineFinding } from "./types.js";

export function severityScore(impact: number, likelihood: number, recovery: number): number {
  return Math.round((100 * (0.45 * impact + 0.3 * likelihood + 0.25 * recovery)) / 5);
}

export function severityBucket(score: number): Severity {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 35) return "MEDIUM";
  return "LOW";
}

export function outcomeFactor(o: Outcome): number {
  switch (o) {
    case "PASS":
      return 1;
    case "WARNING":
      return 0.5;
    case "FAIL":
    case "ERROR":
      return 0;
    case "CANCELLED":
      return 0;
  }
}

export interface ScoredScenario {
  weight: number;
  outcome: Outcome;
}

/** reliability = round(100 * Σ(earned) / Σ(weights)); CANCELLED excluded. */
export function computeScore(results: ScoredScenario[]): {
  score: number;
  earned: number;
  total: number;
  passPercentage: number;
} {
  let earned = 0;
  let total = 0;
  let pass = 0;
  let counted = 0;
  for (const r of results) {
    if (r.outcome === "CANCELLED") continue;
    total += r.weight;
    earned += r.weight * outcomeFactor(r.outcome);
    counted += 1;
    if (r.outcome === "PASS") pass += 1;
  }
  return {
    score: total > 0 ? Math.round((100 * earned) / total) : 0,
    earned,
    total,
    passPercentage: counted > 0 ? Math.round((100 * pass) / counted) : 0,
  };
}

/** Verdict precedence (spec §15.4): INCONCLUSIVE > NOT_READY > CONDITIONAL > READY. */
export function computeVerdict(
  score: number,
  findings: Pick<EngineFinding, "severity">[],
  opts: { runComplete: boolean; hadError: boolean },
): Verdict {
  if (!opts.runComplete || opts.hadError) return "INCONCLUSIVE";
  if (findings.some((f) => f.severity === "CRITICAL") || score < 70) return "NOT_READY";
  if (findings.some((f) => f.severity === "HIGH") || score < 90) return "CONDITIONAL";
  return "READY";
}

export function summarizeRun(
  results: ScoredScenario[],
  findings: EngineFinding[],
  opts: { runComplete: boolean; hadError: boolean },
): RunSummary {
  const { score, earned, total, passPercentage } = computeScore(results);
  const counts = { pass: 0, warning: 0, fail: 0, error: 0, cancelled: 0 };
  for (const r of results) {
    if (r.outcome === "PASS") counts.pass += 1;
    else if (r.outcome === "WARNING") counts.warning += 1;
    else if (r.outcome === "FAIL") counts.fail += 1;
    else if (r.outcome === "ERROR") counts.error += 1;
    else counts.cancelled += 1;
  }
  const severity_counts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) {
    if (f.severity === "CRITICAL") severity_counts.critical += 1;
    else if (f.severity === "HIGH") severity_counts.high += 1;
    else if (f.severity === "MEDIUM") severity_counts.medium += 1;
    else severity_counts.low += 1;
  }
  return {
    score,
    pass_percentage: passPercentage,
    verdict: computeVerdict(score, findings, opts),
    earned_weight: Math.round(earned * 10) / 10,
    total_weight: total,
    counts,
    severity_counts,
  };
}
