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

Tooling is [Vite+](https://viteplus.dev) (`vp`).
