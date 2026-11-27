/**
 * releases.eptic.ro/reelhouse/*: downloads and update manifests for
 * Reelhouse, served from the latest published GitHub release of the private
 * wizzymore/reelhouse repo.
 *
 *   /reelhouse/latest.json                                   version + download links (CORS-open)
 *   /reelhouse/download/{app|server}/{platform}              → 302 to a short-lived file URL
 *   /reelhouse/app/update/{target}/{arch}/{bundle}/{version} Tauri updater manifest (204 = up to date)
 *   /reelhouse/server/update/{platform}/{kind}/{version}     server self-update manifest (204 = up to date)
 *
 * Secret: REELHOUSE_GITHUB_TOKEN, a fine-grained token with read-only
 * "Contents" access to wizzymore/reelhouse only
 * (`wrangler secret put REELHOUSE_GITHUB_TOKEN`).
 */
import { waitUntil } from "cloudflare:workers";
import {
  DOWNLOADS,
  UPDATES,
  findAsset,
  isNewer,
  parseChecksums,
  type LatestRelease,
} from "../app/lib/reelhouse";

const REPO = "wizzymore/reelhouse";
const PREFIX = "/reelhouse";
/** How long a new release takes to show up. */
const RELEASE_CACHE_SECONDS = 300;

type GitHubAsset = { id: number; name: string; size: number; url: string };
type GitHubRelease = {
  tag_name: string;
  body: string | null;
  published_at: string | null;
  assets: GitHubAsset[];
};

type ReelhouseEnv = {
  REELHOUSE_GITHUB_TOKEN?: string;
  /** Development only: a stand-in for https://api.github.com (tests). */
  REELHOUSE_GITHUB_API?: string;
};

const json = (data: unknown, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json; charset=utf-8", ...extra },
  });

const noUpdate = () =>
  new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
const notFound = (msg = "Not found") => new Response(`${msg}\n`, { status: 404 });

function github(env: ReelhouseEnv, path: string, accept = "application/vnd.github+json") {
  if (!env.REELHOUSE_GITHUB_TOKEN) throw new Error("REELHOUSE_GITHUB_TOKEN is not set");
  const api = env.REELHOUSE_GITHUB_API ?? "https://api.github.com";
  return fetch(`${api}${path}`, {
    headers: {
      authorization: `Bearer ${env.REELHOUSE_GITHUB_TOKEN}`,
      accept,
      "user-agent": "eptic-web",
      "x-github-api-version": "2022-11-28",
    },
    redirect: "manual",
  });
}

const cache = () => (caches as unknown as { default: Cache }).default;

/** Latest published (non-draft, non-prerelease) release; null if none yet. */
async function latestRelease(env: ReelhouseEnv): Promise<GitHubRelease | null> {
  const key = "https://cache.internal/reelhouse-latest-v1";
  const hit = await cache().match(key);
  if (hit) return hit.json();

  const res = await github(env, `/repos/${REPO}/releases/latest`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub releases: ${res.status}`);
  const release: GitHubRelease = await res.json();
  waitUntil(
    cache().put(
      key,
      new Response(JSON.stringify(release), {
        headers: { "cache-control": `public, max-age=${RELEASE_CACHE_SECONDS}` },
      }),
    ),
  );
  return release;
}

/** A short-lived URL for the file itself (GitHub redirects to its storage). */
async function signedAssetUrl(env: ReelhouseEnv, asset: GitHubAsset): Promise<string> {
  const res = await github(
    env,
    `/repos/${REPO}/releases/assets/${asset.id}`,
    "application/octet-stream",
  );
  const location = res.headers.get("location");
  if (res.status >= 300 && res.status < 400 && location) return location;
  throw new Error(`GitHub asset ${asset.name}: ${res.status}`);
}

/** Small text assets (.sig, SHA256SUMS); immutable per asset id, cached for a day. */
async function assetText(env: ReelhouseEnv, asset: GitHubAsset): Promise<string> {
  const key = `https://cache.internal/reelhouse-asset-${asset.id}`;
  const hit = await cache().match(key);
  if (hit) return hit.text();
  const res = await fetch(await signedAssetUrl(env, asset));
  if (!res.ok) throw new Error(`downloading ${asset.name}: ${res.status}`);
  const text = await res.text();
  waitUntil(
    cache().put(key, new Response(text, { headers: { "cache-control": "public, max-age=86400" } })),
  );
  return text;
}

const version = (r: GitHubRelease) => r.tag_name.replace(/^v/, "");

function summary(origin: string, r: GitHubRelease): LatestRelease {
  const links = <K extends string>(product: string, patterns: Record<K, RegExp>) =>
    Object.fromEntries(
      Object.entries<RegExp>(patterns)
        .filter(([, p]) => findAsset(r.assets, p))
        .map(([platform]) => [platform, `${origin}${PREFIX}/download/${product}/${platform}`]),
    ) as Partial<Record<K, string>>;
  return {
    version: version(r),
    notes: r.body,
    pub_date: r.published_at,
    downloads: { app: links("app", DOWNLOADS.app), server: links("server", DOWNLOADS.server) },
  };
}

/** Pattern table for /download/{product}/{key}. */
const DOWNLOAD_TABLES: Record<string, Record<string, RegExp>> = {
  app: DOWNLOADS.app,
  server: DOWNLOADS.server,
  "app-update": UPDATES.app,
  "server-update": UPDATES.server,
};

export async function handleReelhouse(request: Request, workerEnv: Env): Promise<Response> {
  // Secrets aren't part of the generated Env type.
  const env = workerEnv as unknown as ReelhouseEnv;
  const url = new URL(request.url);
  const parts = url.pathname.slice(PREFIX.length).split("/").filter(Boolean);

  try {
    // /latest.json
    if (parts.length === 1 && parts[0] === "latest.json") {
      const r = await latestRelease(env);
      const cors = { "access-control-allow-origin": "*", "cache-control": "public, max-age=60" };
      if (!r) return json({ error: "no release yet" }, cors);
      return json(summary(url.origin, r), cors);
    }

    // /download/{product}/{key}
    if (parts.length === 3 && parts[0] === "download") {
      const pattern = DOWNLOAD_TABLES[parts[1]!]?.[parts[2]!];
      if (!pattern) return notFound("Unknown package");
      const r = await latestRelease(env);
      const asset = r && findAsset(r.assets, pattern);
      if (!asset) return notFound("This package is not available yet");
      return new Response(null, {
        status: 302,
        headers: { location: await signedAssetUrl(env, asset), "cache-control": "no-store" },
      });
    }

    // /app/update/{target}/{arch}/{bundle}/{current}: Tauri's updater
    if (parts.length === 6 && parts[0] === "app" && parts[1] === "update") {
      const [, , target, , bundle, current] = parts as [
        string,
        string,
        string,
        string,
        string,
        string,
      ];
      const key = target === "darwin" ? "darwin-app" : `${target}-${bundle}`;
      const pattern = (UPDATES.app as Record<string, RegExp>)[key];
      const r = await latestRelease(env);
      if (!pattern || !r || !isNewer(version(r), current)) return noUpdate();
      const asset = findAsset(r.assets, pattern);
      const sig = asset && findAsset(r.assets, new RegExp(`^${escapeRegExp(asset.name)}\\.sig$`));
      if (!asset || !sig) return noUpdate();
      return json(
        {
          version: version(r),
          notes: r.body ?? undefined,
          pub_date: r.published_at ?? undefined,
          url: `${url.origin}${PREFIX}/download/app-update/${key}`,
          signature: (await assetText(env, sig)).trim(),
        },
        { "cache-control": "no-store" },
      );
    }

    // /server/update/{platform}/{kind}/{current}: the server's self-update
    if (parts.length === 5 && parts[0] === "server" && parts[1] === "update") {
      const [, , platform, kind, current] = parts as [string, string, string, string, string];
      const key = `${platform}-${kind}`;
      const pattern = (UPDATES.server as Record<string, RegExp>)[key];
      const r = await latestRelease(env);
      if (!pattern || !r || !isNewer(version(r), current)) return noUpdate();
      const asset = findAsset(r.assets, pattern);
      const sums = findAsset(r.assets, /^SHA256SUMS$/);
      if (!asset || !sums) return noUpdate();
      const sha256 = parseChecksums(await assetText(env, sums)).get(asset.name);
      if (!sha256) return noUpdate();
      return json(
        {
          version: version(r),
          notes: r.body,
          pub_date: r.published_at,
          url: `${url.origin}${PREFIX}/download/server-update/${key}`,
          sha256,
          size: asset.size,
        },
        { "cache-control": "no-store" },
      );
    }

    return notFound();
  } catch (error) {
    console.error("reelhouse releases:", String(error));
    return new Response("Release information is unavailable right now\n", { status: 502 });
  }
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
