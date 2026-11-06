import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  useRouteLoaderData,
} from "react-router";

import type { Route } from "./+types/root";
import { siteForRequest, type Site } from "./sites";
import tailwindHref from "./tailwind.css?url";
import startHref from "./sites/start/start.css?url";
import terminalHref from "./sites/terminal/terminal.css?url";

/**
 * Each site gets only its own stylesheet, so the terminal's global styles
 * and the start page's Tailwind setup never leak into each other.
 */
const stylesheets: Record<Site, string[]> = {
  terminal: [terminalHref],
  start: [tailwindHref, startHref],
  banners: [tailwindHref],
};

export function loader({ request }: Route.LoaderArgs) {
  return { site: siteForRequest(request) };
}

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useRouteLoaderData<typeof loader>("root");
  const site = data?.site ?? "banners";

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.png" />
        {stylesheets[site].map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const status = isRouteErrorResponse(error) ? error.status : 500;
  const title = isRouteErrorResponse(error)
    ? error.statusText || (status === 404 ? "Not Found" : "Error")
    : "Oh no!";

  return (
    <>
      <title>{title}</title>
      <div className="min-h-screen pt-16 pb-12 flex flex-col bg-white">
        <main className="grow flex flex-col justify-center max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-16 text-center">
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wide">
              {status}
            </p>
            <h1 className="mt-2 text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">
              {title}
            </h1>
            <p className="mt-2 text-base text-gray-500">
              Sorry, something went wrong. If you believe this to be an error, please get in touch
              with support.
            </p>
            {import.meta.env.DEV && error instanceof Error && (
              <pre className="mt-6 text-left text-xs overflow-x-auto p-4 bg-gray-100">
                {error.stack}
              </pre>
            )}
            <div className="mt-6">
              <a
                href="https://www.eptic.ro"
                className="text-base font-medium text-indigo-600 hover:text-indigo-500"
              >
                Go back home<span aria-hidden="true"> &rarr;</span>
              </a>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
