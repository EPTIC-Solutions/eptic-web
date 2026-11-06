/** Natural size of the Tokyo banner. */
export const TOKYO_BASE = { width: 2048, height: 1170 };

/**
 * Widths pre-rendered at build time (scripts/render-banners.mjs). Rendering
 * PNGs per request blows the Workers free-plan 10ms CPU limit, so
 * /tokyo.png?w=N serves the smallest of these that is >= N.
 * 900 is what the eptic/tokyo README embeds.
 */
export const BANNER_WIDTHS = [400, 600, 800, 900, 1200, 1600, 2048] as const;

export const bannerPath = (width: number) => `/banners/tokyo-${width}.png`;

/** Pick the pre-rendered width to serve for a requested width. */
export function pickBannerWidth(requested: number): number | null {
  if (requested > TOKYO_BASE.width) return null;
  return BANNER_WIDTHS.find((w) => w >= requested) ?? null;
}
