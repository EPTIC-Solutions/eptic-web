// Saves the GitHub repo list to public/data/repos.json at build time.
// The Worker serves this when the live GitHub API call fails (e.g. the
// unauthenticated rate limit is exhausted on Cloudflare's shared IPs).
import { mkdir, writeFile } from "node:fs/promises";

const ACCOUNTS = ["wizzymore", "EPTIC-Solutions"];
const out = new URL("../public/data/repos.json", import.meta.url);

const headers = { Accept: "application/vnd.github+json", "User-Agent": "eptic-web-build" };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

let repos = [];
try {
  const lists = await Promise.all(
    ACCOUNTS.map(async (account) => {
      const res = await fetch(`https://api.github.com/users/${account}/repos`, { headers });
      if (!res.ok) throw new Error(`GitHub ${account}: ${res.status}`);
      return res.json();
    }),
  );
  repos = lists
    .flat()
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map(({ full_name, description, html_url, language }) => ({
      full_name,
      description,
      html_url,
      language,
    }));
} catch (error) {
  // Don't block a deploy over this; the live call may still work.
  console.warn(`repos: snapshot failed (${error.message}), writing an empty list`);
}

await mkdir(new URL(".", out), { recursive: true });
await writeFile(out, JSON.stringify(repos));
console.log(`repos: snapshot of ${repos.length} repositories`);
