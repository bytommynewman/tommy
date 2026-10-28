// Bundle the Worker (entry + room + rules) with esbuild and stage the client files.
import { build } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(app, "dist");
await rm(dist, { recursive: true, force: true });
await mkdir(resolve(dist, "worker"), { recursive: true });
await build({ entryPoints: [resolve(app, "src/worker.ts")], outfile: resolve(dist, "worker/index.js"), bundle: true, format: "esm", target: "es2022", platform: "browser", external: ["cloudflare:workers"], minify: false });
await cp(resolve(app, "public"), resolve(dist, "client"), { recursive: true });
console.log("built dist/worker/index.js + dist/client/");
