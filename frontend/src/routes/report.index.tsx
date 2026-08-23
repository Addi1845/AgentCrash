import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { RotateCcw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ReliabilityGauge } from "@/components/reliability-gauge";
import { DeploymentVerdict } from "@/components/deployment-verdict";
import { ScoreBreakdown } from "@/components/score-breakdown";
import { FailureCard } from "@/components/failure-card";
import { api, sessionPointers } from "@/lib/api-client";
import type { Outcome, RunReport } from "@/lib/domain";
import { toFailure } from "@/lib/presentation";

export const Route = createFileRoute("/report/")({
  head: () => ({
    meta: [
      { title: "Reliability Report — AgentCrash" },
      {
        name: "description",
        content:
          "Persisted reliability score, canonical evidence, root causes, and deployment verdict.",
      },
    ],
  }),
  component: Report,
});

const factor: Record<Outcome, number> = { PASS: 1, WARNING: 0.5, FAIL: 0, ERROR: 0, CANCELLED: 0 };

async function loadBaseline(): Promise<RunReport | null> {
  const selected = sessionPointers.getBaseline();
  if (selected) return api.run(selected);
  const runs = await api.runs();
  const baseline = runs.find((run) => run.agentVersion === "buggy" && run.status === "COMPLETED");
  return baseline ? api.run(baseline.id) : null;
}

function Report() {
  const query = useQuery({ queryKey: ["baseline-report"], queryFn: loadBaseline });
  if (query.isLoading)
    return (
      <main className="mx-auto max-w-7xl px-4 py-20 font-mono text-sm text-muted-foreground">
        Loading the persisted report…
      </main>
    );
  if (query.error || !query.data)
    return (
      <main className="mx-auto max-w-4xl px-4 py-20">
        <div className="border border-warn/50 bg-warn-dim p-6">
          <p className="font-mono text-sm text-warn">No completed baseline exists.</p>
          <Link
            to="/run"
            className="mt-4 inline-flex bg-foreground px-5 py-2.5 font-mono text-xs text-background uppercase"
          >
            Run the suite
          </Link>
        </div>
      </main>
    );

  const report = query.data;
  const summary = report.run.summary!;
  const definitions = report.scenarios.map((item) => item.definition);
  const failures = report.findings.map((finding) => {
    const events =
      report.scenarios.find((item) => item.definition.stable_key === finding.scenarioKey)?.result
        ?.events ?? [];
    return toFailure(finding, definitions, events);
  });
  const categories = [
    ["Task Success", "NORMAL"],
    ["Policy & Edge Cases", "EDGE"],
    ["Failure Recovery", "SYSTEM_FAILURE"],
    ["Security & Consistency", "ADVERSARIAL"],
  ] as const;
  const categoryScores = categories.map(([label, category]) => {
    const selected = report.scenarios.filter(
      (item) => item.definition.category === category && item.result,
    );
    const total = selected.reduce((sum, item) => sum + item.definition.weight, 0);
    const earned = selected.reduce(
      (sum, item) => sum + item.definition.weight * factor[item.result!.outcome],
      0,
    );
    return { label, value: total ? Math.round((100 * earned) / total) : 0 };
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-14">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
          Step 05 — Reliability report
        </div>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-display text-4xl font-black uppercase tracking-tight text-foreground md:text-5xl">
            Reliability Report
          </h1>
          <span className="font-mono text-[11px] text-muted-foreground">
            {report.run.id} · 15 SCENARIOS · SUITE {report.contract.suite} · SEED{" "}
            {report.contract.seed}
          </span>
        </div>
      </motion.div>

      <div className="mt-10 grid gap-px border border-border bg-border lg:grid-cols-[auto_1fr]">
        <div className="flex items-center justify-center bg-card p-10">
          <ReliabilityGauge score={summary.score} size={270} animateOnView={false} />
        </div>
        <div className="relative flex flex-col justify-center overflow-hidden bg-card p-10">
          <div className="absolute inset-0 bg-blueprint opacity-40" />
          <div className="relative">
            <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
              Deployment verdict
            </div>
            <div className="mt-5">
              <DeploymentVerdict
                verdict={summary.verdict === "READY" ? "READY" : "DO NOT DEPLOY"}
              />
            </div>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground">
              The verdict is calculated by the backend from weighted outcomes and severity gates.
              Canonical sandbox mutations—not the agent’s final message—are the source of truth.
            </p>
            <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 font-mono text-[11px] text-muted-foreground">
              <span>
                <span className="text-pass">✓</span> {summary.counts.pass} PASSED
              </span>
              <span>
                <span className="text-warn">⚠</span> {summary.counts.warning} WARNINGS
              </span>
              <span>
                <span className="text-crit">✕</span> {summary.counts.fail} FAILED
              </span>
              <span>
                <span className="text-crit">◆</span> {summary.severity_counts.critical} CRITICAL
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-14">
        <h2 className="mb-4 font-mono text-[11px] tracking-[0.25em] text-muted-foreground uppercase">
          Category scores
        </h2>
        <ScoreBreakdown scores={categoryScores} />
      </div>

      <div className="mt-14">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-mono text-[11px] tracking-[0.25em] text-muted-foreground uppercase">
            Findings by blast radius
          </h2>
          <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
            {failures.length} DETECTED
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {failures
            .sort((a, b) => b.blastRadius - a.blastRadius)
            .map((failure) => (
              <FailureCard key={failure.id} failure={failure} />
            ))}
        </div>
      </div>

      <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border border-border bg-card px-6 py-6">
        <div>
          <h3 className="font-display text-xl font-extrabold uppercase tracking-tight text-foreground">
            Fixes applied?
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Re-run the same immutable suite and persist a version-to-version comparison.
          </p>
        </div>
        <Link
          to="/retest"
          className="group inline-flex items-center gap-2 bg-foreground px-6 py-3 font-mono text-[11px] font-medium tracking-[0.18em] text-background uppercase transition-colors hover:bg-pass"
        >
          <RotateCcw className="size-4 transition-transform group-hover:-rotate-180" /> Re-Test Same
          Suite
        </Link>
      </div>
    </main>
  );
}
