import { env, waitUntil } from "cloudflare:workers";
import { loadRepos, type Repo } from "./repos";

export type { Repo };

const CACHE_KEY = "https://cache.internal/github-repos-v3";
const CACHE_SECONDS = 3600;
/** If GitHub is failing, serve the snapshot and don't retry for this long. */
const FALLBACK_CACHE_SECONDS = 300;

/** Repo list saved at build time by scripts/snapshot-repos.mjs. */
async function loadSnapshot(): Promise<Repo[]> {
  try {
    const res = await env.ASSETS.fetch("https://assets.local/data/repos.json");
    return res.ok ? await res.json() : [];
  } catch {
    return [];
  }
}

function remember(cache: Cache, repos: Repo[], seconds: number) {
  waitUntil(
    cache.put(
      CACHE_KEY,
      new Response(JSON.stringify(repos), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": `public, max-age=${seconds}`,
        },
      }),
    ),
  );
}

/**
 * Repo list for the `repos` command. Cached for an hour in the Cloudflare edge
 * cache. If GitHub fails, falls back to the build-time snapshot (cached for
 * 5 minutes so we don't keep hammering GitHub).
 *
 * GITHUB_TOKEN (`wrangler secret put GITHUB_TOKEN`) avoids the shared
 * unauthenticated rate limit and is required for pinned repos.
 */
export async function getRepos(): Promise<Repo[]> {
  const cache = (caches as unknown as { default: Cache }).default;
  const cached = await cache.match(CACHE_KEY);
  if (cached) return cached.json();

  try {
    const repos = await loadRepos((env as { GITHUB_TOKEN?: string }).GITHUB_TOKEN);
    remember(cache, repos, CACHE_SECONDS);
    return repos;
  } catch (error) {
    console.warn("GitHub repos unavailable, using build snapshot:", String(error));
    const snapshot = await loadSnapshot();
    remember(cache, snapshot, FALLBACK_CACHE_SECONDS);
    return snapshot;
  }
}
