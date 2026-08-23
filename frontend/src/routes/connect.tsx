import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "motion/react";
import { FlaskConical, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api, sessionPointers } from "@/lib/api-client";
import type { AgentTool } from "@/lib/domain";

export const Route = createFileRoute("/connect")({
  head: () => ({
    meta: [
      { title: "Connect an Agent — AgentCrash" },
      {
        name: "description",
        content:
          "Register a tool-using AI agent with AgentCrash: name, system prompt, endpoint, and tool definitions.",
      },
      { property: "og:title", content: "Connect an Agent — AgentCrash" },
      {
        property: "og:description",
        content: "Register your agent and let the chaos engine map its blast surface.",
      },
    ],
  }),
  component: ConnectAgent,
});

const inputClass =
  "w-full border border-input bg-background px-3.5 py-2.5 font-mono text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:border-pass/60 focus:outline-none transition-colors";

const labelClass =
  "mb-2 flex items-center justify-between font-mono text-[10px] tracking-[0.22em] text-muted-foreground uppercase";

function ConnectAgent() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    description: "",
    systemPrompt: "",
    endpoint: "",
    tools: "",
  });
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const contract = useQuery({ queryKey: ["contract"], queryFn: api.contract });

  const loadDemo = () => {
    const demo = contract.data?.agent;
    if (!demo) {
      setError("The backend is not available yet. Start it and try again.");
      return;
    }
    setForm({
      name: demo.name,
      description: demo.description,
      systemPrompt: demo.systemPrompt,
      endpoint: demo.endpoint,
      tools: demo.tools.map((tool) => tool.name).join("\n"),
    });
    setLoaded(true);
    setError("");
  };

  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setError("");
      setForm((f) => ({ ...f, [k]: e.target.value }));
    };

  const analyze = async () => {
    const names = form.tools
      .split("\n")
      .map((line) => line.trim().split("(")[0] ?? "")
      .filter(Boolean);
    const toolCount = names.length;
    if (!form.name.trim() || !form.systemPrompt.trim() || toolCount === 0) {
      setError("Add an agent name, system prompt, and at least one tool definition.");
      return;
    }
    setSubmitting(true);
    try {
      const catalog = contract.data?.agent.tools ?? [];
      const tools: AgentTool[] = names.map(
        (name) =>
          catalog.find((tool) => tool.name === name) ?? {
            name,
            description: `Tool declared by ${form.name}`,
            risk: "MEDIUM",
            irreversible: true,
            sideEffects: "write",
          },
      );
      const agent = await api.createAgent({
        name: form.name,
        version: "1.0.0",
        adapterType: "BUILT_IN",
        endpoint: form.endpoint || "agentcrash://built-in/ecommerce-support",
        description: form.description,
        systemPrompt: form.systemPrompt,
        tools,
      });
      sessionPointers.setAgent(agent.id);
      await navigate({ to: "/agents/overview" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The agent could not be registered.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 md:px-8 md:py-14">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
          Step 01 — Agent intake
        </div>
        <h1 className="mt-2 font-display text-4xl font-black uppercase tracking-tight text-foreground md:text-5xl">
          Connect Agent
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
          Register the agent under test. AgentCrash analyzes its purpose, tools, and blast surface,
          then generates a chaos suite automatically.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.12 }}
        className="mt-10 border border-border bg-card p-6 md:p-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
          <span className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase">
            Agent manifest
          </span>
          <button
            onClick={loadDemo}
            disabled={contract.isLoading}
            className="inline-flex items-center gap-2 border border-pass/50 bg-pass-dim px-4 py-2 font-mono text-[11px] font-medium tracking-[0.16em] text-pass uppercase transition-colors hover:bg-pass hover:text-background"
          >
            <FlaskConical className="size-3.5" />
            Load Demo Agent
          </button>
        </div>

        <div className="mt-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className={labelClass}>Agent Name</label>
              <input
                className={inputClass}
                placeholder="e.g. E-commerce Support Agent"
                value={form.name}
                onChange={set("name")}
              />
            </div>
            <div>
              <label className={labelClass}>Agent Endpoint</label>
              <input
                className={inputClass}
                placeholder="https://…"
                value={form.endpoint}
                onChange={set("endpoint")}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <input
              className={inputClass}
              placeholder="What is this agent responsible for?"
              value={form.description}
              onChange={set("description")}
            />
          </div>
          <div>
            <label className={labelClass}>System Prompt</label>
            <textarea
              rows={4}
              className={inputClass}
              placeholder="You are a…"
              value={form.systemPrompt}
              onChange={set("systemPrompt")}
            />
          </div>
          <div>
            <label className={labelClass}>
              <span>Tool Definitions</span>
              <span className="text-muted-foreground/60 normal-case tracking-normal">
                one per line · name(args)
              </span>
            </label>
            <textarea
              rows={6}
              className={inputClass}
              placeholder={"refund_payment(order_id, amount)\nget_order(order_id)"}
              value={form.tools}
              onChange={set("tools")}
            />
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
          <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
            {loaded ? (
              <span className="flex items-center gap-2 text-pass">
                <span className="size-1.5 bg-pass" /> Demo agent loaded · 5 tools detected ·
                vulnerable v1.0
              </span>
            ) : (
              "No agent loaded"
            )}
          </span>
          <button
            onClick={analyze}
            disabled={submitting}
            className="group inline-flex items-center gap-2 bg-foreground px-6 py-3 font-mono text-[11px] font-medium tracking-[0.18em] text-background uppercase transition-colors hover:bg-pass"
          >
            {submitting ? "Registering…" : "Analyze Agent"}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
        {error && (
          <p
            role="alert"
            className="mt-4 border border-crit/50 bg-crit-dim px-3 py-2 font-mono text-[11px] text-crit"
          >
            {error}
          </p>
        )}
      </motion.div>
    </main>
  );
}
