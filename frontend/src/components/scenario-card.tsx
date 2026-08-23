import type { Scenario } from "@/lib/domain";
import { ChaosBadge } from "@/components/badges";
import { cn } from "@/lib/utils";

export function ScenarioCard({ scenario, className }: { scenario: Scenario; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col border border-border bg-card p-4 transition-colors hover:border-foreground/25",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
          {scenario.id}
        </span>
        {scenario.chaos && <ChaosBadge chaos={scenario.chaos} />}
      </div>
      <div className="mt-2 flex gap-2 font-mono text-[9px] tracking-[0.16em] uppercase">
        <span className="border border-border px-1.5 py-0.5 text-muted-foreground">
          {scenario.risk} risk
        </span>
        <span className="border border-border px-1.5 py-0.5 text-muted-foreground">
          weight {scenario.weight}
        </span>
      </div>
      <h4 className="mt-2.5 text-sm font-semibold tracking-tight text-foreground">
        {scenario.name}
      </h4>
      <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-muted-foreground">
        {scenario.description}
      </p>
      <div className="mt-3 border-t border-border pt-2.5 font-mono text-[11px] text-muted-foreground/80">
        <span className="text-pass">EXPECT</span> · {scenario.expectedBehavior}
      </div>
    </div>
  );
}
