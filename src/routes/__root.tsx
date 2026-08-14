import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";
import { ArticlesProvider } from "@/lib/articles";
import { SiteContentProvider } from "@/lib/site-content";
import { Navigation } from "@/components/navigation";
import { BackToTop } from "@/components/back-to-top";
import { NotificationsButton } from "@/components/notifications";
import { BannedGate } from "@/components/banned-gate";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-medium text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-medium text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-[28px] bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
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
            className="inline-flex items-center justify-center rounded-[28px] bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-[28px] border border-border bg-background px-6 py-3 text-sm font-medium text-foreground"
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
      { title: "Tech by Marcon — Guides, downloads and links" },
      { name: "description", content: "Find the downloads and links of my guides: Android tuning, Material Design, tools and more." },
      { name: "author", content: "Marcon" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "Tech by Marcon — Guides, downloads and links" },
      { name: "twitter:title", content: "Tech by Marcon — Guides, downloads and links" },
      { property: "og:description", content: "Find the downloads and links of my guides: Android tuning, Material Design, tools and more." },
      { name: "twitter:description", content: "Find the downloads and links of my guides: Android tuning, Material Design, tools and more." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/0f639417-62a3-431c-99b9-41c050b3c818/id-preview-c2b508a7--038a1fc6-930c-4886-be97-4231d5a72619.lovable.app-1785616872777.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/0f639417-62a3-431c-99b9-41c050b3c818/id-preview-c2b508a7--038a1fc6-930c-4886-be97-4231d5a72619.lovable.app-1785616872777.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0..1,0&display=block",
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
    <html lang="en">
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

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ArticlesProvider>
           <SiteContentProvider>
            <div className="relative min-h-screen w-full bg-background">
              <div className="aurora" aria-hidden="true" />
              <BannedGate>
              <Navigation />
              <main className="pb-28 md:pb-0 md:pl-[90px]">
                {/* Required: nested routes render here. */}
                <Outlet />
              </main>
              <NotificationsButton />
              <BackToTop />
              </BannedGate>
            </div>
           </SiteContentProvider>
          </ArticlesProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
