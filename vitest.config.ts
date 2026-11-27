// Unit tests for plain modules (app/lib). Kept separate from vite.config.ts,
// whose Cloudflare and React Router plugins aren't needed (or usable) here.
import { defineConfig } from "vite-plus";

export default defineConfig({
  resolve: { alias: { "~": new URL("./app", import.meta.url).pathname } },
  test: { include: ["app/**/*.test.ts"] },
});
