// Copies canonical brand assets from packages/sternbild-docs/sternbild_docs/assets/brand into public/assets.
// Plain Node (18 or later) with no external dependencies.

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const sourceRoot = join(root, "packages", "sternbild-docs", "sternbild_docs", "assets", "brand");
const targetRoot = join(root, "public", "assets");

if (!existsSync(sourceRoot)) {
  throw new Error(`Brand asset source directory is missing: ${relative(root, sourceRoot)}`);
}

let total = 0;
let copied = 0;

function syncDirectory(sourceDir, targetDir) {
  mkdirSync(targetDir, { recursive: true });
  const entries = readdirSync(sourceDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const sourcePath = join(sourceDir, entry.name);
    const targetPath = join(targetDir, entry.name);
    if (entry.isDirectory()) {
      syncDirectory(sourcePath, targetPath);
      continue;
    }
    if (!entry.isFile()) continue;
    total += 1;
    const same = existsSync(targetPath) && readFileSync(sourcePath).equals(readFileSync(targetPath));
    if (!same) {
      copyFileSync(sourcePath, targetPath);
      copied += 1;
    }
  }
}

syncDirectory(sourceRoot, targetRoot);

if (total === 0) {
  throw new Error(`No brand assets found in ${relative(root, sourceRoot)}`);
}

console.log(
  `Brand assets synced to ${relative(root, targetRoot)} (${total} files, ${copied} updated).`,
);
