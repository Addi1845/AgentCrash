import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  BrainCircuit,
  FlaskConical,
  Radar,
  Gauge,
  ArrowRight,
  Terminal,
  ChevronRight,
} from "lucide-react";
import { ExecutionTrace } from "@/components/execution-trace";
import { ReliabilityGauge } from "@/components/reliability-gauge";
import { DeploymentVerdict } from "@/components/deployment-verdict";
import { SAMPLE_TRACE } from "@/lib/presentation";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AgentCrash — Break your AI agent before your users do" },
      {
        name: "description",
        content:
          "AgentCrash runs your AI agent through adversarial, stateful failure scenarios and tells you whether it is safe to deploy. Chaos engineering for autonomous agents.",
      },
      { property: "og:title", content: "AgentCrash — Break your AI agent before your users do" },
      {
        property: "og:description",
        content:
          "Adversarial, stateful failure testing for tool-using AI agents. Detect dangerous behavior before production.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] as const },
  };
}

const STEPS = [
  {
    n: "01",
    title: "Connect",
    body: "Point AgentCrash at your agent's endpoint and tool definitions. We map its purpose, tools, and blast surface.",
  },
  {
    n: "02",
    title: "Generate",
    body: "Normal, edge-case, adversarial and failure scenarios are generated automatically from the agent's tool graph.",
  },
  {
    n: "03",
    title: "Chaos Run",
    body: "Scenarios execute in an isolated sandbox while we inject timeouts, malformed responses, stale data and prompt injection.",
  },
  {
    n: "04",
    title: "Verdict",
    body: "Perceived outcomes are diffed against actual sandbox state. You get a reliability score and a deploy / no-deploy verdict.",
  },
];

const MODULES = [
  {
    icon: BrainCircuit,
    name: "Agent Intelligence",
    body: "Analyzes your agent's system prompt and tools, classifies risk, and auto-generates the test suite.",
    meta: "RISK CLASSIFICATION",
  },
  {
    icon: FlaskConical,
    name: "Chaos Sandbox",
    body: "A stateful mock environment with real tool semantics — and a chaos engine that makes them fail on purpose.",
    meta: "7 FAILURE MODES",
  },
  {
    icon: Radar,
    name: "Failure Intelligence",
    body: "Deterministic rule checks, state validation and severity scoring catch loops, leaks and duplicate irreversible actions.",
    meta: "DETERMINISTIC RULES",
  },
  {
    icon: Gauge,
    name: "Reliability Report",
    body: "A single score, a blast-radius-ranked failure list, root causes, suggested fixes, and a re-test loop.",
    meta: "DEPLOYMENT VERDICT",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="absolute inset-x-0 top-0 z-40">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center border border-border bg-secondary">
              <Terminal className="size-3.5 text-pass" />
            </span>
            <span className="font-display text-sm font-black tracking-[0.22em] text-foreground">
              AGENT<span className="text-pass">CRASH</span>
            </span>
          </div>
          <div className="flex items-center gap-5">
            <Link
              to="/dashboard"
              className="hidden font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase transition-colors hover:text-foreground sm:block"
            >
              Dashboard
            </Link>
            <Link
              to="/connect"
              className="border border-foreground/80 px-4 py-2 font-mono text-[11px] font-medium tracking-[0.16em] text-foreground uppercase transition-colors hover:bg-foreground hover:text-background"
            >
              Test an Agent
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-blueprint bg-blueprint-fade" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-border" />
        <div className="relative mx-auto max-w-7xl px-4 pt-36 pb-16 md:px-8 md:pt-44 md:pb-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase"
          >
            <span className="flex items-center gap-2">
              <span className="size-1.5 animate-blink bg-pass" />
              Chaos engineering for autonomous agents
            </span>
            <span className="hidden sm:inline">PS-4 / Reliability Engine</span>
          </motion.div>

          <h1 className="mt-8 font-display font-black uppercase leading-[0.92] tracking-tight">
            <motion.span
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="block text-[clamp(2.6rem,8.5vw,7.5rem)] text-foreground [font-stretch:115%]"
            >
              Break your AI agent
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.22 }}
              className="block text-[clamp(2.6rem,8.5vw,7.5rem)] text-outline [font-stretch:115%]"
            >
              before your
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.34 }}
              className="block text-[clamp(2.6rem,8.5vw,7.5rem)] text-foreground [font-stretch:115%]"
            >
              users do<span className="text-crit">.</span>
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="mt-8 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg"
          >
            AgentCrash runs your agent through adversarial, stateful failure scenarios and tells you
            whether it is safe to deploy.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.62 }}
            className="mt-10 flex flex-wrap items-center gap-3"
          >
            <Link
              to="/connect"
              className="group inline-flex items-center gap-2 bg-foreground px-6 py-3.5 font-mono text-xs font-medium tracking-[0.18em] text-background uppercase transition-colors hover:bg-pass"
            >
              Test an Agent
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/agents/overview"
              className="inline-flex items-center gap-2 border border-border px-6 py-3.5 font-mono text-xs tracking-[0.18em] text-foreground uppercase transition-colors hover:border-foreground/40"
            >
              Run Demo Agent
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mt-16 grid grid-cols-2 gap-px border border-border bg-border md:grid-cols-4"
          >
            {[
              { v: "15", l: "SCENARIOS PER SUITE" },
              { v: "7", l: "CHAOS FAILURE MODES" },
              { v: "5", l: "TOOLS UNDER TEST" },
              { v: "1", l: "DEPLOYMENT VERDICT" },
            ].map((s) => (
              <div key={s.l} className="bg-background px-5 py-4">
                <div className="font-mono text-2xl font-medium text-foreground tabular-nums">
                  {s.v}
                </div>
                <div className="mt-1 font-mono text-[9px] tracking-[0.22em] text-muted-foreground">
                  {s.l}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Live trace teaser */}
      <section className="border-t border-border">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 md:grid-cols-[1fr_1.15fr] md:px-8 md:py-28">
          <motion.div {...fadeUp()} className="flex flex-col justify-center">
            <div className="font-mono text-[10px] tracking-[0.3em] text-crit uppercase">
              Observed in the sandbox
            </div>
            <h2 className="mt-4 font-display text-3xl font-black uppercase leading-tight tracking-tight text-foreground md:text-5xl">
              The refund went through.
              <br />
              <span className="text-crit">Twice.</span>
            </h2>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
              The gateway processed the refund but the response timed out. The agent retried an
              irreversible action without checking state — and the ledger ended up ₹2,000 heavier
              than reality. AgentCrash diffs what the agent <em>thinks</em> happened against what{" "}
              <em>actually</em> happened.
            </p>
            <div className="mt-8">
              <DeploymentVerdict verdict="DO NOT DEPLOY" small />
            </div>
          </motion.div>
          <motion.div {...fadeUp(0.15)}>
            <ExecutionTrace events={SAMPLE_TRACE} />
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28">
          <motion.div {...fadeUp}>
            <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
              Protocol
            </div>
            <h2 className="mt-4 font-display text-3xl font-black uppercase tracking-tight text-foreground md:text-5xl">
              Connect. Generate.
              <br />
              Crash. <span className="text-outline">Verdict.</span>
            </h2>
          </motion.div>
          <div className="mt-14 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                {...fadeUp(i * 0.1)}
                className="group bg-background p-6 transition-colors hover:bg-card"
              >
                <div className="font-mono text-[11px] tracking-[0.25em] text-pass">{s.n}</div>
                <h3 className="mt-4 font-display text-xl font-extrabold uppercase tracking-tight text-foreground">
                  {s.title}
                </h3>
                <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{s.body}</p>
                <ChevronRight className="mt-5 size-4 text-muted-foreground/50 transition-transform group-hover:translate-x-1 group-hover:text-pass" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules */}
      <section className="border-t border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28">
          <motion.div {...fadeUp()} className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
                System architecture
              </div>
              <h2 className="mt-4 font-display text-3xl font-black uppercase tracking-tight text-foreground md:text-5xl">
                Four modules.
                <br />
                One reliability engine.
              </h2>
            </div>
            <div className="font-mono text-[11px] text-muted-foreground">
              OBSERVABILITY ASKS <span className="text-muted-foreground/60">"what did it do?"</span>
              <br />
              AGENTCRASH ASKS{" "}
              <span className="text-pass">"is it still safe when things fail?"</span>
            </div>
          </motion.div>
          <div className="mt-14 grid gap-px border border-border bg-border md:grid-cols-2">
            {MODULES.map((m, i) => (
              <motion.div key={m.name} {...fadeUp(i * 0.08)} className="bg-background p-8">
                <div className="flex items-center justify-between">
                  <m.icon className="size-5 text-pass" />
                  <span className="font-mono text-[9px] tracking-[0.25em] text-muted-foreground">
                    {m.meta}
                  </span>
                </div>
                <h3 className="mt-6 font-display text-xl font-extrabold uppercase tracking-tight text-foreground">
                  {m.name}
                </h3>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                  {m.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Gauge strip */}
      <section className="border-t border-border">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 md:grid-cols-[auto_1fr] md:px-8 md:py-28">
          <motion.div {...fadeUp()} className="justify-self-center">
            <ReliabilityGauge score={68} size={280} />
          </motion.div>
          <motion.div {...fadeUp(0.15)}>
            <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
              The score that decides
            </div>
            <h2 className="mt-4 font-display text-3xl font-black uppercase leading-tight tracking-tight text-foreground md:text-5xl">
              A number your release
              <br />
              pipeline can enforce.
            </h2>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Five category scores roll up into one reliability number. Below threshold, the
              deployment verdict blocks the release — with the blast radius, root cause and
              suggested fix attached. Fix the agent, re-run the failures, watch the score climb.
            </p>
            <div className="mt-8 flex flex-wrap gap-6 font-mono text-[11px] text-muted-foreground">
              <span>
                <span className="text-pass">●</span> 85+ READY
              </span>
              <span>
                <span className="text-warn">●</span> 70–84 RISKY
              </span>
              <span>
                <span className="text-crit">●</span> &lt;70 DO NOT DEPLOY
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden border-t border-border">
        <div className="absolute inset-0 bg-blueprint bg-blueprint-fade opacity-60" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 text-center md:px-8 md:py-36">
          <motion.h2
            {...fadeUp()}
            className="font-display text-4xl font-black uppercase tracking-tight text-foreground md:text-7xl [font-stretch:115%]"
          >
            Ready to break
            <br />
            <span className="text-outline">some things?</span>
          </motion.h2>
          <motion.div {...fadeUp(0.15)} className="mt-10">
            <Link
              to="/connect"
              className="group inline-flex items-center gap-2 bg-foreground px-8 py-4 font-mono text-xs font-medium tracking-[0.2em] text-background uppercase transition-colors hover:bg-pass"
            >
              Test an Agent
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 md:px-8">
          <div className="flex items-center gap-2.5">
            <span className="flex size-6 items-center justify-center border border-border bg-secondary">
              <Terminal className="size-3 text-pass" />
            </span>
            <span className="font-display text-xs font-black tracking-[0.22em] text-foreground">
              AGENT<span className="text-pass">CRASH</span>
            </span>
          </div>
          <div className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
            PS-4 · AI Agent Evaluation & Reliability Engine · 2026
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
            <span className="size-1.5 animate-blink bg-pass" />
            ALL SYSTEMS NOMINAL
          </div>
        </div>
      </footer>
    </div>
  );
}
