import { createRequestHandler } from "react-router";
import { redirects, releaseScripts } from "../app/sites";
import { handleReelhouse } from "./reelhouse";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Domain-level redirects (eptic.ro -> www, terminal.* -> www, epticgames.com -> www)
    const redirect = redirects[url.hostname];
    if (redirect) {
      return Response.redirect(`${redirect.to}${url.pathname}${url.search}`, redirect.status);
    }

    // Reelhouse downloads and update manifests. Also on non-production hosts
    // (localhost, *.workers.dev) so the terminal commands work in development.
    if (
      url.pathname.startsWith("/reelhouse/") &&
      (url.hostname === "releases.eptic.ro" || !url.hostname.endsWith("eptic.ro"))
    ) {
      return handleReelhouse(request, env);
    }

    if (url.hostname === "releases.eptic.ro") {
      const source = releaseScripts[url.pathname];
      if (!source) return new Response("Not found\n", { status: 404 });
      const upstream = await fetch(source, { cf: { cacheTtl: 300, cacheEverything: true } });
      if (!upstream.ok) return new Response("Script unavailable\n", { status: 502 });
      return new Response(upstream.body, {
        headers: {
          "content-type": "text/x-shellscript; charset=utf-8",
          "cache-control": "public, max-age=300",
        },
      });
    }

    return requestHandler(request);
  },
} satisfies ExportedHandler<Env>;
