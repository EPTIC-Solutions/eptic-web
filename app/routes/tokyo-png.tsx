import { ImageResponse, GoogleFont } from "@cf-wasm/og/workerd";
import type { Route } from "./+types/tokyo-png";
import { siteForRequest } from "~/sites";
import { Tokyo } from "~/sites/banners/Tokyo";

const BASE_WIDTH = 2048;
const BASE_HEIGHT = 1170;
const MAX_WIDTH = 2048;

/** banners.eptic.ro/tokyo.png?w=1024 — OG/README banner for eptic/tokyo. */
export async function loader({ request }: Route.LoaderArgs) {
  if (siteForRequest(request) !== "banners") {
    throw new Response(null, { status: 404, statusText: "Not Found" });
  }

  const params = new URL(request.url).searchParams;
  const raw = params.get("width") ?? params.get("w");
  const width = raw === null ? BASE_WIDTH : parseInt(raw, 10);

  if (Number.isNaN(width) || width < 1) {
    return new Response("Invalid width", { status: 400 });
  }
  if (width > MAX_WIDTH) {
    return new Response("Width too large", { status: 400 });
  }

  return ImageResponse.async(<Tokyo direction="row" scaleFactor={width / BASE_WIDTH} />, {
    width,
    height: Math.round(width * (BASE_HEIGHT / BASE_WIDTH)),
    // Same face @vercel/og used by default on the old server.
    fonts: [
      new GoogleFont("Noto Sans", { weight: 400 }),
      new GoogleFont("Noto Sans", { weight: 600 }),
    ],
    headers: {
      "Cache-Control": "public, max-age=600, s-maxage=3600, stale-while-revalidate=604800",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
