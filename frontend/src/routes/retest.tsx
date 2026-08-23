import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { animate, motion } from "motion/react";
import { ArrowRight, RotateCcw, ShieldCheck } from "lucide-react";
import { DeploymentVerdict } from "@/components/deployment-verdict";
import { ScoreBreakdown } from "@/components/score-breakdown";
import { TestProgress } from "@/components/test-progress";
import { api, sessionPointers } from "@/lib/api-client";
import type { Outcome, RetestTransition, RunReport } from "@/lib/domain";

export const Route = createFileRoute("/retest")({
  head: () => ({
    meta: [
      { title: "Full-Suite Re-Test — AgentCrash" },
      {
        name: "description",
        content: "Run and persist a complete version-to-version reliability comparison.",
      },
    ],
  }),
  component: Retest,
});

type Phase = "idle" | "submitting" | "running" | "done";
const factor: Record<Outcome, number> = { PASS: 1, WARNING: 0.5, FAIL: 0, ERROR: 0, CANCELLED: 0 };

function Retest() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(68);
  const [error, setError] = useState("");
  const [result, setResult] = useState<(RunReport & { comparison: RetestTransition[] }) | null>(
    null,
  );
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = async () => {
    setPhase("submitting");
    setError("");
    try {
      let baseline = sessionPointers.getBaseline();
      if (!baseline)
        baseline =
          (await api.runs()).find(
            (run) => run.agentVersion === "buggy" && run.status === "COMPLETED",
          )?.id ?? null;
      if (!baseline) throw new Error("Run a baseline suite before starting a re-test.");
      const response = await api.retest(baseline, `retest-${baseline}-${crypto.randomUUID()}`);
      sessionPointers.setPatched(response.run.id);
      setResult(response);
      setPhase("running");
      let next = 0;
      timer.current = setInterval(() => {
        next += 1;
        setCurrent(next);
        if (next >= response.comparison.length) {
          if (timer.current) clearInterval(timer.current);
          setTimeout(() => setPhase("done"), 350);
        }
      }, 220);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The re-test could not be completed.");
      setPhase("idle");
    }
  };

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );
  useEffect(() => {
    if (phase !== "done" || !result?.run.summary) return;
    const controls = animate(68, result.run.summary.score, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (value) => setScore(Math.round(value)),
    });
    return () => controls.stop();
  }, [phase, result]);

  const categoryScores = useMemo(() => {
    if (!result) return [];
    const categories = [
      ["Task Success", "NORMAL"],
      ["Policy & Edge Cases", "EDGE"],
      ["Failure Recovery", "SYSTEM_FAILURE"],
      ["Security & Consistency", "ADVERSARIAL"],
    ] as const;
    return categories.map(([label, category]) => {
      const selected = result.scenarios.filter(
        (item) => item.definition.category === category && item.result,
      );
      const total = selected.reduce((sum, item) => sum + item.definition.weight, 0);
      const earned = selected.reduce(
        (sum, item) => sum + item.definition.weight * factor[item.result!.outcome],
        0,
      );
      return { label, value: total ? Math.round((100 * earned) / total) : 0 };
    });
  }, [result]);

  const comparison = result?.comparison ?? [];
  const summary = result?.run.summary;
  const resolved = comparison.filter((item) => item.status === "RESOLVED").length;
  const regressed = comparison.filter((item) => item.status === "REGRESSED").length;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-8 md:py-14">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
          Step 06 — Verification loop
        </div>
        <h1 className="mt-2 font-display text-4xl font-black uppercase tracking-tight text-foreground md:text-5xl">
          Full-Suite Re-Test
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          The backend executes the complete immutable suite, persists the patched run, and compares
          every stable scenario key against the baseline.
        </p>
      </motion.div>

      {(phase === "idle" || phase === "submitting") && (
        <div className="mt-10 border border-border bg-card p-8 text-center">
          <div className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase">
            Backend-controlled verification
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-2 font-mono text-[11px]">
            <span className="border border-border bg-background px-3 py-2">15 SCENARIOS</span>
            <span className="border border-border bg-background px-3 py-2">SAME SEED</span>
            <span className="border border-border bg-background px-3 py-2">FRESH SANDBOXES</span>
            <span className="border border-border bg-background px-3 py-2">PERSISTED REPORT</span>
          </div>
          <button
            onClick={start}
            disabled={phase === "submitting"}
            className="group mx-auto mt-8 inline-flex items-center gap-2 bg-foreground px-7 py-3.5 font-mono text-xs font-medium tracking-[0.18em] text-background uppercase transition-colors hover:bg-pass"
          >
            <RotateCcw className="size-4 transition-transform group-hover:-rotate-180" />
            {phase === "submitting" ? "Backend is evaluating…" : "Run Same 15-Scenario Suite"}
          </button>
          {error && (
            <p role="alert" className="mt-5 font-mono text-[11px] text-crit">
              {error}
            </p>
          )}
        </div>
      )}

      {phase === "running" && (
        <div className="mt-10 border border-border bg-card p-6 md:p-8">
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase">
            <span className="size-1.5 animate-blink bg-warn" /> Replaying persisted comparison
          </div>
          <TestProgress
            current={Math.min(current, comparison.length)}
            total={comparison.length}
            className="mt-5"
          />
          <div className="mt-5 max-h-[360px] space-y-2 overflow-y-auto font-mono text-[11px]">
            {comparison.slice(0, current).map((item) => (
              <motion.div
                key={item.scenarioKey}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                className="grid gap-2 border border-border bg-background px-3 py-2 sm:grid-cols-[1fr_auto_auto]"
              >
                <span className="text-foreground">
                  {String(item.sort).padStart(2, "0")} · {item.title}
                </span>
                <span className="text-muted-foreground">
                  {item.before} → {item.after}
                </span>
                <span
                  className={
                    item.status === "RESOLVED"
                      ? "text-pass"
                      : item.status === "REGRESSED"
                        ? "text-crit"
                        : "text-muted-foreground"
                  }
                >
                  {item.status}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {phase === "done" && summary && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-10">
          <div className="grid gap-px border border-border bg-border md:grid-cols-[1fr_auto]">
            <div className="flex flex-col items-center justify-center bg-card p-10 text-center">
              <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
                Reliability delta
              </div>
              <div className="mt-4 flex items-baseline gap-4 font-mono tabular-nums">
                <span className="text-3xl text-muted-foreground line-through decoration-crit/70">
                  68
                </span>
                <ArrowRight className="size-5 self-center text-muted-foreground" />
                <span className="text-7xl font-medium text-pass text-glow-pass">{score}</span>
              </div>
            </div>
            <div className="flex items-center justify-center bg-card p-10">
              <DeploymentVerdict
                verdict={summary.verdict === "READY" ? "READY" : "DO NOT DEPLOY"}
              />
            </div>
          </div>
          <div className="mt-6 grid gap-px border border-border bg-border sm:grid-cols-4">
            {[
              ["Resolved", resolved, "text-pass"],
              ["Regressed", regressed, regressed ? "text-crit" : "text-pass"],
              ["Pass", summary.counts.pass, "text-pass"],
              ["Warn / Fail", summary.counts.warning + summary.counts.fail, "text-warn"],
            ].map(([label, value, color]) => (
              <div key={String(label)} className="bg-card p-4 text-center">
                <div className={`font-mono text-2xl ${color}`}>{value}</div>
                <div className="mt-1 font-mono text-[9px] tracking-[0.18em] text-muted-foreground uppercase">
                  {label}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <h2 className="mb-4 font-mono text-[11px] tracking-[0.25em] text-muted-foreground uppercase">
              Category scores — patched agent
            </h2>
            <ScoreBreakdown scores={categoryScores} />
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border border-border bg-card px-6 py-5">
            <p className="flex items-start gap-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-pass" />
              Run {result?.run.id} and all evidence are persisted by the backend.
            </p>
            <Link
              to="/dashboard"
              className="group inline-flex items-center gap-2 bg-foreground px-6 py-3 font-mono text-[11px] font-medium tracking-[0.18em] text-background uppercase transition-colors hover:bg-pass"
            >
              Back to Dashboard <ArrowRight className="size-4" />
            </Link>
          </div>
        </motion.div>
      )}
    </main>
  );
}
