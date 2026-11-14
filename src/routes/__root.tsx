import { VoiceAgent } from "@/components/VoiceAgent";
import { OpeningSplash } from "@/components/OpeningSplash";
import { BackgroundDarshanAudio } from "@/components/BackgroundDarshanAudio";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { I18nProvider } from "../lib/i18n";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { SITE_COPY } from "../lib/site-copy";
import { closeOpenOverlay, createBackHandler } from "../lib/android-back";
import { initNativeShell } from "@/lib/platform";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
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
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
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
      { name: "theme-color", content: "#641E26" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Tirumala Guide" },
      { title: "Tirumala Guide" },
      { name: "description", content: "Pilgrim guide to Tirumala in Telugu, English and more." },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/tirumala-180.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Figtree:wght@400;500;600;700&family=Mandali&family=Noto+Sans+Telugu:wght@400;500;600;700&family=Noto+Sans+Tamil:wght@400;600&family=Noto+Serif+Tamil:wght@600&family=Noto+Sans+Kannada:wght@400;600&family=Noto+Serif+Kannada:wght@600&family=Noto+Sans+Malayalam:wght@400;600&family=Noto+Serif+Malayalam:wght@600&family=Noto+Sans+Devanagari:wght@400;600&family=Noto+Serif+Devanagari:wght@600&family=Noto+Sans+Oriya:wght@400;600;700&display=swap",
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
    <html lang="te">
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
  const router = useRouter();
  const adminPage = useRouterState({ select: s => s.location.pathname.startsWith("/admin") });
  useEffect(() => {
    const onBack = createBackHandler({
      pathname: () => router.state.location.pathname,
      historyLength: () => window.history.length,
      goBack: () => router.history.back(),
      goHome: () => void router.navigate({ to: "/", replace: true }),
      closeOverlay: closeOpenOverlay,
      showExitHint: () => {
        let code: keyof typeof SITE_COPY = "te";
        try { const saved = localStorage.getItem("tirumala-guide-lang"); if (saved && saved in SITE_COPY) code = saved as keyof typeof SITE_COPY; } catch { /* default language */ }
        toast(SITE_COPY[code].exitHint, { duration: 2000 });
      },
    });
    return initNativeShell({
      statusBarColor: "#641E26",
      // Android back: close dialogs, then app history; on Home a second press within 2 s exits.
      onBack,
      onResume: () => void queryClient.invalidateQueries(),
    });
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <I18nProvider>
        {!adminPage && <OpeningSplash />}
        <Outlet />
        {!adminPage && <BackgroundDarshanAudio />}
        <VoiceAgent />
        <Toaster position="top-center" />
      </I18nProvider>
    </QueryClientProvider>
  );
}
