// Shared helpers for Sternbild package tests, release, and project bump scripts.
// Plain Node (18 or later) with no external dependencies.

import { existsSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

const HOME = homedir();

export const EXTRA_PATH_ENTRIES = [
  "/opt/homebrew/bin",
  "/opt/homebrew/opt/rustup/bin",
  "/usr/local/bin",
  join(HOME, ".cargo", "bin"),
  join(HOME, ".local", "bin"),
];

export const SHARED_DOCS_VENV_BIN = join(HOME, ".worktrees", "astrolabe", "scratch", "shared-docs", "venv-pkg", "bin");

export function isSystemTmp(dirPath) {
  if (!dirPath) return true;
  const normalized = resolve(dirPath);
  return (
    normalized === "/tmp" ||
    normalized.startsWith("/tmp/") ||
    normalized === "/private/tmp" ||
    normalized.startsWith("/private/tmp/")
  );
}

export function ensureTmpDir(repoRoot) {
  const candidate = !isSystemTmp(process.env.TMPDIR)
    ? resolve(process.env.TMPDIR)
    : join(repoRoot, ".cache", "tmp");
  mkdirSync(candidate, { recursive: true });
  return candidate;
}

export function buildEnv(repoRoot, extra = {}) {
  const tmpDir = ensureTmpDir(repoRoot);
  const currentPath = extra.PATH ?? process.env.PATH ?? "";
  const parts = [...EXTRA_PATH_ENTRIES, ...currentPath.split(":").filter(Boolean)];
  const dedupedPath = [...new Set(parts)].join(":");
  return {
    ...process.env,
    ...extra,
    PATH: dedupedPath,
    TMPDIR: tmpDir,
    TEMP: tmpDir,
    TMP: tmpDir,
  };
}

export function runCapture(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    encoding: "utf8",
    stdio: "pipe",
    ...opts,
  });
}

export function runChecked(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    ...opts,
  });
  if (result.error) {
    throw new Error(`Failed to execute ${cmd}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`Command failed (${result.status}): ${cmd} ${args.join(" ")}`);
  }
  return result;
}

export function runShellChecked(command, opts = {}) {
  const result = spawnSync("/bin/sh", ["-c", command], {
    stdio: "inherit",
    ...opts,
  });
  if (result.error) {
    throw new Error(`Failed to execute shell command: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`Shell command failed (${result.status}): ${command}`);
  }
  return result;
}

export function findExecutable(name, env, fallbackPaths = []) {
  const pathEntries = (env.PATH ?? "").split(":").filter(Boolean);
  for (const dir of pathEntries) {
    const candidate = join(dir, name);
    if (existsSync(candidate)) return candidate;
  }
  for (const candidate of fallbackPaths) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

export function findCmakeTools(env) {
  const cmakeCandidates = [
    env.CMAKE,
    "/opt/homebrew/bin/cmake",
    "/usr/local/bin/cmake",
    join(HOME, "Applications", "CLion.app", "Contents", "bin", "cmake", "mac", "aarch64", "bin", "cmake"),
    "/Applications/CLion.app/Contents/bin/cmake/mac/aarch64/bin/cmake",
    join(HOME, "Applications", "CLion.app", "Contents", "bin", "cmake", "mac", "universal", "bin", "cmake"),
    "/Applications/CLion.app/Contents/bin/cmake/mac/universal/bin/cmake",
  ].filter(Boolean);

  const cmake = findExecutable("cmake", env, cmakeCandidates);
  if (!cmake) {
    throw new Error("Could not find cmake. Set CMAKE or install cmake on PATH.");
  }
  const siblingCtest = join(dirname(cmake), "ctest");
  const ctest = existsSync(siblingCtest) ? siblingCtest : findExecutable("ctest", env, []);
  if (!ctest) {
    throw new Error("Could not find ctest alongside cmake or on PATH.");
  }
  return { cmake, ctest };
}

export function resolvePytest(repoRoot, env) {
  if (env.STERNBILD_DOCS_PYTHON) {
    return { cmd: env.STERNBILD_DOCS_PYTHON, prefixArgs: ["-m", "pytest"] };
  }
  const localVenvPytest = join(repoRoot, ".venv", "bin", "pytest");
  if (existsSync(localVenvPytest)) {
    return { cmd: localVenvPytest, prefixArgs: [] };
  }
  const sharedVenvPytest = join(SHARED_DOCS_VENV_BIN, "pytest");
  if (existsSync(sharedVenvPytest)) {
    return { cmd: sharedVenvPytest, prefixArgs: [] };
  }
  const pathPytest = findExecutable("pytest", env);
  if (pathPytest) {
    return { cmd: pathPytest, prefixArgs: [] };
  }
  const uv = findExecutable("uv", env);
  if (uv) {
    return {
      cmd: uv,
      prefixArgs: ["run", "--with", "pytest", "--with", "hatchling", "--with", "./packages/sternbild-docs", "pytest"],
    };
  }
  throw new Error("Could not find pytest or uv to run sternbild-docs tests.");
}
