// Saves the GitHub repo list to public/data/repos.json at build time.
// The Worker serves this when the live GitHub API call fails (e.g. the
// unauthenticated rate limit is exhausted on Cloudflare's shared IPs).
// Set GITHUB_TOKEN for the build to include pinned repos.
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { runnerImport } from "vite-plus";

const root = fileURLToPath(new URL("..", import.meta.url));
const out = new URL("../public/data/repos.json", import.meta.url);

const { module } = await runnerImport(
  fileURLToPath(new URL("../app/lib/repos.ts", import.meta.url)),
  {
    root,
    configFile: false,
  },
);

let repos = [];
try {
  repos = await module.loadRepos(process.env.GITHUB_TOKEN, "eptic-web-build");
} catch (error) {
  // Don't block a deploy over this; the live call may still work.
  console.warn(`repos: snapshot failed (${error.message}), writing an empty list`);
}

await mkdir(new URL(".", out), { recursive: true });
await writeFile(out, JSON.stringify(repos));
const pinned = repos.filter((repo) => repo.pinned).length;
console.log(`repos: snapshot of ${repos.length} repositories (${pinned} pinned)`);
