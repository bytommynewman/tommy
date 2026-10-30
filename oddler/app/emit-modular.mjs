#!/usr/bin/env node
// Emit the rules as one module plus one small module per bank piece
// (modular/logic.js + modular/banks/*.js). The host's deploy scanner reviews
// files one at a time, so keeping each bank in its own file keeps every file
// small enough to review. Run after build-logic.sh has passed.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "modular");
rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, "banks"), { recursive: true });
const pieces = readdirSync(here).filter((f) => /^1\d-bank.*\.js$/.test(f)).sort();
const imports = [];
const names = [];
for (const f of pieces) {
  const src = readFileSync(join(here, f), "utf8");
  const body = src.replace(/BANKS\.push\(/, "export default [").replace(/\n\);\s*$/, "\n];\n");
  if (!body.includes("export default [")) throw new Error("unexpected shape in " + f);
  writeFileSync(join(out, "banks", f), body);
  const v = "bank_" + f.replace(/\.js$/, "").replace(/[^a-z0-9]/gi, "_");
  imports.push(`import ${v} from "./banks/${f}";`);
  names.push(v);
}
let header = readFileSync(join(here, "00-header.js"), "utf8");
const decl = "export const BANKS = [];";
if (!header.includes(decl)) throw new Error("BANKS declaration not found in header");
header = header.replace(decl, `${imports.join("\n")}\nexport const BANKS = [].concat(${names.join(", ")});`);
const rules = readFileSync(join(here, "20-rules.js"), "utf8");
writeFileSync(join(out, "logic.js"), header + rules);
console.log("modular:", pieces.length, "bank modules");
