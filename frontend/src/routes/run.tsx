import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { ExecutionTrace } from "@/components/execution-trace";
import { TestProgress } from "@/components/test-progress";
import { api, sessionPointers } from "@/lib/api-client";
import type { RunReport, TraceEvent } from "@/lib/domain";
import { toTrace } from "@/lib/presentation";

export const Route = createFileRoute("/run")({
  head: () => ({
    meta: [
      { title: "Live Chaos Run — AgentCrash" },
      {
        name: "description",
        content: "Watch the backend execute 15 deterministic chaos scenarios against the agent.",
      },
    ],
  }),
  component: LiveRun,
});

interface RunStep {
  scenarioIndex?: number | undefined;
  event: TraceEvent;
}

function LiveRun() {
  const navigate = useNavigate();
  const [report, setReport] = useState<RunReport | null>(null);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      try {
        const contract = await api.contract();
        const agentId = sessionPointers.getAgent() ?? contract.agent.id;
        const result = await api.createRun(agentId, "buggy", `baseline-${crypto.randomUUID()}`);
        sessionPointers.setBaseline(result.run.id);
        setReport(result);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "The backend run could not be started.");
      }
    })();
  }, []);

  const script = useMemo<RunStep[]>(
    () =>
      report?.scenarios.flatMap((scenario, index) =>
        (scenario.result?.events ?? []).map((event, eventIndex) => ({
          scenarioIndex: eventIndex === 0 ? index + 1 : undefined,
          event: toTrace(event),
        })),
      ) ?? [],
    [report],
  );

  const done = Boolean(report) && script.length > 0 && step >= script.length;
  const shown = useMemo(() => script.slice(0, step), [script, step]);
  const events = shown.map((item) => item.event);
  const currentScenario = shown.reduce((current, item) => item.scenarioIndex ?? current, 1);
  const criticalHit = events.some((event) => event.kind === "verdict");

  useEffect(() => {
    if (!script.length) return;
    const timer = setInterval(
      () =>
        setStep((current) => {
          if (current >= script.length) {
            clearInterval(timer);
            return current;
          }
          return current + 1;
        }),
      90,
    );
    return () => clearInterval(timer);
  }, [script]);

  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => navigate({ to: "/report" }), 2200);
    return () => clearTimeout(timer);
  }, [done, navigate]);

  if (error)
    return (
      <main className="mx-auto max-w-4xl px-4 py-20">
        <div
          role="alert"
          className="border border-crit/50 bg-crit-dim p-6 font-mono text-sm text-crit"
        >
          {error}
        </div>
      </main>
    );

  const summary = report?.run.summary;
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-8 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
            <span className={done ? "size-1.5 bg-pass" : "size-1.5 animate-blink bg-crit"} />
            {done
              ? "Run complete"
              : report
                ? "Replaying backend event stream"
                : "Backend evaluation in progress"}
          </div>
          <h1 className="mt-2 font-display text-4xl font-black uppercase tracking-tight text-foreground md:text-5xl">
            Live Run
          </h1>
        </div>
        <div className="font-mono text-[11px] text-muted-foreground">
          {report
            ? `${report.run.id} · SUITE ${report.contract.suite} · SEED ${report.contract.seed}`
            : "CREATING PERSISTED RUN…"}
        </div>
      </div>

      <TestProgress current={report ? currentScenario : 0} total={15} className="mt-8" />

      <AnimatePresence>
        {criticalHit && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 flex items-center gap-4 border-2 border-crit bg-crit-dim px-5 py-4"
          >
            <ShieldAlert className="size-6 shrink-0 animate-blink text-crit" />
            <div>
              <div className="font-display text-lg font-black uppercase tracking-[0.12em] text-crit">
                Critical failure detected
              </div>
              <div className="mt-0.5 font-mono text-[11px] tracking-[0.14em] text-crit/80 uppercase">
                Canonical sandbox state does not match the agent claim
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ExecutionTrace events={events} autoScroll maxHeight={480} className="mt-6" />

      <div className="mt-6 flex items-center justify-between gap-4">
        <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
          {done && summary
            ? `15 scenarios · ${summary.counts.pass} pass · ${summary.counts.warning} warning · ${summary.counts.fail} fail · ${summary.severity_counts.critical} critical`
            : "Backend owns execution, state, evidence, and persistence"}
        </span>
        {done && (
          <Link
            to="/report"
            className="group inline-flex items-center gap-2 bg-foreground px-5 py-2.5 font-mono text-[11px] font-medium tracking-[0.18em] text-background uppercase transition-colors hover:bg-pass"
          >
            View Reliability Report{" "}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
    </main>
  );
}
