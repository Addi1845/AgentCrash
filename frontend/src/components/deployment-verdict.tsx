import { cn } from "@/lib/utils";

export function DeploymentVerdict({
  verdict,
  className,
  small,
}: {
  verdict: "READY" | "DO NOT DEPLOY";
  className?: string;
  small?: boolean;
}) {
  const ready = verdict === "READY";
  return (
    <div
      className={cn(
        "animate-stamp inline-block border-4 font-display font-black uppercase tracking-[0.2em]",
        ready ? "border-pass text-pass text-glow-pass" : "border-crit text-crit text-glow-crit",
        small ? "px-4 py-2 text-xl" : "px-8 py-4 text-4xl md:text-5xl",
        className,
      )}
      style={{ borderStyle: "double" }}
    >
      {verdict}
    </div>
  );
}
