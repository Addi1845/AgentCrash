import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Plus } from "lucide-react";
import { AgentCard } from "@/components/agent-card";
import { VerdictChip } from "@/components/badges";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — AgentCrash" },
      {
        name: "description",
        content:
          "Agents tested, reliability trends, and critical failures across your AgentCrash sandbox runs.",
      },
      { property: "og:title", content: "Dashboard — AgentCrash" },
      { property: "og:description", content: "Reliability telemetry for every agent under test." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const agentsQuery = useQuery({ queryKey: ["agents"], queryFn: api.agents });
  const runsQuery = useQuery({ queryKey: ["runs"], queryFn: api.runs });
  const agents = agentsQuery.data ?? [];
  const runs = runsQuery.data ?? [];
  const dashboardAgents = agents.map((agent) => {
    const agentRuns = runs.filter((run) => run.agentId === agent.id && run.summary);
    const latest = agentRuns[0];
    return {
      name: agent.name,
      tools: agent.tools.length,
      runs: agentRuns.length,
      lastScore: latest?.summary?.score ?? 0,
      verdict:
        latest?.summary?.verdict === "READY" ? ("READY" as const) : ("DO NOT DEPLOY" as const),
      critical: latest?.summary?.severity_counts.critical ?? 0,
    };
  });
  const completed = runs.filter((run) => run.summary);
  const stats = [
    { label: "Agents Registered", value: String(agents.length) },
    { label: "Persisted Runs", value: String(completed.length) },
    {
      label: "Average Reliability",
      value: completed.length
        ? String(
            Math.round(
              completed.reduce((sum, run) => sum + (run.summary?.score ?? 0), 0) / completed.length,
            ),
          )
        : "—",
    },
    {
      label: "Critical Failures",
      value: String(
        completed.reduce((sum, run) => sum + (run.summary?.severity_counts.critical ?? 0), 0),
      ),
    },
  ];
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-14">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
            Mission control
          </div>
          <h1 className="mt-2 font-display text-4xl font-black uppercase tracking-tight text-foreground md:text-5xl">
            Dashboard
          </h1>
        </div>
        <Link
          to="/connect"
          className="inline-flex items-center gap-2 bg-foreground px-5 py-2.5 font-mono text-[11px] font-medium tracking-[0.18em] text-background uppercase transition-colors hover:bg-pass"
        >
          <Plus className="size-4" /> New Agent
        </Link>
      </motion.div>

      {/* Stat strip */}
      <div className="mt-10 grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="bg-card px-5 py-5"
          >
            <div
              className={cn(
                "font-mono text-4xl font-medium tabular-nums",
                s.label === "Critical Failures" ? "text-crit" : "text-foreground",
              )}
            >
              {s.value}
            </div>
            <div className="mt-1.5 font-mono text-[9px] tracking-[0.22em] text-muted-foreground uppercase">
              {s.label}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Agents */}
      <div className="mt-14">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-mono text-[11px] tracking-[0.25em] text-muted-foreground uppercase">
            Agents under test
          </h2>
          <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
            {dashboardAgents.length} REGISTERED
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {dashboardAgents.map((a) => (
            <AgentCard key={a.name} agent={a} />
          ))}
        </div>
      </div>

      {/* Recent runs */}
      <div className="mt-14">
        <h2 className="mb-5 font-mono text-[11px] tracking-[0.25em] text-muted-foreground uppercase">
          Recent runs
        </h2>
        <div className="overflow-x-auto border border-border">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-border bg-card">
                {["Run", "Agent", "Scenarios", "Score", "Critical", "Verdict", "When"].map((h) => (
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
              {completed.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-card/70">
                  <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">{r.id}</td>
                  <td className="px-4 py-3.5 text-sm font-medium text-foreground">
                    {agents.find((agent) => agent.id === r.agentId)?.name ?? r.agentId}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground tabular-nums">
                    15
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3.5 font-mono text-sm font-medium tabular-nums",
                      (r.summary?.score ?? 0) >= 85
                        ? "text-pass"
                        : (r.summary?.score ?? 0) >= 70
                          ? "text-warn"
                          : "text-crit",
                    )}
                  >
                    {r.summary?.score}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3.5 font-mono text-xs tabular-nums",
                      (r.summary?.severity_counts.critical ?? 0) > 0
                        ? "text-crit"
                        : "text-muted-foreground",
                    )}
                  >
                    {r.summary?.severity_counts.critical ?? 0}
                  </td>
                  <td className="px-4 py-3.5">
                    <VerdictChip
                      verdict={r.summary?.verdict === "READY" ? "READY" : "DO NOT DEPLOY"}
                    />
                  </td>
                  <td className="px-4 py-3.5 font-mono text-[11px] text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
