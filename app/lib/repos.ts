/**
 * Loads the repo list for the terminal's `repos` command. Plain `fetch` only,
 * so it runs both in the Worker (app/lib/github.server.ts) and at build time
 * (scripts/snapshot-repos.mjs).
 */

export type Repo = {
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  /** Pinned on the PINNED_FROM profile; listed first. */
  pinned?: boolean;
};

/** Accounts whose public repos are listed. */
const ACCOUNTS = ["wizzymore", "EPTIC-Solutions"];
/** Whose profile pins get the special treatment. */
const PINNED_FROM = "wizzymore";

type RestRepo = Repo & { updated_at: string; archived: boolean };

type PinnedNode = {
  nameWithOwner: string;
  description: string | null;
  url: string;
  primaryLanguage: { name: string } | null;
};

const restHeaders = (token: string | undefined, userAgent: string) => {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": userAgent,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

async function fetchAccount(account: string, headers: Record<string, string>) {
  const res = await fetch(`https://api.github.com/users/${account}/repos`, { headers });
  if (!res.ok) throw new Error(`GitHub ${account}: ${res.status}`);
  return (await res.json()) as RestRepo[];
}

/**
 * Pinned repos only exist in GitHub's GraphQL API, which always needs a token.
 * Without one (or on failure) there are simply no pins.
 */
async function fetchPinned(token: string | undefined, userAgent: string): Promise<Repo[]> {
  if (!token) return [];
  try {
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: { ...restHeaders(token, userAgent), "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query($login: String!) {
          user(login: $login) {
            pinnedItems(first: 6, types: REPOSITORY) {
              nodes { ... on Repository { nameWithOwner description url primaryLanguage { name } } }
            }
          }
        }`,
        variables: { login: PINNED_FROM },
      }),
    });
    if (!res.ok) throw new Error(`GraphQL ${res.status}`);
    const body = (await res.json()) as {
      data?: { user?: { pinnedItems?: { nodes?: PinnedNode[] } } };
    };
    return (body.data?.user?.pinnedItems?.nodes ?? []).map((node) => ({
      full_name: node.nameWithOwner,
      description: node.description,
      html_url: node.url,
      language: node.primaryLanguage?.name ?? null,
      pinned: true,
    }));
  } catch (error) {
    console.warn("GitHub pinned repos unavailable:", String(error));
    return [];
  }
}

/** Pinned repos first (in profile order), then the rest, newest first. Archived repos are hidden. */
export async function loadRepos(token?: string, userAgent = "eptic-web"): Promise<Repo[]> {
  const headers = restHeaders(token, userAgent);
  const [pinned, ...lists] = await Promise.all([
    fetchPinned(token, userAgent),
    ...ACCOUNTS.map((account) => fetchAccount(account, headers)),
  ]);

  const pinnedNames = new Set(pinned.map((repo) => repo.full_name));
  const rest = lists
    .flat()
    .filter((repo) => !repo.archived && !pinnedNames.has(repo.full_name))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map(({ full_name, description, html_url, language }) => ({
      full_name,
      description,
      html_url,
      language,
    }));

  return [...pinned, ...rest];
}
