# eptic-web

The EPTIC websites, as one React Router app on Cloudflare Workers.
Hostname → site mapping lives in `app/sites.ts`.

## Develop

```sh
pnpm install
pnpm dev
```

- http://localhost:5173: terminal
- http://start.localhost:5173: start page
- http://banners.localhost:5173/tokyo.png: banner

| Command          | What it does                                 |
| ---------------- | -------------------------------------------- |
| `pnpm dev`       | Dev server with HMR                          |
| `pnpm build`     | Production build                             |
| `pnpm preview`   | Build and run locally in the Workers runtime |
| `pnpm check`     | Format, lint and type check                  |
| `pnpm check:fix` | Same, and auto-fixes formatting/lint         |

| `pnpm test` | Unit tests (`app/**/*.test.ts`) |

Tooling is [Vite+](https://viteplus.dev) (`vp`).

## Reelhouse downloads and updates

`releases.eptic.ro/reelhouse/*` (`workers/reelhouse.ts`) serves the latest published release of the private
`wizzymore/reelhouse` repo; the terminal's `reelhouse` and `reelhouse-server` commands download from it, and
the apps update themselves through it.

| Path                                                       | What                                          |
| ---------------------------------------------------------- | --------------------------------------------- |
| `/reelhouse/latest.json`                                   | Version, notes and download links (CORS-open) |
| `/reelhouse/download/{app,server}/{platform}`              | 302 to a short-lived link to the file         |
| `/reelhouse/app/update/{target}/{arch}/{bundle}/{version}` | Tauri updater manifest (204 if up to date)    |
| `/reelhouse/server/update/{platform}/{kind}/{version}`     | Server self-update manifest with SHA-256      |

Needs the `REELHOUSE_GITHUB_TOKEN` secret (see `wrangler.jsonc`). In development the same paths work on
localhost; `REELHOUSE_GITHUB_API` can point at a stand-in for api.github.com.
