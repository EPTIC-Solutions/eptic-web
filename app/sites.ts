/**
 * Every hostname this app answers for, in one place.
 *
 * - `sites` maps a hostname to the site it renders.
 * - `redirects` maps a hostname to the origin it forwards to (path + query are kept).
 *
 * To add a new subdomain: add it here, then attach it as a Custom Domain in
 * wrangler.jsonc (`routes`).
 */

export type Site = "terminal" | "start" | "banners";

export const sites: Record<string, Site> = {
  "www.eptic.ro": "terminal",
  "start.eptic.ro": "start",
  "banners.eptic.ro": "banners",
};

export const redirects: Record<string, { to: string; status: 301 | 302 }> = {
  "eptic.ro": { to: "https://www.eptic.ro", status: 301 },
  "terminal.eptic.ro": { to: "https://www.eptic.ro", status: 302 },
  "epticgames.com": { to: "https://www.eptic.ro", status: 302 },
  "www.epticgames.com": { to: "https://www.eptic.ro", status: 302 },
};

/**
 * Resolve which site a request is for.
 *
 * Unknown hosts (localhost, *.workers.dev previews) fall back to the first
 * label so `start.localhost:5173` and `banners.localhost:5173` work in dev,
 * and anything else renders the main terminal site.
 */
export function siteForHost(hostname: string): Site {
  const known = sites[hostname];
  if (known) return known;

  const label = hostname.split(".")[0];
  if (label === "start" || label === "banners") return label;
  return "terminal";
}

export function siteForRequest(request: Request): Site {
  const url = new URL(request.url);

  // On the *.workers.dev preview URL every site shares one hostname, so allow
  // `?site=start` / `?site=banners` there for testing. Ignored on real domains.
  if (url.hostname.endsWith(".workers.dev")) {
    const override = url.searchParams.get("site");
    if (override === "terminal" || override === "start" || override === "banners") {
      return override;
    }
  }

  return siteForHost(url.hostname);
}
