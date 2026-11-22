// Runs tests for all shared Sternbild packages:
//   1. packages/sternbild-tokens (Rust cargo test)
//   2. packages/sternbild-tokens-c (CMake FetchContent C11 + C++20 consumer tests)
//   3. packages/sternbild-docs (pytest + strict sample MkDocs build)

import { mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildEnv, resolvePytest, runChecked } from "./lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");
const env = buildEnv(repoRoot);

const scratchRoot = env.STERNBILD_SCRATCH_DIR
  ? resolve(env.STERNBILD_SCRATCH_DIR)
  : join(repoRoot, ".cache");
const pytestBaseTemp = join(scratchRoot, "pytest-basetemp");

console.log("=== 1/3: Testing packages/sternbild-tokens (Rust) ===");
runChecked(
  "nice",
  [
    "-n",
    "10",
    "cargo",
    "test",
    "-j",
    "8",
    "--manifest-path",
    join(repoRoot, "packages", "sternbild-tokens", "Cargo.toml"),
  ],
  { cwd: repoRoot, env },
);

console.log("\n=== 2/3: Testing packages/sternbild-tokens-c (CMake) ===");
runChecked(process.execPath, [join(repoRoot, "tools", "test-tokens-c.mjs")], {
  cwd: repoRoot,
  env,
});

console.log("\n=== 3/3: Testing packages/sternbild-docs (Python + MkDocs) ===");
rmSync(pytestBaseTemp, { recursive: true, force: true });
mkdirSync(pytestBaseTemp, { recursive: true });
const { cmd: pytestCmd, prefixArgs } = resolvePytest(repoRoot, env);
const docsPkgPath = join(repoRoot, "packages", "sternbild-docs");
const pythonPath = env.PYTHONPATH ? `${docsPkgPath}:${env.PYTHONPATH}` : docsPkgPath;
const pytestEnv = { ...env, PYTHONPATH: pythonPath };

runChecked(
  pytestCmd,
  [
    ...prefixArgs,
    `--basetemp=${pytestBaseTemp}`,
    join(repoRoot, "packages", "sternbild-docs", "tests"),
  ],
  { cwd: repoRoot, env: pytestEnv },
);

console.log("\nAll Sternbild package tests passed.");
