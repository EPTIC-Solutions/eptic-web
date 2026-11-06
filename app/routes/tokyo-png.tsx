import { env } from "cloudflare:workers";
import type { Route } from "./+types/tokyo-png";
import { siteForRequest } from "~/sites";
import { bannerPath, pickBannerWidth, TOKYO_BASE } from "~/sites/banners/widths";

/**
 * banners.eptic.ro/tokyo.png?w=900, the banner embedded in the eptic/tokyo README.
 * PNGs are pre-rendered at build time (scripts/render-banners.mjs); this only
 * picks the right file, which keeps us under the Workers free-plan CPU limit.
 */
export async function loader({ request }: Route.LoaderArgs) {
  if (siteForRequest(request) !== "banners") {
    throw new Response(null, { status: 404, statusText: "Not Found" });
  }

  const params = new URL(request.url).searchParams;
  const raw = params.get("width") ?? params.get("w");
  const requested = raw === null ? TOKYO_BASE.width : parseInt(raw, 10);

  if (Number.isNaN(requested) || requested < 1) {
    return new Response("Invalid width", { status: 400 });
  }
  const width = pickBannerWidth(requested);
  if (width === null) {
    return new Response("Width too large", { status: 400 });
  }

  const asset = await env.ASSETS.fetch(new URL(bannerPath(width), request.url));
  if (!asset.ok) {
    return new Response("Banner missing", { status: 500 });
  }

  return new Response(asset.body, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=600, s-maxage=3600, stale-while-revalidate=604800",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
