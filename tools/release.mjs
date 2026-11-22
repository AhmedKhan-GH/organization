// Releases Sternbild design or docs packages locally:
//   npm run release -- <design|docs> <version>
//
// Updates the source version if needed, regenerates and checks tokens, runs all package tests,
// commits managed release files when changed, and creates a local Git tag (<kind>-v<version>).
// Does not push to any remote.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildEnv, runCapture, runChecked } from "./lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");
const env = buildEnv(repoRoot);

function usage() {
  console.error("Usage: npm run release -- <design|docs> <X.Y.Z>");
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length !== 2) usage();
const [kind, version] = args;

if (kind !== "design" && kind !== "docs") {
  console.error(`Invalid release kind "${kind}". Expected "design" or "docs".`);
  process.exit(1);
}
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`Invalid semantic version "${version}". Expected X.Y.Z.`);
  process.exit(1);
}

const major = version.split(".")[0];
const tag = `${kind}-v${version}`;

const tagCheck = runCapture("git", ["rev-parse", "--verify", "--quiet", `refs/tags/${tag}`], {
  cwd: repoRoot,
  env,
});
if (tagCheck.status === 0) {
  console.error(`Git tag "${tag}" already exists locally.`);
  process.exit(1);
}

const managedFiles = kind === "design"
  ? [
      "design/tokens.json",
      `public/design/v${major}/sternbild.css`,
      `public/design/v${major}/tokens.json`,
      `public/design/${version}/sternbild.css`,
      `public/design/${version}/tokens.json`,
      "lib/tokens.ts",
      "packages/sternbild-tokens/Cargo.toml",
      "packages/sternbild-tokens/src/tokens.rs",
      "packages/sternbild-tokens-c/CMakeLists.txt",
      "packages/sternbild-tokens-c/include/sternbild_tokens.h",
    ]
  : [
      "packages/sternbild-docs/pyproject.toml",
      "packages/sternbild-docs/sternbild_docs/__init__.py",
    ];

const managedSet = new Set(managedFiles);

const statusRes = runCapture("git", ["status", "--porcelain", "--untracked-files=no"], {
  cwd: repoRoot,
  env,
});
if (statusRes.status !== 0) {
  console.error(`git status failed: ${statusRes.stderr}`);
  process.exit(1);
}

const unrelatedChanges = statusRes.stdout
  .split("\n")
  .map(line => line.trimEnd())
  .filter(Boolean)
  .map(line => line.slice(3).trim())
  .filter(file => !managedSet.has(file));

if (unrelatedChanges.length > 0) {
  console.error(
    `Refusing to release with uncommitted changes in unrelated tracked files:\n  - ${unrelatedChanges.join("\n  - ")}`,
  );
  process.exit(1);
}

function updateDesignVersion() {
  const tokensPath = join(repoRoot, "design", "tokens.json");
  const raw = readFileSync(tokensPath, "utf8");
  const parsed = JSON.parse(raw);
  const current = parsed.$extensions?.["org.sternbild"]?.version;
  if (current === version) {
    console.log(`design/tokens.json is already at version ${version} (left unchanged).`);
    return;
  }
  const pattern = /("org\.sternbild"\s*:\s*\{[^}]*"version"\s*:\s*")([^"]+)(")/;
  if (!pattern.test(raw)) {
    throw new Error("Could not locate $extensions[\"org.sternbild\"].version in design/tokens.json");
  }
  const updated = raw.replace(pattern, `$1${version}$3`);
  writeFileSync(tokensPath, updated, "utf8");
  console.log(`Updated design/tokens.json version from ${current} to ${version}.`);
}

function updateDocsVersion() {
  const pyprojectPath = join(repoRoot, "packages", "sternbild-docs", "pyproject.toml");
  const rawToml = readFileSync(pyprojectPath, "utf8");
  const tomlPattern = /(\[project\][\s\S]*?\nversion\s*=\s*")([^"]+)(")/;
  const tomlMatch = tomlPattern.exec(rawToml);
  if (!tomlMatch) {
    throw new Error("Could not locate [project] version in packages/sternbild-docs/pyproject.toml");
  }
  if (tomlMatch[2] !== version) {
    writeFileSync(pyprojectPath, rawToml.replace(tomlPattern, `$1${version}$3`), "utf8");
    console.log(`Updated packages/sternbild-docs/pyproject.toml version from ${tomlMatch[2]} to ${version}.`);
  } else {
    console.log(`packages/sternbild-docs/pyproject.toml is already at version ${version}.`);
  }

  const initPath = join(repoRoot, "packages", "sternbild-docs", "sternbild_docs", "__init__.py");
  if (existsSync(initPath)) {
    const rawInit = readFileSync(initPath, "utf8");
    const initPattern = /(__version__\s*=\s*")([^"]+)(")/;
    const initMatch = initPattern.exec(rawInit);
    if (initMatch && initMatch[2] !== version) {
      writeFileSync(initPath, rawInit.replace(initPattern, `$1${version}$3`), "utf8");
      console.log(`Updated sternbild_docs/__init__.py version from ${initMatch[2]} to ${version}.`);
    }
  }
}

if (kind === "design") {
  updateDesignVersion();
} else {
  updateDocsVersion();
}

console.log("Running token build and check...");
runChecked("npm", ["run", "tokens"], { cwd: repoRoot, env });
runChecked("npm", ["run", "tokens:check"], { cwd: repoRoot, env });

console.log("Running package test suites...");
runChecked(process.execPath, [join(repoRoot, "tools", "test-packages.mjs")], {
  cwd: repoRoot,
  env,
});

const pathsToStage = managedFiles.filter(rel => existsSync(join(repoRoot, rel)));
if (pathsToStage.length > 0) {
  runChecked("git", ["add", "--", ...pathsToStage], { cwd: repoRoot, env });
}

const stagedDiff = runCapture("git", ["diff", "--cached", "--quiet"], { cwd: repoRoot, env });
let committed = false;
if (stagedDiff.status !== 0) {
  runChecked("git", ["commit", "-m", `Release Sternbild ${kind} ${version}`], { cwd: repoRoot, env });
  committed = true;
} else {
  console.log(`Working tree already matches ${kind} ${version}; skipping empty commit.`);
}

runChecked("git", ["tag", tag], { cwd: repoRoot, env });
const headSha = runCapture("git", ["rev-parse", "HEAD"], { cwd: repoRoot, env }).stdout.trim();

console.log("");
console.log("Release complete (local only, not pushed):");
console.log(`  Kind:   ${kind}`);
console.log(`  Tag:    ${tag}`);
console.log(`  Commit: ${headSha}${committed ? " (new commit)" : " (existing HEAD)"}`);
