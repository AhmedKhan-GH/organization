// Builds and executes the CMake FetchContent consumer tests for packages/sternbild-tokens-c.
// Plain Node (18 or later) with no external dependencies.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildEnv, findCmakeTools, runCapture, runChecked } from "./lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");
const env = buildEnv(repoRoot);
const { cmake, ctest } = findCmakeTools(env);

const scratchBase = env.STERNBILD_SCRATCH_DIR
  ? join(resolve(env.STERNBILD_SCRATCH_DIR), "test-tokens-c")
  : join(repoRoot, ".cache", "test-tokens-c");

rmSync(scratchBase, { recursive: true, force: true });
mkdirSync(scratchBase, { recursive: true });

function prepareGitSource() {
  const headCheck = runCapture("git", ["rev-parse", "--verify", "HEAD"], { cwd: repoRoot, env });
  const dirtyPaths = [
    "packages/sternbild-tokens-c",
    "packages/sternbild-docs/sternbild_docs/assets/brand",
    "public/assets",
  ];
  const statusCheck = runCapture("git", ["status", "--porcelain", "--", ...dirtyPaths], { cwd: repoRoot, env });
  const isCleanCommitted = headCheck.status === 0 && statusCheck.status === 0 && statusCheck.stdout.trim() === "";

  if (isCleanCommitted) {
    return { gitRepo: repoRoot, gitTag: headCheck.stdout.trim() };
  }

  // Create a local Git snapshot inside scratchBase so FetchContent tests uncommitted working tree changes.
  const snapshotRepo = join(scratchBase, "repo-snapshot");
  mkdirSync(join(snapshotRepo, "packages"), { recursive: true });
  cpSync(
    join(repoRoot, "packages", "sternbild-tokens-c"),
    join(snapshotRepo, "packages", "sternbild-tokens-c"),
    { recursive: true },
  );
  mkdirSync(join(snapshotRepo, "packages", "sternbild-docs", "sternbild_docs", "assets"), { recursive: true });
  cpSync(
    join(repoRoot, "packages", "sternbild-docs", "sternbild_docs", "assets", "brand"),
    join(snapshotRepo, "packages", "sternbild-docs", "sternbild_docs", "assets", "brand"),
    { recursive: true },
  );

  const srcAssets = join(repoRoot, "public", "assets");
  const dstAssets = join(snapshotRepo, "public", "assets");
  mkdirSync(dstAssets, { recursive: true });
  for (const name of readdirSync(srcAssets)) {
    if (/-icon-minerals-\d+\.png$/.test(name)) {
      cpSync(join(srcAssets, name), join(dstAssets, name));
    }
  }

  runChecked("git", ["init", "-q"], { cwd: snapshotRepo, env });
  runChecked("git", ["add", "-A"], { cwd: snapshotRepo, env });
  runChecked(
    "git",
    [
      "-c",
      "user.name=Sternbild Test",
      "-c",
      "user.email=test@sternbild.invalid",
      "commit",
      "-q",
      "-m",
      "Snapshot working tree for CMake test",
    ],
    { cwd: snapshotRepo, env },
  );
  const sha = runCapture("git", ["rev-parse", "HEAD"], { cwd: snapshotRepo, env }).stdout.trim();
  return { gitRepo: snapshotRepo, gitTag: sha };
}

const { gitRepo, gitTag } = prepareGitSource();
const sourceDir = join(repoRoot, "packages", "sternbild-tokens-c", "tests");
const buildDir = join(scratchBase, "build");

if (!existsSync(join(sourceDir, "CMakeLists.txt"))) {
  throw new Error(`Missing CMake consumer test directory: ${sourceDir}`);
}

console.log(`Configuring sternbild-tokens-c consumer tests (${gitTag.slice(0, 12)})...`);
runChecked(
  cmake,
  [
    "-S",
    sourceDir,
    "-B",
    buildDir,
    `-DSTERNBILD_TOKENS_GIT_REPO=${gitRepo}`,
    `-DSTERNBILD_TOKENS_GIT_TAG=${gitTag}`,
  ],
  { cwd: repoRoot, env },
);

console.log("Building sternbild-tokens-c consumer tests...");
runChecked(cmake, ["--build", buildDir, "--parallel", "8"], { cwd: repoRoot, env });

console.log("Running sternbild-tokens-c consumer tests...");
runChecked(ctest, ["--test-dir", buildDir, "--output-on-failure"], { cwd: repoRoot, env });

console.log("sternbild-tokens-c consumer tests passed.");
