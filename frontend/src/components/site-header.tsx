import { Link, useRouterState } from "@tanstack/react-router";
import { Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/connect", label: "Connect Agent" },
  { to: "/suite", label: "Test Suite" },
  { to: "/report", label: "Report" },
] as const;

export function SiteHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:px-8">
        <Link to="/" className="group flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center border border-border bg-secondary">
            <Terminal className="size-3.5 text-pass" />
          </span>
          <span className="font-display text-sm font-black tracking-[0.22em] text-foreground">
            AGENT<span className="text-pass">CRASH</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={cn(
                "px-3 py-1.5 font-mono text-[11px] tracking-[0.16em] uppercase transition-colors",
                pathname.startsWith(l.to)
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] text-muted-foreground sm:flex">
            <span className="size-1.5 animate-blink bg-pass" />
            SANDBOX ONLINE
          </span>
          <Link
            to="/connect"
            className="border border-foreground/80 px-3.5 py-1.5 font-mono text-[11px] font-medium tracking-[0.16em] text-foreground uppercase transition-colors hover:bg-foreground hover:text-background"
          >
            Test an Agent
          </Link>
        </div>
      </div>
    </header>
  );
}
