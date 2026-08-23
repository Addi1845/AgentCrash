import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { cn } from "@/lib/utils";

function barColor(v: number) {
  if (v >= 85) return "bg-pass";
  if (v >= 70) return "bg-warn";
  return "bg-crit";
}

export function ScoreBreakdown({
  scores,
  className,
}: {
  scores: { label: string; value: number }[];
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <div ref={ref} className={cn("divide-y divide-border border border-border", className)}>
      {scores.map((s, i) => (
        <div key={s.label} className="flex items-center gap-4 px-4 py-3.5">
          <span className="w-40 shrink-0 font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
            {s.label}
          </span>
          <div className="relative h-1.5 min-w-0 flex-1 bg-secondary">
            <motion.div
              className={cn("absolute inset-y-0 left-0", barColor(s.value))}
              initial={{ width: 0 }}
              animate={inView ? { width: `${s.value}%` } : {}}
              transition={{ duration: 1, delay: 0.15 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <span
            className={cn(
              "w-8 shrink-0 text-right font-mono text-sm font-medium tabular-nums",
              s.value >= 85 ? "text-pass" : s.value >= 70 ? "text-warn" : "text-crit",
            )}
          >
            {s.value}
          </span>
        </div>
      ))}
    </div>
  );
}
