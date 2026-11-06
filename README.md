# eptic-web

One React Router app on Cloudflare Workers that serves every EPTIC hostname.
Replaces the three Ploi sites on the Hetzner box (`eptic.ro` Laravel, `start.eptic.ro` Vue, `banners.eptic.ro` Remix).

| Host                                              | What it serves                                   |
| ------------------------------------------------- | ------------------------------------------------ |
| `www.eptic.ro`                                    | Terminal site (`app/sites/terminal`)             |
| `start.eptic.ro`                                  | Search start page (`app/sites/start`)            |
| `banners.eptic.ro/tokyo.png?w=`                   | Generated OG banner (`app/routes/tokyo-png.tsx`) |
| `eptic.ro`, `terminal.eptic.ro`, `epticgames.com` | Redirect to `www.eptic.ro` (path kept)           |

Hostname → site mapping and redirects are all in `app/sites.ts`.

## Develop

```sh
pnpm install
pnpm dev
```

- http://localhost:5173: terminal
- http://start.localhost:5173: start page
- http://banners.localhost:5173/tokyo.png: banner

`pnpm preview` builds and runs the production bundle in the real Workers runtime (workerd).

Tooling is [Vite+](https://viteplus.dev) (`vp`): Vite + Rolldown for builds, Oxlint/Oxfmt/tsgolint for checks.

| Command          | What it does                                                               |
| ---------------- | -------------------------------------------------------------------------- |
| `pnpm dev`       | `vp dev`, dev server with HMR                                              |
| `pnpm build`     | `vp build`, client + Worker bundles in `build/`                            |
| `pnpm check`     | Generates route/Worker types, then `vp check` (format + lint + type check) |
| `pnpm check:fix` | Same, and auto-fixes formatting/lint                                       |

esbuild is still installed because `wrangler` depends on it, but nothing in the build uses it.

## Deploy (Cloudflare Workers, free plan)

One-time setup:

1. Add `eptic.ro` and `epticgames.com` as zones in Cloudflare and switch each domain's nameservers at the registrar.
   **Before switching `eptic.ro`, make sure the MX record (`work-mx.app.hey.com`) and any TXT/SPF/DKIM records were imported**, or email breaks.
2. `pnpm wrangler login`
3. Optional: `pnpm wrangler secret put GITHUB_TOKEN` (a read-only token for the `repos` command; without it the GitHub API may rate-limit).

Then deploy:

```sh
pnpm run deploy
```

Wrangler attaches the custom domains listed in `wrangler.jsonc` and creates their DNS records and certificates.
To try it before moving DNS, comment out `routes` and use the `*.workers.dev` URL.

To add a subdomain: add it to `app/sites.ts` and to `routes` in `wrangler.jsonc`.
