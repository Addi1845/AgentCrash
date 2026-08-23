import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { type ReactNode } from "react";

import appCss from "../styles.css?url";
import { SiteHeader } from "@/components/site-header";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="font-mono text-[11px] tracking-[0.3em] text-crit">ERR_ROUTE_NOT_FOUND</div>
        <h1 className="mt-4 font-display text-7xl font-black tracking-tight text-foreground">
          404
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This route doesn't exist in the sandbox. It may have been moved or never deployed.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center border border-foreground/80 px-4 py-2 font-mono text-[11px] tracking-[0.18em] text-foreground uppercase transition-colors hover:bg-foreground hover:text-background"
          >
            Return to base
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="font-mono text-[11px] tracking-[0.3em] text-crit">RUNTIME_FAULT</div>
        <h1 className="mt-4 font-display text-2xl font-black tracking-tight text-foreground uppercase">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center border border-foreground/80 px-4 py-2 font-mono text-[11px] tracking-[0.18em] text-foreground uppercase transition-colors hover:bg-foreground hover:text-background"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center border border-border px-4 py-2 font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase transition-colors hover:text-foreground"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "AgentCrash — Break your AI agent before your users do" },
      {
        name: "description",
        content:
          "AgentCrash runs tool-using AI agents through adversarial, stateful failure scenarios in a safe sandbox and tells you whether they are safe to deploy.",
      },
      { property: "og:title", content: "AgentCrash — Chaos Engineering for AI Agents" },
      {
        property: "og:description",
        content:
          "Intentionally break tool-using AI agents in a sandbox, detect dangerous behavior, and get a deployment verdict before production.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#17181c" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=JetBrains+Mono:wght@400;500;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const bare = pathname === "/";

  return (
    <QueryClientProvider client={queryClient}>
      {!bare && <SiteHeader />}
      <Outlet />
    </QueryClientProvider>
  );
}
