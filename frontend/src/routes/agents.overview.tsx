import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight, Bot, Undo2 } from "lucide-react";
import { ToolRiskBadge } from "@/components/badges";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { api, sessionPointers } from "@/lib/api-client";

export const Route = createFileRoute("/agents/overview")({
  head: () => ({
    meta: [
      { title: "Agent Overview — AgentCrash" },
      {
        name: "description",
        content: "Tool risk classification and blast-surface analysis for the agent under test.",
      },
      { property: "og:title", content: "Agent Overview — AgentCrash" },
      {
        property: "og:description",
        content: "Every tool your agent can call, classified by risk.",
      },
    ],
  }),
  component: AgentOverview,
});

function AgentOverview() {
  const selectedId = sessionPointers.getAgent();
  const contract = useQuery({ queryKey: ["contract"], queryFn: api.contract });
  const selected = useQuery({
    queryKey: ["agent", selectedId],
    queryFn: () => api.agent(selectedId!),
    enabled: Boolean(selectedId),
  });
  const agent = selected.data ?? contract.data?.agent;
  const tools = agent?.tools ?? [];
  const high = tools.filter((t) => t.risk === "HIGH").length;
  const critical = tools.filter((t) => t.risk === "CRITICAL").length;

  if (!agent)
    return (
      <main className="mx-auto max-w-6xl px-4 py-20 font-mono text-sm text-muted-foreground">
        Connecting to the evaluation backend…
      </main>
    );

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 md:px-8 md:py-14">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
          Step 02 — Agent intelligence
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <span className="flex size-11 items-center justify-center border border-border bg-secondary">
            <Bot className="size-5 text-pass" />
          </span>
          <div>
            <h1 className="font-display text-3xl font-black uppercase tracking-tight text-foreground md:text-4xl">
              {agent.name}
            </h1>
            <div className="mt-1 font-mono text-[11px] text-muted-foreground">{agent.endpoint}</div>
          </div>
        </div>
      </motion.div>

      {/* Risk summary */}
      <div className="mt-8 grid grid-cols-3 gap-px border border-border bg-border">
        {[
          { v: String(tools.length), l: "TOOLS DETECTED", c: "text-foreground" },
          { v: String(high), l: "HIGH RISK", c: "text-warn" },
          { v: String(critical), l: "CRITICAL", c: "text-crit" },
        ].map((s, i) => (
          <motion.div
            key={s.l}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 + i * 0.08 }}
            className="bg-card px-5 py-5 text-center"
          >
            <div className={cn("font-mono text-4xl font-medium tabular-nums", s.c)}>{s.v}</div>
            <div className="mt-1 font-mono text-[9px] tracking-[0.22em] text-muted-foreground">
              {s.l}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tool table */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        className="mt-10"
      >
        <h2 className="mb-4 font-mono text-[11px] tracking-[0.25em] text-muted-foreground uppercase">
          Tool risk classification
        </h2>
        <div className="overflow-x-auto border border-border">
          <table className="w-full min-w-[680px] text-left">
            <thead>
              <tr className="border-b border-border bg-card">
                {["Tool", "Description", "Side Effects", "Irreversible", "Risk"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 font-mono text-[9px] font-medium tracking-[0.22em] text-muted-foreground uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tools.map((t) => (
                <tr key={t.name} className="transition-colors hover:bg-card/70">
                  <td className="px-4 py-3.5 font-mono text-[13px] font-medium text-foreground">
                    {t.name}
                  </td>
                  <td className="px-4 py-3.5 text-[13px] text-muted-foreground">{t.description}</td>
                  <td className="px-4 py-3.5 font-mono text-[11px] text-muted-foreground uppercase">
                    {t.sideEffects}
                  </td>
                  <td className="px-4 py-3.5">
                    {t.irreversible ? (
                      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-warn">
                        <Undo2 className="size-3.5" /> YES
                      </span>
                    ) : (
                      <span className="font-mono text-[11px] text-muted-foreground/60">NO</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <ToolRiskBadge risk={t.risk} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="mt-10 flex flex-wrap items-center justify-between gap-4 border border-border bg-card px-6 py-5"
      >
        <p className="max-w-xl font-mono text-[11px] leading-relaxed tracking-[0.06em] text-muted-foreground">
          Analysis complete. The generator will build scenarios targeting{" "}
          <span className="text-warn">{high} high-risk</span> and{" "}
          <span className="text-crit">1 critical</span> tool — with failure injection on every
          irreversible path.
        </p>
        <Link
          to="/suite"
          className="group inline-flex items-center gap-2 bg-foreground px-6 py-3 font-mono text-[11px] font-medium tracking-[0.18em] text-background uppercase transition-colors hover:bg-pass"
        >
          Generate Test Suite
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </motion.div>
    </main>
  );
}
