# Style Guide Reference

This document explains how Sternbild projects consume design tokens, brand assets, and documentation tools from this repository. Each project pins a versioned Git tag or stylesheet path instead of vendor copies. Nothing loads from an external service at runtime for native applications.

## Package Distribution

This repository owns the design tokens, brand assets, and shared documentation theme in one place. Projects consume those files through four distribution paths.

| Target | Package or Path | Pin Format | Consumers |
|---|---|---|---|
| Rust | `packages/sternbild-tokens` | `tag = "design-v<version>"` | Astrolabe and Rust crates |
| C and C++ | `packages/sternbild-tokens-c` | `GIT_TAG design-v<version>` | Caliper and CMake builds |
| Docs | `packages/sternbild-docs` | `@docs-v<version>#subdirectory=packages/sternbild-docs` | MkDocs sites across projects |
| Web | `public/design/<version>/sternbild.css` | `design/<version>/sternbild.css` or `design/v1/sternbild.css` | Organization site and landing pages |

The style guide page at `app/design/page.tsx` documents the rules for readers. The generated packages and stylesheets form the software contract.

## Rust Dependency

Rust projects depend on `sternbild-tokens` through a pinned Cargo Git dependency in `Cargo.toml`:

```toml
[dependencies]
sternbild-tokens = { git = "https://github.com/sternbild/organization.git", tag = "design-v1.1.0" }
```

The crate has zero external runtime dependencies. It exports typed color roles, metrics, embedded font binaries, and Minerals icon assets from the canonical repository files.

## CMake Dependency

C and C++ projects load the `sternbild::tokens` interface target through `FetchContent` in `CMakeLists.txt`:

```cmake
include(FetchContent)
FetchContent_Declare(
  sternbild-tokens
  GIT_REPOSITORY https://github.com/sternbild/organization.git
  GIT_TAG design-v1.1.0
  SOURCE_SUBDIR packages/sternbild-tokens-c
)
FetchContent_MakeAvailable(sternbild-tokens)

target_link_libraries(my_app PRIVATE sternbild::tokens)
```

The target provides `sternbild_tokens.h` for C11 and C++20 builds. It also attaches target properties that point to the canonical fonts, SVGs, and PNG rasters inside the checkout. Targets call `sternbild_tokens_copy_assets` when a build copies fonts or icons beside an executable.

## Documentation Dependency

Documentation builds install `sternbild-docs` from the same repository with a pinned `docs-v<version>` tag:

```sh
pip install "git+https://github.com/sternbild/organization@docs-v1.0.0#subdirectory=packages/sternbild-docs"
```

The package supplies the `sternbild` MkDocs plugin, shared templates, brand icons, web fonts, and the `sternbild-docs` command line checks.

## Web Stylesheets

Each design release writes `sternbild.css` and `tokens.json` into two folders under `public/design/`:

- `public/design/<version>/`: Frozen files for one exact release.
- `public/design/v<major>/`: Latest release inside that major series.

Static pages that follow all minor and patch updates link `design/v1/sternbild.css`. Pages that require an exact release link `design/<version>/sternbild.css`.

## Role Names

Projects reference semantic role names such as `--sb-surface`, `role::SURFACE`, and `sternbild::tokens::role::surface` rather than raw palette values. Because a role maps to a palette entry in `design/tokens.json`, a visual adjustment changes the role value once. Downstream projects receive the change at the next version bump with no source edits.

## Semantic Versions

Token and documentation releases follow semantic versioning:

- Patch (`1.1.0` to `1.1.1`): Value corrections or bug fixes with no removals.
- Minor (`1.1.0` to `1.2.0`): New roles, metrics, assets, or options with full compatibility.
- Major (`1.x` to `2.0.0`): Renamed or removed roles, targets, or configuration keys.

Design releases use the Git tag `design-v<version>`. Documentation releases use the Git tag `docs-v<version>`.

## Release Command

Run the release script inside this repository to build, test, commit, and tag a new release locally:

```sh
npm run release -- design 1.1.0
npm run release -- docs 1.0.1
```

The release command executes six steps in sequence:

1. Validate the release kind, semantic version, working tree state, and target tag.
2. Update the version field in `design/tokens.json` or `packages/sternbild-docs/pyproject.toml`.
3. Run `npm run tokens` and `npm run tokens:check` to regenerate and verify outputs.
4. Run `cargo test`, the CMake consumer tests, and the `sternbild-docs` pytest suite.
5. Commit managed release files when the staged diff is not empty.
6. Create the local Git tag `design-v<version>` or `docs-v<version>` without a remote push.

## Project Bump Command

The registry `tools/projects.json` lists downstream repositories, their pinned files, their check commands, and their capture commands. Run the bump command to advance project pins to a tagged release:

```sh
npm run bump -- design 1.1.0
npm run bump -- docs 1.0.1
```

For each switched project in `tools/projects.json`, the bump command executes six steps:

1. Verify that the target repository has a clean working tree.
2. Capture visual output into a `before` folder.
3. Create branch `sternbild-<kind>-<version>` and update the single pinned line.
4. Run the project build and check commands.
5. Capture visual output into an `after` folder and compare file hashes.
6. Commit the pinned file change and updated lock files on the new branch.

For projects marked `"switched": false` in `tools/projects.json`, the command never edits files or runs build tools. It prints the target path, file name, and planned pin line only.

## Agent Scope

Routine patch and minor releases need no agent work and no manual edits in downstream code. An agent is necessary in two cases only:

- Initial project setup: Add the Cargo, CMake, or MkDocs dependency, map interface code onto semantic roles, and inspect visual captures.
- Major version migration: Update downstream code for renamed or removed roles, then verify build checks and visual captures.
