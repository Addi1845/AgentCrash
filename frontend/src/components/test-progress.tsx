import { cn } from "@/lib/utils";

export function TestProgress({
  current,
  total,
  className,
}: {
  current: number;
  total: number;
  className?: string;
}) {
  const pct = Math.min(100, Math.round((current / total) * 100));
  return (
    <div className={cn("border border-border bg-card", className)}>
      <div className="flex items-center justify-between px-4 py-2.5">
        <span className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground">
          SCENARIO{" "}
          <span className="text-foreground tabular-nums">
            {String(current).padStart(2, "0")} / {total}
          </span>
        </span>
        <span className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground tabular-nums">
          {pct}%
        </span>
      </div>
      <div className="relative h-1 bg-secondary">
        <div
          className="absolute inset-y-0 left-0 bg-pass transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
