import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { TraceEvent } from "@/lib/domain";

const glyph: Record<TraceEvent["kind"], { mark: string; className: string }> = {
  ok: { mark: "✓", className: "text-pass" },
  fail: { mark: "✕", className: "text-crit" },
  inject: { mark: "⚠", className: "text-warn" },
  agent: { mark: "›", className: "text-foreground" },
  info: { mark: "·", className: "text-muted-foreground" },
  verdict: { mark: "■", className: "text-crit" },
};

export function ExecutionTrace({
  events,
  className,
  autoScroll = false,
  maxHeight,
}: {
  events: TraceEvent[];
  className?: string;
  autoScroll?: boolean;
  maxHeight?: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!autoScroll || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [events.length, autoScroll]);

  return (
    <div
      ref={scrollRef}
      style={maxHeight ? { maxHeight } : undefined}
      className={cn(
        "overflow-y-auto border border-border bg-background/60 font-mono text-[13px] leading-relaxed",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-[10px] tracking-[0.25em] text-muted-foreground">EXECUTION TRACE</span>
        <span className="flex items-center gap-1.5 text-[10px] tracking-[0.2em] text-muted-foreground">
          <span className="size-1.5 animate-blink bg-pass" />
          LIVE
        </span>
      </div>
      <div className="p-4">
        {events.map((e, i) => {
          const g = glyph[e.kind];
          const highlight = e.kind === "inject" || e.kind === "fail" || e.kind === "verdict";
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
              className={cn(
                "flex gap-3 px-2 py-1.5",
                highlight && "-mx-2 border-l-2 px-3",
                e.kind === "inject" && "border-warn bg-warn-dim",
                e.kind === "fail" && "border-crit bg-crit-dim",
                e.kind === "verdict" && "border-crit bg-crit-dim",
              )}
            >
              <span className="shrink-0 text-muted-foreground/70 tabular-nums">{e.t}</span>
              <span className={cn("shrink-0", g.className)}>{g.mark}</span>
              <span className="min-w-0">
                <span className={cn("break-words", g.className)}>{e.label}</span>
                {e.detail && (
                  <span className="break-words text-muted-foreground"> — {e.detail}</span>
                )}
              </span>
            </motion.div>
          );
        })}
        {events.length === 0 && (
          <div className="px-2 py-1.5 text-muted-foreground">
            awaiting trace events<span className="animate-blink">▌</span>
          </div>
        )}
      </div>
    </div>
  );
}
