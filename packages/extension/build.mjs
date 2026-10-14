import esbuild from "esbuild";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function buildExtension() {
  console.log("[ThreatLens] Building Chrome Extension bundle with esbuild...");

  // 1. Background service worker (ESM)
  await esbuild.build({
    entryPoints: [resolve(__dirname, "src/background.ts")],
    outfile: resolve(__dirname, "dist/background.js"),
    bundle: true,
    format: "esm",
    target: "es2022",
    sourcemap: true
  });

  // 2. Content script (IIFE for standalone execution in page context)
  await esbuild.build({
    entryPoints: [resolve(__dirname, "src/content.ts")],
    outfile: resolve(__dirname, "dist/content.js"),
    bundle: true,
    format: "iife",
    target: "es2022",
    sourcemap: true
  });

  // 3. Side panel script (ESM)
  await esbuild.build({
    entryPoints: [resolve(__dirname, "src/sidepanel.ts")],
    outfile: resolve(__dirname, "dist/sidepanel.js"),
    bundle: true,
    format: "esm",
    target: "es2022",
    sourcemap: true
  });

  console.log("[ThreatLens] Chrome Extension build complete in packages/extension/dist");
}

buildExtension().catch(err => {
  console.error("[ThreatLens] Extension build error:", err);
  process.exit(1);
});
