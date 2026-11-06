import { env, waitUntil } from "cloudflare:workers";

export type Repo = {
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
};

const ACCOUNTS = ["wizzymore", "EPTIC-Solutions"];
const CACHE_KEY = "https://cache.internal/github-repos-v1";
const CACHE_SECONDS = 3600;

type GitHubRepo = Repo & { updated_at: string };

async function fetchAccount(account: string): Promise<GitHubRepo[]> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "eptic-web",
  };
  // Optional: unauthenticated calls share a 60/hour limit per IP, which can
  // run out on Cloudflare's shared egress IPs. `wrangler secret put GITHUB_TOKEN`.
  const token = (env as { GITHUB_TOKEN?: string }).GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`https://api.github.com/users/${account}/repos`, { headers });
  if (!res.ok) throw new Error(`GitHub ${account}: ${res.status}`);
  return res.json();
}

/**
 * Public repos of both accounts, newest first. Cached for an hour in the
 * Cloudflare edge cache; on failure returns an empty list instead of
 * breaking the page.
 */
export async function getRepos(): Promise<Repo[]> {
  const cache = (caches as unknown as { default: Cache }).default;
  const cached = await cache.match(CACHE_KEY);
  if (cached) return cached.json();

  try {
    const lists = await Promise.all(ACCOUNTS.map(fetchAccount));
    const repos = lists
      .flat()
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .map(({ full_name, description, html_url, language }) => ({
        full_name,
        description,
        html_url,
        language,
      }));

    waitUntil(
      cache.put(
        CACHE_KEY,
        new Response(JSON.stringify(repos), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": `public, max-age=${CACHE_SECONDS}`,
          },
        }),
      ),
    );
    return repos;
  } catch (error) {
    console.error("Failed to load GitHub repos", error);
    return [];
  }
}
