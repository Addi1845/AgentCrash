import { cn } from "@/lib/utils";
import type { ChaosType, RiskLevel, Severity } from "@/lib/domain";
import { CHAOS_LABELS } from "@/lib/domain";

const severityStyles: Record<Severity, string> = {
  LOW: "border-border text-muted-foreground",
  MEDIUM: "border-warn/40 bg-warn-dim text-warn",
  HIGH: "border-warn/60 bg-warn-dim text-warn",
  CRITICAL: "border-crit/60 bg-crit-dim text-crit",
};

export function SeverityBadge({
  severity,
  className,
  pulse,
}: {
  severity: Severity;
  className?: string;
  pulse?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] font-medium tracking-[0.18em]",
        severityStyles[severity],
        className,
      )}
    >
      {severity === "CRITICAL" && (
        <span className={cn("size-1.5 bg-crit", pulse && "animate-blink")} />
      )}
      {severity}
    </span>
  );
}

const riskStyles: Record<RiskLevel, string> = {
  LOW: "border-border text-muted-foreground",
  MEDIUM: "border-border text-foreground",
  HIGH: "border-warn/50 bg-warn-dim text-warn",
  CRITICAL: "border-crit/60 bg-crit-dim text-crit",
};

export function ToolRiskBadge({ risk, className }: { risk: RiskLevel; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center border px-1.5 py-px font-mono text-[10px] tracking-[0.14em]",
        riskStyles[risk],
        className,
      )}
    >
      {risk}
    </span>
  );
}

export function ChaosBadge({ chaos, className }: { chaos: ChaosType; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border border-warn/40 bg-warn-dim px-1.5 py-px font-mono text-[10px] tracking-[0.12em] text-warn",
        className,
      )}
    >
      <span className="size-1 animate-blink bg-warn" />
      {CHAOS_LABELS[chaos]}
    </span>
  );
}

export function VerdictChip({
  verdict,
  className,
}: {
  verdict: "READY" | "DO NOT DEPLOY";
  className?: string;
}) {
  const ready = verdict === "READY";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] font-medium tracking-[0.18em]",
        ready ? "border-pass/50 bg-pass-dim text-pass" : "border-crit/60 bg-crit-dim text-crit",
        className,
      )}
    >
      <span className={cn("size-1.5", ready ? "bg-pass" : "bg-crit animate-blink")} />
      {verdict}
    </span>
  );
}
