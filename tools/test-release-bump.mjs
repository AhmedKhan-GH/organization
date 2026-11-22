// End-to-end verification of tools/release.mjs and tools/bump.mjs on isolated Git clones.
// Never touches real downstream repositories or /tmp.

import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildEnv, runCapture, runChecked } from "./lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");
const env = buildEnv(repoRoot);

const scratchBase = env.STERNBILD_TEST_CLONES_DIR
  ? resolve(env.STERNBILD_TEST_CLONES_DIR)
  : join(repoRoot, ".cache", "test-release-bump");

rmSync(scratchBase, { recursive: true, force: true });
mkdirSync(scratchBase, { recursive: true });

const gitIdentity = [
  "-c",
  "user.name=Sternbild Test",
  "-c",
  "user.email=test@sternbild.invalid",
];

function createWorkingTreeClone(dest) {
  // Clone committed history, then overlay current working tree files so tests work both before and after commit.
  runChecked("git", ["clone", "-q", repoRoot, dest], { env });
  const copyItems = [
    "design",
    "lib/tokens.ts",
    "packages/sternbild-docs",
    "packages/sternbild-tokens",
    "packages/sternbild-tokens-c",
    "scripts",
    "tools",
    "package.json",
    ".gitignore",
  ];
  for (const rel of copyItems) {
    const src = join(repoRoot, rel);
    const dst = join(dest, rel);
    if (!existsSync(src)) continue;
    rmSync(dst, { recursive: true, force: true });
    mkdirSync(dirname(dst), { recursive: true });
    cpSync(src, dst, {
      recursive: true,
      filter: p => !p.includes("/target") && !p.endsWith("/Cargo.lock") && !p.includes("__pycache__") && !p.includes(".pytest_cache"),
    });
  }
  if (existsSync(join(repoRoot, "node_modules"))) {
    // Reuse node_modules via symlink so npm scripts inside the clone need no network install.
    runChecked("ln", ["-s", join(repoRoot, "node_modules"), join(dest, "node_modules")], { env });
  }
  runChecked("git", ["add", "-A"], { cwd: dest, env });
  const diff = runCapture("git", ["diff", "--cached", "--quiet"], { cwd: dest, env });
  if (diff.status !== 0) {
    runChecked("git", [...gitIdentity, "commit", "-q", "-m", "Overlay working tree for isolated test"], {
      cwd: dest,
      env,
    });
  }
  runChecked("git", ["config", "user.name", "Sternbild Test"], { cwd: dest, env });
  runChecked("git", ["config", "user.email", "test@sternbild.invalid"], { cwd: dest, env });
}

console.log("=== 1/3: Testing release.mjs (design 1.1.0 -> 1.1.1) on isolated clone ===");
const orgClone = join(scratchBase, "organization-clone");
createWorkingTreeClone(orgClone);

const releaseEnv = {
  ...env,
  STERNBILD_SCRATCH_DIR: join(scratchBase, "release-scratch"),
  CARGO_TARGET_DIR: join(scratchBase, "cargo-target"),
};

runChecked(process.execPath, [join(orgClone, "tools", "release.mjs"), "design", "1.1.1"], {
  cwd: orgClone,
  env: releaseEnv,
});

// Verify version bump, generated files, commit, and tag design-v1.1.1 on the clone.
const bumpedTokens = JSON.parse(readFileSync(join(orgClone, "design", "tokens.json"), "utf8"));
assert.equal(bumpedTokens.$extensions["org.sternbild"].version, "1.1.1");
assert.ok(existsSync(join(orgClone, "public", "design", "1.1.1", "sternbild.css")));
assert.ok(existsSync(join(orgClone, "public", "design", "1.1.1", "tokens.json")));
assert.ok(readFileSync(join(orgClone, "packages", "sternbild-tokens", "Cargo.toml"), "utf8").includes('version = "1.1.1"'));
assert.ok(readFileSync(join(orgClone, "packages", "sternbild-tokens", "src", "tokens.rs"), "utf8").includes('pub const VERSION: &str = "1.1.1";'));
assert.ok(readFileSync(join(orgClone, "packages", "sternbild-tokens-c", "CMakeLists.txt"), "utf8").includes("project(sternbild-tokens VERSION 1.1.1 LANGUAGES NONE)"));
assert.ok(readFileSync(join(orgClone, "packages", "sternbild-tokens-c", "include", "sternbild_tokens.h"), "utf8").includes('#define STERNBILD_TOKENS_VERSION "1.1.1"'));

const tagSha = runCapture("git", ["rev-parse", "refs/tags/design-v1.1.1"], { cwd: orgClone, env }).stdout.trim();
const headSha = runCapture("git", ["rev-parse", "HEAD"], { cwd: orgClone, env }).stdout.trim();
assert.equal(tagSha, headSha, "design-v1.1.1 tag should point at clone HEAD");
const commitMsg = runCapture("git", ["log", "-1", "--pretty=%B"], { cwd: orgClone, env }).stdout.trim();
assert.equal(commitMsg, "Release Sternbild design 1.1.1");
const cloneStatus = runCapture("git", ["status", "--porcelain"], { cwd: orgClone, env }).stdout.trim();
assert.equal(cloneStatus, "", `Clone working tree should be clean, got:\n${cloneStatus}`);

// Verify design/build.mjs --check detects drift in native packages.
const origCargo = readFileSync(join(orgClone, "packages", "sternbild-tokens", "Cargo.toml"), "utf8");
writeFileSync(
  join(orgClone, "packages", "sternbild-tokens", "Cargo.toml"),
  origCargo.replace('version = "1.1.1"', 'version = "0.0.0"'),
  "utf8",
);
const driftCheck = runCapture(process.execPath, [join(orgClone, "design", "build.mjs"), "--check"], {
  cwd: orgClone,
  env: releaseEnv,
});
assert.notEqual(driftCheck.status, 0, "design/build.mjs --check should fail when Cargo.toml version drifts");
writeFileSync(join(orgClone, "packages", "sternbild-tokens", "Cargo.toml"), origCargo, "utf8");
console.log("release.mjs design clone test passed (design-v1.1.1) and --check drift detection verified.");

console.log("\n=== 2/3: Testing release.mjs (docs 1.0.0 -> 1.0.1) on isolated clone ===");
runChecked(process.execPath, [join(orgClone, "tools", "release.mjs"), "docs", "1.0.1"], {
  cwd: orgClone,
  env: releaseEnv,
});
assert.ok(readFileSync(join(orgClone, "packages", "sternbild-docs", "pyproject.toml"), "utf8").includes('version = "1.0.1"'));
assert.ok(readFileSync(join(orgClone, "packages", "sternbild-docs", "sternbild_docs", "__init__.py"), "utf8").includes('__version__ = "1.0.1"'));
const docsTagSha = runCapture("git", ["rev-parse", "refs/tags/docs-v1.0.1"], { cwd: orgClone, env }).stdout.trim();
const docsHeadSha = runCapture("git", ["rev-parse", "HEAD"], { cwd: orgClone, env }).stdout.trim();
assert.equal(docsTagSha, docsHeadSha, "docs-v1.0.1 tag should point at clone HEAD");
assert.equal(runCapture("git", ["status", "--porcelain"], { cwd: orgClone, env }).stdout.trim(), "");
console.log("release.mjs docs clone test passed (docs-v1.0.1).");

console.log("\n=== 3/3: Testing bump.mjs on mock switched project + print-only Caliper entry ===");
const mockApp = join(scratchBase, "mock-rust-app");
mkdirSync(join(mockApp, "src"), { recursive: true });
writeFileSync(
  join(mockApp, "Cargo.toml"),
  [
    "[package]",
    'name = "mock-rust-app"',
    'version = "0.1.0"',
    'edition = "2024"',
    "",
    "[dependencies]",
    `sternbild-tokens = { git = "file://${orgClone}", tag = "design-v1.1.0" }`,
    "",
  ].join("\n"),
  "utf8",
);
// Tag the pre-bump commit in orgClone as design-v1.1.0 so before-capture compiles against 1.1.0!
const parentSha = runCapture("git", ["rev-parse", "design-v1.1.1~1"], { cwd: orgClone, env }).stdout.trim();
runChecked("git", ["tag", "design-v1.1.0", parentSha], { cwd: orgClone, env });

writeFileSync(
  join(mockApp, "src", "main.rs"),
  [
    "fn main() {",
    '    println!("version={} surface={}", sternbild_tokens::VERSION, sternbild_tokens::role::SURFACE.hex);',
    "}",
    "",
    "#[cfg(test)]",
    "mod tests {",
    "    #[test]",
    "    fn capture_version_fixture() {",
    '        if let Ok(dir) = std::env::var("CAPTURE_DIR") {',
    '            let out = std::path::Path::new(&dir).join("version.txt");',
    '            std::fs::write(out, format!("{}\\n", sternbild_tokens::VERSION)).unwrap();',
    "        }",
    '        assert_eq!(sternbild_tokens::role::SURFACE.hex, "#201f1c");',
    "    }",
    "}",
    "",
  ].join("\n"),
  "utf8",
);

runChecked("git", ["init", "-q"], { cwd: mockApp, env });
runChecked("git", ["config", "user.name", "Sternbild Test"], { cwd: mockApp, env });
runChecked("git", ["config", "user.email", "test@sternbild.invalid"], { cwd: mockApp, env });
// Generate initial Cargo.lock so before state is committed cleanly.
runChecked("nice", ["-n", "10", "cargo", "test", "-j", "8"], { cwd: mockApp, env: releaseEnv });
runChecked("git", ["add", "Cargo.toml", "Cargo.lock", "src/main.rs"], { cwd: mockApp, env });
runChecked("git", ["commit", "-q", "-m", "Initial mock app pinned to design-v1.1.0"], { cwd: mockApp, env });

const mockProjectsPath = join(scratchBase, "projects.json");
const captureRoot = join(scratchBase, "captures");
const escapedOrgClone = orgClone.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

writeFileSync(
  mockProjectsPath,
  JSON.stringify(
    {
      projects: [
        {
          id: "mock-app",
          name: "Mock App",
          path: mockApp,
          switched: true,
          targets: {
            design: {
              file: "Cargo.toml",
              matchPattern: `file://${escapedOrgClone}"[^\\n]*tag\\s*=\\s*"design-v[0-9]+\\.[0-9]+\\.[0-9]+"`,
              replacePattern: 'tag\\s*=\\s*"design-v[0-9]+\\.[0-9]+\\.[0-9]+"',
              replaceWith: 'tag = "design-v${version}"',
              lockFiles: ["Cargo.lock"],
              checkCommand: "nice -n 10 cargo test -j 8",
              captureCommand: "nice -n 10 cargo test -j 8 capture_version_fixture",
            },
          },
        },
        {
          id: "caliper",
          name: "Caliper",
          path: join(scratchBase, "unswitched-caliper"),
          switched: false,
          targets: {
            design: {
              file: "CMakeLists.txt",
              description: "FetchContent sternbild-tokens pin using SOURCE_SUBDIR packages/sternbild-tokens-c",
              plannedPin:
                "FetchContent_Declare(sternbild-tokens GIT_REPOSITORY https://github.com/sternbild/organization.git GIT_TAG design-v${version} SOURCE_SUBDIR packages/sternbild-tokens-c)",
            },
          },
        },
      ],
    },
    null,
    2,
  ),
  "utf8",
);

const bumpRes = runCapture(
  process.execPath,
  [
    join(repoRoot, "tools", "bump.mjs"),
    "design",
    "1.1.1",
    "--projects",
    mockProjectsPath,
    "--capture-root",
    captureRoot,
  ],
  { cwd: repoRoot, env: releaseEnv },
);
assert.equal(bumpRes.status, 0, `bump.mjs failed:\n${bumpRes.stdout}\n${bumpRes.stderr}`);

const branch = runCapture("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: mockApp, env }).stdout.trim();
assert.equal(branch, "sternbild-design-1.1.1");
const cargoAfter = readFileSync(join(mockApp, "Cargo.toml"), "utf8");
assert.ok(cargoAfter.includes('tag = "design-v1.1.1"'));
const beforeCapture = readFileSync(join(captureRoot, "mock-app-design-1.1.1", "before", "version.txt"), "utf8").trim();
const afterCapture = readFileSync(join(captureRoot, "mock-app-design-1.1.1", "after", "version.txt"), "utf8").trim();
assert.equal(beforeCapture, "1.1.0");
assert.equal(afterCapture, "1.1.1");
assert.ok(bumpRes.stdout.includes("print-only (switched: false; repository untouched)"));
assert.ok(bumpRes.stdout.includes("GIT_TAG design-v1.1.1"));
assert.equal(runCapture("git", ["status", "--porcelain"], { cwd: mockApp, env }).stdout.trim(), "");

console.log(bumpRes.stdout.trim());
console.log("\nrelease.mjs and bump.mjs isolated clone tests passed.");
