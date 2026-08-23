import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import type { Failure } from "@/lib/domain";
import { SeverityBadge } from "@/components/badges";
import { cn } from "@/lib/utils";

export function FailureCard({ failure, className }: { failure: Failure; className?: string }) {
  return (
    <Link
      to="/report/failures/$failureId"
      params={{ failureId: failure.id }}
      className={cn(
        "group block border border-border bg-card p-5 transition-colors hover:border-foreground/25",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
            {failure.scenario}
          </div>
          <h3 className="mt-2 text-lg font-bold tracking-tight text-foreground">{failure.title}</h3>
        </div>
        <SeverityBadge severity={failure.severity} pulse={failure.severity === "CRITICAL"} />
      </div>
      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
        {failure.rootCause}
      </p>
      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <div className="font-mono text-[11px] text-muted-foreground">
          BLAST RADIUS{" "}
          <span className="ml-1 font-medium text-crit tabular-nums">{failure.blastRadius}/100</span>
        </div>
        <span className="inline-flex items-center gap-1 font-mono text-[11px] tracking-[0.14em] text-muted-foreground transition-colors group-hover:text-foreground">
          INSPECT <ArrowUpRight className="size-3.5" />
        </span>
      </div>
    </Link>
  );
}
