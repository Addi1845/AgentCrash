import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowLeft, Wrench, RotateCcw } from "lucide-react";
import { SeverityBadge } from "@/components/badges";
import { StateDiffViewer } from "@/components/state-diff-viewer";
import { ExecutionTrace } from "@/components/execution-trace";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { toFailure } from "@/lib/presentation";

export const Route = createFileRoute("/report/failures/$failureId")({
  head: () => ({
    meta: [
      { title: "Failure Details — AgentCrash" },
      {
        name: "description",
        content:
          "Severity, blast radius, state diff, root cause, and the recommended fix for a detected failure.",
      },
      { property: "og:title", content: "Failure Details — AgentCrash" },
      {
        property: "og:description",
        content: "Expected vs actual sandbox state, root cause, and fix.",
      },
    ],
  }),
  component: FailureDetails,
});

function BlastRadiusBar({ value }: { value: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase">
          Blast radius
        </span>
        <span className="font-mono text-2xl font-medium text-crit tabular-nums">
          {value}
          <span className="text-sm text-muted-foreground"> /100</span>
        </span>
      </div>
      <div className="relative mt-2 h-2 bg-secondary">
        <motion.div
          className="absolute inset-y-0 left-0 bg-crit"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1.1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}

function FailureDetails() {
  const { failureId } = Route.useParams();
  const detail = useQuery({
    queryKey: ["finding", failureId],
    queryFn: () => api.finding(failureId),
  });
  const contract = useQuery({ queryKey: ["contract"], queryFn: api.contract });
  if (!detail.data || !contract.data)
    return (
      <main className="mx-auto max-w-5xl px-4 py-20 font-mono text-sm text-muted-foreground">
        Loading canonical finding evidence…
      </main>
    );
  const failure = toFailure(
    { ...detail.data.finding, id: failureId, scenarioKey: detail.data.scenarioKey },
    contract.data.scenarios,
    detail.data.trace,
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-8 md:py-14">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Link
          to="/report"
          className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to report
        </Link>
        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
              {failure.scenario} · tool: {failure.tool}
            </div>
            <h1 className="mt-2 font-display text-4xl font-black uppercase tracking-tight text-foreground md:text-5xl">
              {failure.title}
            </h1>
          </div>
          <SeverityBadge severity={failure.severity} pulse className="mt-2 px-3 py-1.5 text-xs" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.12 }}
        className="mt-10 grid gap-8 lg:grid-cols-[1fr_260px]"
      >
        <div className="space-y-8">
          <StateDiffViewer expected={failure.expected} actual={failure.actual} />

          <div className="border border-border bg-card p-6">
            <div className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase">
              Root cause
            </div>
            <p className="mt-3 text-sm leading-relaxed text-foreground">{failure.rootCause}</p>
          </div>

          <div className="border border-pass/40 bg-pass-dim p-6">
            <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.25em] text-pass uppercase">
              <Wrench className="size-3.5" /> Recommended fix
            </div>
            <p className="mt-3 text-sm leading-relaxed text-foreground">{failure.fix}</p>
          </div>

          <div>
            <div className="mb-3 font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase">
              Trace excerpt
            </div>
            <ExecutionTrace events={failure.trace} />
          </div>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="border border-border bg-card p-5">
            <BlastRadiusBar value={failure.blastRadius} />
            <div className="mt-5 space-y-3 border-t border-border pt-4 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">SEVERITY</span>
                <span className="text-foreground">{failure.severity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">IRREVERSIBLE</span>
                <span className="text-warn">YES</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">FINANCIAL</span>
                <span className="text-crit">YES</span>
              </div>
            </div>
          </div>
          <Link
            to="/retest"
            className="group flex items-center justify-center gap-2 border border-foreground/80 px-5 py-3 font-mono text-[11px] font-medium tracking-[0.16em] text-foreground uppercase transition-colors hover:bg-foreground hover:text-background"
          >
            <RotateCcw className="size-4 transition-transform group-hover:-rotate-180" />
            Re-test after fix
          </Link>
        </aside>
      </motion.div>
    </main>
  );
}
