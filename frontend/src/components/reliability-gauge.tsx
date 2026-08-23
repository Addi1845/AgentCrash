import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "motion/react";
import { cn } from "@/lib/utils";

function scoreColor(score: number) {
  if (score >= 85) return "var(--pass)";
  if (score >= 70) return "var(--warn)";
  return "var(--crit)";
}

export function ReliabilityGauge({
  score,
  size = 260,
  label = "RELIABILITY",
  className,
  animateOnView = true,
}: {
  score: number;
  size?: number;
  label?: string;
  className?: string;
  animateOnView?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [display, setDisplay] = useState(0);
  const [progress, setProgress] = useState(0);

  const active = animateOnView ? inView : true;

  useEffect(() => {
    if (!active) return;
    const controls = animate(0, score, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        setDisplay(Math.round(v));
        setProgress(v / 100);
      },
    });
    return () => controls.stop();
  }, [active, score]);

  const stroke = 10;
  const r = (size - stroke) / 2 - 8;
  const c = 2 * Math.PI * r;
  const color = scoreColor(score);

  return (
    <div ref={ref} className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* tick ring */}
        {Array.from({ length: 40 }).map((_, i) => {
          const a = (i / 40) * Math.PI * 2;
          const inner = size / 2 - 4;
          const outer = size / 2 - (i % 5 === 0 ? 12 : 8);
          // Round to keep SSR and client markup identical (hydration).
          const pt = (r0: number) => ({
            x: Number((size / 2 + r0 * Math.cos(a)).toFixed(2)),
            y: Number((size / 2 + r0 * Math.sin(a)).toFixed(2)),
          });
          const p1 = pt(inner);
          const p2 = pt(outer);
          return (
            <line
              key={i}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke="var(--border)"
              strokeWidth={1}
            />
          );
        })}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--secondary)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="butt"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          style={{ filter: `drop-shadow(0 0 12px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className="font-mono text-6xl font-medium tabular-nums tracking-tight"
          style={{ color }}
        >
          {display}
        </div>
        <div className="mt-1 font-mono text-[10px] tracking-[0.3em] text-muted-foreground">
          / 100
        </div>
        <div className="mt-3 font-mono text-[10px] tracking-[0.3em] text-muted-foreground">
          {label}
        </div>
      </div>
    </div>
  );
}
