// DealSleuth entry hand-in (Node 22, standard library only).
//
// What this program does, every time it runs, in the same order:
//   1. Wipes the output directory and recreates it, so a stale file from
//      an earlier run can never leak into the hand-in.
//   2. Copies this repository's app/ (the static deal-finder site) and
//      screenshots/ (real browser renders of that site) into it.
//   3. Writes dossier.json with buildDossier from the vendored make.fun
//      library — the summary the judge reads: the screenshots, the first
//      load's files and bytes, and the site's source.
//
// Nothing here touches the network, the clock or a random number, so two
// runs write byte-identical output. Outside the grader, MAKEFUN_OUTPUT_DIR
// stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-frontend.ts";

// The scorer's caps from the bounty gate: the dossier text is capped at
// 160 KiB; at most 4 screenshots, each at most 256 KiB; app/ at most 993
// files and directories and 16 MiB. Only text_max_bytes shapes the bytes;
// the other caps refuse an entry the scorer would refuse.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 16777216,
};

const entryRoot = fileURLToPath(new URL(".", import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

function fail(message: string): never {
  console.error("main.ts: " + message);
  process.exit(1);
}

function copyTree(source: string, target: string): void {
  if (!existsSync(source)) fail("missing directory: " + source);
  cpSync(source, target, { recursive: true });
}

const appDir = join(entryRoot, "app");
const shotsDir = join(entryRoot, "screenshots");

if (!existsSync(join(appDir, "index.html"))) {
  fail("app/index.html is missing — the site has no entry page");
}

// A fresh output directory every run: identical input, identical output.
// Wipe the directory's contents, never the directory itself: the grader
// mounts /output as a writable directory under a read-only parent, so
// removing /output itself fails with EACCES and the run exits 1.
mkdirSync(outputDir, { recursive: true });
for (const name of readdirSync(outputDir)) {
  rmSync(join(outputDir, name), { recursive: true, force: true });
}

copyTree(appDir, join(outputDir, "app"));
copyTree(shotsDir, join(outputDir, "screenshots"));

const dossier = buildDossier(outputDir, DOSSIER_CAPS);
writeFileSync(join(outputDir, "dossier.json"), dossier);

console.log(
  "DealSleuth hand-in written to " +
    outputDir +
    " (dossier.json " +
    dossier.length +
    " bytes)",
);
