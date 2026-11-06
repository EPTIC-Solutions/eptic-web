// Pre-renders the Tokyo banner PNGs into public/banners/ before `vp build`.
// Uses Vite's own module runner (Oxc) to load the TSX, so no extra TS/JSX tooling.
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { runnerImport } from "vite-plus";

const root = fileURLToPath(new URL("..", import.meta.url));
const outDir = new URL("../public/banners/", import.meta.url);

const { module } = await runnerImport(fileURLToPath(new URL("./banners.tsx", import.meta.url)), {
  root,
  configFile: false,
});

await mkdir(outDir, { recursive: true });
for (const width of module.BANNER_WIDTHS) {
  const png = await module.renderTokyo(width);
  await writeFile(new URL(`tokyo-${width}.png`, outDir), Buffer.from(png));
  console.log(`banners: tokyo-${width}.png (${Math.round(png.byteLength / 1024)} KB)`);
}
