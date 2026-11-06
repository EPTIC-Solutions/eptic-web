import { createRequestHandler } from "react-router";
import { cache as ogCache } from "@cf-wasm/og/workerd";
import { redirects } from "../app/sites";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(request, _env, ctx) {
    const url = new URL(request.url);

    // Domain-level redirects (eptic.ro -> www, terminal.* -> www, epticgames.com -> www)
    const redirect = redirects[url.hostname];
    if (redirect) {
      return Response.redirect(`${redirect.to}${url.pathname}${url.search}`, redirect.status);
    }

    // Lets the OG image renderer cache fonts/wasm across requests.
    ogCache.setExecutionContext(ctx);

    return requestHandler(request);
  },
} satisfies ExportedHandler<Env>;
