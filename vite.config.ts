import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, lazyPlugins } from "vite-plus";

// Let the local dev/preview server answer for the real hostnames too, so you
// can test with e.g. `curl -H "Host: start.eptic.ro" localhost:5173`.
// *.localhost (start.localhost:5173) is always allowed.
const allowedHosts = [".eptic.ro", "eptic.ro", ".epticgames.com", "epticgames.com"];

export default defineConfig({
  fmt: {},
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  plugins: lazyPlugins(() => [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    reactRouter(),
  ]),
  resolve: {
    tsconfigPaths: true,
  },
  server: { allowedHosts },
  preview: { allowedHosts },
});
