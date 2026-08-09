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
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { GROWTH_BRAND } from "@/lib/brand";

const PUBLIC_ROUTES = new Set([
  "/",
  "/construction-growth",
  "/facility-services-growth",
  "/sme-growth",
  "/login",
  "/sitemap.xml",
  "/robots.txt",
]);

function normalizePathname(pathname: string): string {
  if (pathname === "/") {
    return "/";
  }

  return pathname.replace(/\/+$/, "");
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.has(normalizePathname(pathname));
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gradient-gold font-display">
          404
        </h1>

        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Page not found
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          The page you requested could not be found in the GROWTH workspace.
        </p>

        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground gold-glow transition-colors hover:bg-primary/90"
          >
            Return to website
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  console.error("GROWTH route error:", error);

  const router = useRouter();

  async function retry() {
    await router.invalidate();
    reset();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Something went wrong
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          We could not load this part of the GROWTH workspace. Please try
          again or return to the Command Centre.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>

          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Website home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "GROWTH — Business Growth Intelligence",
      },
      {
        name: "description",
        content:
          "GROWTH is Cossa Nexus Holdings' business growth intelligence platform for marketing, sales, operations and AI-supported execution.",
      },
      {
        name: "author",
        content: GROWTH_BRAND.parentCompany,
      },
      {
        name: "robots",
        content: "index, follow",
      },
      {
        property: "og:site_name",
        content: GROWTH_BRAND.productName,
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        property: "og:image",
        content: GROWTH_BRAND.assets.growthFull,
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap",
      },
      {
        rel: "icon",
        href: GROWTH_BRAND.assets.growthSymbol,
        type: "image/jpeg",
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
    <html lang="en-ZA" className="dark">
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

function GoogleTagManager() {
  useEffect(() => {
    const containerId = import.meta.env.VITE_GTM_CONTAINER_ID?.trim();

    if (!containerId) {
      return;
    }

    if (document.getElementById("cossa-gtm")) {
      return;
    }

    const typedWindow = window as Window & {
      dataLayer?: Array<Record<string, unknown>>;
    };

    const dataLayer = (typedWindow.dataLayer ??= []);

    dataLayer.push({
      "gtm.start": Date.now(),
      event: "gtm.js",
    });

    const script = document.createElement("script");

    script.id = "cossa-gtm";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(
      containerId,
    )}`;

    script.onerror = () => {
      console.warn("Google Tag Manager failed to load.");
    };

    document.head.appendChild(script);

    return () => {
      script.onerror = null;
    };
  }, []);

  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const publicRoute = isPublicRoute(pathname);

  return (
    <QueryClientProvider client={queryClient}>
      <GoogleTagManager />

      {publicRoute ? (
        <Outlet />
      ) : (
        <AuthGate>
          <AppShell>
            <Outlet />
          </AppShell>
        </AuthGate>
      )}
    </QueryClientProvider>
  );
}
