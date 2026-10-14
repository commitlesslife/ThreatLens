import esbuild from "esbuild";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outdir = path.resolve(__dirname, "dist");
if (!fs.existsSync(outdir)) {
  fs.mkdirSync(outdir, { recursive: true });
}

console.log("[ThreatLens] Building Web App bundle with esbuild...");

await esbuild.build({
  entryPoints: [path.resolve(__dirname, "src/app.ts")],
  bundle: true,
  format: "esm",
  target: "es2022",
  outfile: path.resolve(__dirname, "dist/app.js"),
  sourcemap: true,
  minify: false
});

console.log("[ThreatLens] Web App bundle built successfully in packages/web/dist/app.js");
