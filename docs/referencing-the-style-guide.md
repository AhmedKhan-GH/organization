# Referencing the style guide

This page explains how Sternbild's other projects use the style guide. Each project takes a pinned release of the
guide when it is built and keeps a copy in its own repository. Nothing loads from the organization site at runtime,
so a project keeps its style even if the organization site is down, moved or broken, and no agent has to read the
guide page to apply it.

The guide is not hosted yet. This page describes the plan for when it is.

## Source and published files

| Folder | What it holds | Published |
|---|---|---|
| `design/` | The source: `tokens.json`, the build script and the README | No; it stays in the repository |
| The site's `design/` output | The style guide page, and each release of the generated files | Yes, by the Pages workflow |

The guide page is for people. The release files are the contract for software.

## A release

Each release is published once, in a folder named by its version, and never changes afterwards. It holds ready-made
files for every platform, so no project has to run a generator:

```
design/1.0.0/
    manifest.json         every file in the release with its SHA-256 checksum
    sternbild.css         CSS custom properties and @font-face rules, for the web
    tokens.json           the values as data
    tokens.ts             typed tokens, for web applications
    sternbild_tokens.h    for Caliper
    sternbild_tokens.rs   for the Rust applications
    sternbild.tex         a LaTeX preamble, for Atlas
    fonts/                the font files
```

The releases are served from `https://ahmedkhan-gh.github.io/organization/design/<version>/`. A `v1` folder that
always holds the latest 1.x release may also be published for people browsing the guide, but no project depends on it.

## The build step in each project

Every project does the same three things when it builds:

1. It reads the pinned version from one line of its own configuration, for example `sternbild-design = "1.0.0"`.
2. It downloads that release's files for its platform and checks each one against the checksums in `manifest.json`.
3. It writes them into a vendored folder, such as `vendor/sternbild/1.0.0/`, which is committed to the project's
   repository. The project's code uses only that folder.

If the organization site cannot be reached, the build uses the committed copy and does not fail. If a downloaded file
does not match its checksum, the build stops with an error.

| Project | Where the build step goes |
|---|---|
| Compass and the organization site (Next.js) | A `prebuild` script |
| Static landing pages | A step in the Pages workflow, before the upload |
| Caliper (CMake) | `file(DOWNLOAD … EXPECTED_HASH SHA256=…)`, which CMake checks itself |
| Astrolabe (Rust) | A small sync script that updates the vendored file; `build.rs` only reads it, because downloading inside `build.rs` is discouraged in Rust |
| Atlas | Its Python build |

## Roles, not values

Projects use role names such as `--sb-surface`, `--sb-text` and `--sb-accent`, never raw colour values. Changing what
a role looks like is therefore a value change, and every project follows it at its next version bump without any edit
to its own code.

## Versions

- **Patch** (1.3.0 to 1.3.1): corrections to values.
- **Minor** (1.3 to 1.4): new roles or new values. Nothing existing is removed.
- **Major** (1.x to 2.0): a role is renamed or removed. Projects stay on 1.x until they are migrated.

Each release is tagged in this repository as `design-v<version>`.

## Releasing a change

1. Edit `design/tokens.json` and raise its version.
2. Run the build, which writes the new release folder with every platform's files and its manifest.
3. Check the style guide page in screenshots.
4. Commit, tag `design-v<version>` and push. Pages publishes the release.
5. A bot such as Renovate, or one script across the repositories, opens a version bump in each project. The vendored
   copy updates, and its diff shows exactly which values changed. Merge each bump after a screenshot check, so a bad
   release reaches one project at a time rather than all of them at once.

## When an agent is needed

- **First wiring of a project:** adding the build step and the vendored folder, mapping the project's existing colours
  and fonts onto the roles, and checking screenshots.
- **A major version:** updating a project's code for renamed or removed roles, then checking screenshots.

Ordinary releases need no agent and no hand edits.

## Before this works

- **Hosting:** the repository needs to be on GitHub with Pages turned on.
- **Fonts:** publishing the fonts makes Sternbild Display downloadable by anyone, so its licence needs deciding first.
- **The build:** it writes `sternbild.css` and `tokens.json` today. It still needs to write `manifest.json` and the
  files for the other platforms.
