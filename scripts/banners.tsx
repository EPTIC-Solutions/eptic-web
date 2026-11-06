import { GoogleFont, ImageResponse } from "@cf-wasm/og/node";
import { BANNER_WIDTHS, TOKYO_BASE } from "../app/sites/banners/widths";
import { Tokyo } from "../app/sites/banners/Tokyo";

/** Render the Tokyo banner as a PNG at a given width. */
export async function renderTokyo(width: number): Promise<ArrayBuffer> {
  const response = await ImageResponse.async(
    <Tokyo direction="row" scaleFactor={width / TOKYO_BASE.width} />,
    {
      width,
      height: Math.round(width * (TOKYO_BASE.height / TOKYO_BASE.width)),
      // Same face @vercel/og used by default on the old server.
      fonts: [
        new GoogleFont("Noto Sans", { weight: 400 }),
        new GoogleFont("Noto Sans", { weight: 600 }),
      ],
    },
  );
  return response.arrayBuffer();
}

export { BANNER_WIDTHS };
