import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function StateDiffViewer({
  expected,
  actual,
  className,
}: {
  expected: string;
  actual: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-px border border-border bg-border sm:grid-cols-[1fr_auto_1fr]",
        className,
      )}
    >
      <div className="bg-card p-5">
        <div className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground">
          EXPECTED STATE
        </div>
        <div className="mt-3 font-mono text-lg text-pass">{expected}</div>
      </div>
      <div className="hidden items-center justify-center bg-card px-3 sm:flex">
        <ArrowRight className="size-4 text-muted-foreground" />
      </div>
      <div className="bg-crit-dim p-5">
        <div className="font-mono text-[10px] tracking-[0.25em] text-crit">
          ACTUAL SANDBOX STATE
        </div>
        <div className="mt-3 font-mono text-lg text-crit">{actual}</div>
      </div>
    </div>
  );
}
