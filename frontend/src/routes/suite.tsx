import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Zap } from "lucide-react";
import { ScenarioCard } from "@/components/scenario-card";
import type { ScenarioCategory } from "@/lib/domain";
import { api } from "@/lib/api-client";
import { toScenario } from "@/lib/presentation";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/suite")({
  head: () => ({
    meta: [
      { title: "Test Suite — AgentCrash" },
      {
        name: "description",
        content:
          "15 auto-generated scenarios: normal flows, edge cases, system failures, and adversarial attacks.",
      },
      { property: "og:title", content: "Test Suite — AgentCrash" },
      {
        property: "og:description",
        content: "Normal, edge-case, system-failure, and adversarial scenarios ready to run.",
      },
    ],
  }),
  component: TestSuite,
});

const CATEGORY_ORDER: ScenarioCategory[] = [
  "Normal",
  "Edge Cases",
  "System Failures",
  "Adversarial",
];

const CATEGORY_META: Record<ScenarioCategory, { hint: string; accent: string }> = {
  Normal: { hint: "Baseline behavior, no faults injected", accent: "text-pass" },
  "Edge Cases": {
    hint: "Policy boundaries and unusual-but-valid requests",
    accent: "text-foreground",
  },
  "System Failures": { hint: "Chaos engine injects tool and API failures", accent: "text-warn" },
  Adversarial: { hint: "Hostile inputs and injection attempts", accent: "text-crit" },
};

function TestSuite() {
  const contract = useQuery({ queryKey: ["contract"], queryFn: api.contract });
  const scenarios = contract.data?.scenarios.map(toScenario) ?? [];
  const runContract = contract.data?.runContract;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-14">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-wrap items-end justify-between gap-6"
      >
        <div>
          <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
            Step 03 — Generated suite
          </div>
          <h1 className="mt-2 font-display text-4xl font-black uppercase tracking-tight text-foreground md:text-5xl">
            Test Suite
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            <span className="font-mono text-foreground tabular-nums">{scenarios.length || 15}</span>{" "}
            scenarios generated from the agent's tool graph — grouped by intent, armed with targeted
            failure injection.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 font-mono text-[9px] tracking-[0.16em] text-muted-foreground uppercase">
            <span className="border border-border bg-card px-2 py-1">
              Immutable suite {runContract?.suite ?? "v1"}
            </span>
            <span className="border border-border bg-card px-2 py-1">
              Seed {runContract?.seed ?? 424242}
            </span>
            <span className="border border-border bg-card px-2 py-1">
              Engine {runContract?.engine ?? "1.0.0"}
            </span>
            <span className="border border-border bg-card px-2 py-1">Total weight 66</span>
          </div>
        </div>
        <Link
          to="/run"
          className="group inline-flex items-center gap-2 bg-crit px-6 py-3.5 font-mono text-xs font-bold tracking-[0.18em] text-white uppercase transition-colors hover:bg-foreground hover:text-background"
        >
          <Zap className="size-4" />
          Run Chaos Tests
        </Link>
      </motion.div>

      <div className="mt-12 space-y-12">
        {CATEGORY_ORDER.map((cat, ci) => {
          const items = scenarios.filter((s) => s.category === cat);
          return (
            <motion.section
              key={cat}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.55, delay: ci * 0.05 }}
            >
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
                <h2 className="font-display text-lg font-extrabold uppercase tracking-tight text-foreground">
                  <span className={CATEGORY_META[cat].accent}>
                    {String(ci + 1).padStart(2, "0")} /
                  </span>{" "}
                  {cat}
                </h2>
                <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                  {CATEGORY_META[cat].hint} · {items.length} scenarios
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {items.map((s) => (
                  <ScenarioCard key={s.id} scenario={s} />
                ))}
              </div>
            </motion.section>
          );
        })}
      </div>
    </main>
  );
}
