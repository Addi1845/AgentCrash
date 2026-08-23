import { Link } from "@tanstack/react-router";
import { Bot } from "lucide-react";
import { VerdictChip } from "@/components/badges";
import { cn } from "@/lib/utils";

export function AgentCard({
  agent,
  className,
}: {
  agent: {
    name: string;
    tools: number;
    runs: number;
    lastScore: number;
    verdict: "READY" | "DO NOT DEPLOY";
    critical: number;
  };
  className?: string;
}) {
  const scoreColor =
    agent.lastScore >= 85 ? "text-pass" : agent.lastScore >= 70 ? "text-warn" : "text-crit";
  return (
    <Link
      to="/agents/overview"
      className={cn(
        "group block border border-border bg-card p-5 transition-colors hover:border-foreground/25",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center border border-border bg-secondary">
            <Bot className="size-4 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">{agent.name}</h3>
            <div className="mt-0.5 font-mono text-[10px] tracking-[0.16em] text-muted-foreground">
              {agent.tools} TOOLS · {agent.runs} RUNS
            </div>
          </div>
        </div>
        <VerdictChip verdict={agent.verdict} />
      </div>
      <div className="mt-5 flex items-end justify-between border-t border-border pt-4">
        <div>
          <div className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
            LAST SCORE
          </div>
          <div className={cn("mt-1 font-mono text-3xl font-medium tabular-nums", scoreColor)}>
            {agent.lastScore}
          </div>
        </div>
        {agent.critical > 0 && (
          <div className="font-mono text-[11px] text-crit">
            {agent.critical} CRITICAL FAILURE{agent.critical > 1 ? "S" : ""}
          </div>
        )}
      </div>
    </Link>
  );
}
