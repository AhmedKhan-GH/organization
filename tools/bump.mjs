// Bumps Sternbild design or docs pins across downstream projects listed in tools/projects.json.
//   npm run bump -- <design|docs> <version> [--projects <file>] [--capture-root <dir>]
//
// For each switched project:
//   1. Verifies a clean Git working tree.
//   2. Captures before output into <capture-root>/<id>-<kind>-<version>/before.
//   3. Creates branch sternbild-<kind>-<version> and updates the single pinned line.
//   4. Runs the project's build and check commands.
//   5. Captures after output into <capture-root>/<id>-<kind>-<version>/after and compares files.
//   6. Stages the changed file (and listed lock files if modified) and commits on the new branch.
//
// Unswitched projects ("switched": false) are never modified; their planned change is printed only.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildEnv, runCapture, runChecked, runShellChecked } from "./lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");
const env = buildEnv(repoRoot);

function parseArgs(argv) {
  const positional = [];
  let projectsFile = join(repoRoot, "tools", "projects.json");
  let captureRoot = env.STERNBILD_BUMP_CAPTURE_ROOT
    ? resolve(env.STERNBILD_BUMP_CAPTURE_ROOT)
    : join(repoRoot, ".cache", "bump-captures");

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--projects") {
      if (i + 1 >= argv.length) throw new Error("--projects requires a file path");
      projectsFile = resolve(argv[++i]);
    } else if (arg.startsWith("--projects=")) {
      projectsFile = resolve(arg.slice("--projects=".length));
    } else if (arg === "--capture-root") {
      if (i + 1 >= argv.length) throw new Error("--capture-root requires a directory path");
      captureRoot = resolve(argv[++i]);
    } else if (arg.startsWith("--capture-root=")) {
      captureRoot = resolve(arg.slice("--capture-root=".length));
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  if (positional.length !== 2) {
    throw new Error("Usage: npm run bump -- <design|docs> <X.Y.Z> [--projects <file>] [--capture-root <dir>]");
  }
  const [kind, version] = positional;
  if (kind !== "design" && kind !== "docs") {
    throw new Error(`Invalid kind "${kind}". Expected "design" or "docs".`);
  }
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`Invalid semantic version "${version}". Expected X.Y.Z.`);
  }
  return { kind, version, projectsFile, captureRoot };
}

function interpolate(template, version) {
  return template.replaceAll("${version}", version);
}

function snapshotFiles(rootDir) {
  const result = new Map();
  if (!existsSync(rootDir)) return result;

  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        const rel = relative(rootDir, full).split("\\").join("/");
        const buf = readFileSync(full);
        const sha256 = createHash("sha256").update(buf).digest("hex");
        result.set(rel, { size: statSync(full).size, sha256 });
      }
    }
  }

  walk(rootDir);
  return result;
}

function compareCaptures(beforeDir, afterDir) {
  const before = snapshotFiles(beforeDir);
  const after = snapshotFiles(afterDir);
  const unchanged = [];
  const changed = [];
  const added = [];
  const removed = [];

  for (const [rel, info] of before.entries()) {
    const next = after.get(rel);
    if (!next) {
      removed.push(rel);
    } else if (next.sha256 === info.sha256) {
      unchanged.push(rel);
    } else {
      changed.push(rel);
    }
  }
  for (const rel of after.keys()) {
    if (!before.has(rel)) added.push(rel);
  }

  return {
    beforeCount: before.size,
    afterCount: after.size,
    unchanged,
    changed,
    added,
    removed,
  };
}

function updateSinglePinnedLine(filePath, target, version) {
  const raw = readFileSync(filePath, "utf8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const lines = raw.split(/\r?\n/);
  const matchRe = new RegExp(target.matchPattern);
  const replaceRe = new RegExp(target.replacePattern);
  const replacement = interpolate(target.replaceWith, version);

  const matchingLines = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (matchRe.test(lines[i])) matchingLines.push(i);
  }

  if (matchingLines.length === 0) {
    throw new Error(`No line matched pattern ${target.matchPattern} in ${filePath}`);
  }
  if (matchingLines.length > 1) {
    throw new Error(
      `Expected exactly 1 matching line in ${filePath}, found ${matchingLines.length} (lines ${matchingLines.map(n => n + 1).join(", ")})`,
    );
  }

  const lineIndex = matchingLines[0];
  const oldLine = lines[lineIndex];
  if (!replaceRe.test(oldLine)) {
    throw new Error(`Matched line ${lineIndex + 1} in ${filePath} did not match replacePattern ${target.replacePattern}`);
  }
  const newLine = oldLine.replace(replaceRe, replacement);
  if (newLine === oldLine) {
    throw new Error(`Pinned line ${lineIndex + 1} in ${filePath} is already set to ${version}`);
  }

  lines[lineIndex] = newLine;
  writeFileSync(filePath, lines.join(eol), "utf8");
  return { lineNumber: lineIndex + 1, oldLine, newLine };
}

function bumpSwitchedProject(project, kind, version, captureRoot) {
  const target = project.targets?.[kind];
  if (!target) {
    throw new Error(`Project "${project.name}" does not define a "${kind}" target.`);
  }
  if (!existsSync(project.path)) {
    throw new Error(`Project directory does not exist: ${project.path}`);
  }

  const statusRes = runCapture("git", ["status", "--porcelain"], { cwd: project.path, env });
  if (statusRes.status !== 0) {
    throw new Error(`git status failed in ${project.path}: ${statusRes.stderr}`);
  }
  if (statusRes.stdout.trim() !== "") {
    throw new Error(`Working tree in ${project.path} is not clean. Commit or clean changes before bumping.`);
  }

  const branchName = `sternbild-${kind}-${version}`;
  const branchExists = runCapture("git", ["rev-parse", "--verify", "--quiet", `refs/heads/${branchName}`], {
    cwd: project.path,
    env,
  });
  if (branchExists.status === 0) {
    throw new Error(`Branch "${branchName}" already exists in ${project.path}.`);
  }

  const captureBase = join(captureRoot, `${project.id}-${kind}-${version}`);
  const beforeDir = join(captureBase, "before");
  const afterDir = join(captureBase, "after");
  rmSync(captureBase, { recursive: true, force: true });
  mkdirSync(beforeDir, { recursive: true });
  mkdirSync(afterDir, { recursive: true });

  console.log(`\n--- ${project.name}: capturing before state into ${beforeDir} ---`);
  runShellChecked(target.captureCommand, {
    cwd: project.path,
    env: { ...env, CAPTURE_DIR: beforeDir },
  });

  console.log(`--- ${project.name}: creating branch ${branchName} ---`);
  runChecked("git", ["checkout", "-b", branchName], { cwd: project.path, env });

  const targetFile = join(project.path, target.file);
  if (!existsSync(targetFile)) {
    throw new Error(`Pinned file not found: ${targetFile}`);
  }
  const edit = updateSinglePinnedLine(targetFile, target, version);
  console.log(`Updated ${target.file}:${edit.lineNumber}`);
  console.log(`  - ${edit.oldLine}`);
  console.log(`  + ${edit.newLine}`);

  console.log(`--- ${project.name}: running check command ---`);
  runShellChecked(target.checkCommand, { cwd: project.path, env });

  console.log(`--- ${project.name}: capturing after state into ${afterDir} ---`);
  runShellChecked(target.captureCommand, {
    cwd: project.path,
    env: { ...env, CAPTURE_DIR: afterDir },
  });

  const comparison = compareCaptures(beforeDir, afterDir);

  const stageFiles = [target.file];
  const lockSet = new Set(target.lockFiles ?? []);
  const postStatus = runCapture("git", ["status", "--porcelain", "--untracked-files=no"], {
    cwd: project.path,
    env,
  });
  const modifiedTracked = postStatus.stdout
    .split("\n")
    .map(line => line.trimEnd())
    .filter(Boolean)
    .map(line => line.slice(3).trim());

  const unexpected = [];
  for (const file of modifiedTracked) {
    if (file === target.file) continue;
    if (lockSet.has(file)) {
      stageFiles.push(file);
    } else {
      unexpected.push(file);
    }
  }
  if (unexpected.length > 0) {
    throw new Error(`Unexpected tracked files modified during bump in ${project.name}: ${unexpected.join(", ")}`);
  }

  runChecked("git", ["add", "--", ...stageFiles], { cwd: project.path, env });
  runChecked("git", ["commit", "-m", `Bump Sternbild ${kind} to ${version}`], { cwd: project.path, env });
  const commitSha = runCapture("git", ["rev-parse", "HEAD"], { cwd: project.path, env }).stdout.trim();

  return {
    id: project.id,
    name: project.name,
    path: project.path,
    switched: true,
    file: target.file,
    lineNumber: edit.lineNumber,
    oldLine: edit.oldLine,
    newLine: edit.newLine,
    stagedFiles: stageFiles,
    branch: branchName,
    commit: commitSha,
    checks: "passed",
    beforeDir,
    afterDir,
    comparison,
  };
}

function summarizeUnswitchedProject(project, kind, version) {
  const target = project.targets?.[kind];
  if (!target) {
    return {
      id: project.id,
      name: project.name,
      path: project.path,
      switched: false,
      file: "(none)",
      plannedPin: "(no target configured)",
      description: "",
    };
  }
  return {
    id: project.id,
    name: project.name,
    path: project.path,
    switched: false,
    file: target.file,
    description: interpolate(target.description ?? "", version),
    plannedPin: interpolate(target.plannedPin ?? "", version),
  };
}

function printSummary(kind, version, summaries) {
  console.log(`\n=== Sternbild Bump Summary (${kind}-v${version}) ===`);
  for (const item of summaries) {
    console.log("");
    if (!item.switched) {
      console.log(`Project: ${item.name} (${item.path})`);
      console.log("  Status:      print-only (switched: false; repository untouched)");
      console.log(`  Target file: ${item.file}`);
      if (item.description) console.log(`  Note:        ${item.description}`);
      console.log(`  Planned pin: ${item.plannedPin}`);
      continue;
    }

    const cmp = item.comparison;
    console.log(`Project: ${item.name} (${item.path})`);
    console.log("  Status:      updated");
    console.log(`  Branch:      ${item.branch}`);
    console.log(`  Commit:      ${item.commit}`);
    console.log(`  File:        ${item.file}:${item.lineNumber}`);
    console.log(`  Old line:    ${item.oldLine}`);
    console.log(`  New line:    ${item.newLine}`);
    console.log(`  Committed:   ${item.stagedFiles.join(", ")}`);
    console.log(`  Checks:      ${item.checks}`);
    console.log(`  Before dir:  ${item.beforeDir} (${cmp.beforeCount} files)`);
    console.log(`  After dir:   ${item.afterDir} (${cmp.afterCount} files)`);
    console.log(
      `  Capture diff: ${cmp.unchanged.length} unchanged, ${cmp.changed.length} changed, ${cmp.added.length} added, ${cmp.removed.length} removed`,
    );
  }
}

try {
  const { kind, version, projectsFile, captureRoot } = parseArgs(process.argv.slice(2));
  const registry = JSON.parse(readFileSync(projectsFile, "utf8"));
  if (!Array.isArray(registry.projects)) {
    throw new Error(`Invalid projects registry (expected "projects" array): ${projectsFile}`);
  }

  const summaries = [];
  for (const project of registry.projects) {
    if (project.switched) {
      summaries.push(bumpSwitchedProject(project, kind, version, captureRoot));
    } else {
      summaries.push(summarizeUnswitchedProject(project, kind, version));
    }
  }
  printSummary(kind, version, summaries);
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
