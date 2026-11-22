# Sternbild Docs

This package provides the shared MkDocs theme, brand assets, roadmap generator, and documentation checks for Sternbild projects. Projects install one versioned Python package so they do not copy templates, stylesheets, scripts, and validation tools across repositories.

The package registers the `sternbild` MkDocs plugin and the `sternbild-docs` command line interface. Each project enables optional features such as the roadmap graph, candidates navigator, coverage ledger, icon, and accent color in `mkdocs.yml`.

## Installation

Install the package from the repository subdirectory with `pip` or `uv`:

```bash
uv pip install "sternbild-docs @ git+https://github.com/sternbild/organization.git@docs-v1.0.0#subdirectory=packages/sternbild-docs"
```

For local development inside a workspace checkout, install the package in editable mode:

```bash
uv pip install -e /path/to/organization/packages/sternbild-docs
```

## Plugin Configuration

Add `sternbild` to the `plugins` list in `mkdocs.yml`. The plugin places the shared theme ahead of Material for MkDocs and behind any project `custom_dir`. When a project declares a minimal `theme: {name: material}` block, the plugin sets Sternbild defaults for slate colors, local fonts, and navigation features.

```yaml
theme:
  name: material

plugins:
  - search
  - awesome-nav
  - sternbild:
      roadmap: roadmap/
      icon: assets/brand/astrolabe-icon-minerals.svg
      accent: "#4a5bac"
```

| Option | Type | Default | Behavior |
|---|---|---|---|
| `icon` | string | `null` | Sets `theme.logo` and `theme.favicon` if `mkdocs.yml` does not set them. Accepts `assets/brand/<file>`, a brand filename, or a project-relative path. |
| `accent` | string | `null` | Overrides `--sb-accent` and `--sb-accent-hover` across theme and roadmap stylesheets. Accepts a `#RGB` or `#RRGGBB` hex value or a preset name (`bronze`, `lapis`, `turquoise`, `malachite`, `cinnabar`, `amethyst`). |
| `roadmap` | string | `null` | Generates roadmap pillar pages, feature pages, `roadmap/graph.json`, and `roadmap.json` from the named YAML folder. |
| `candidates` | string | `null` | Generates optional candidate pages, `roadmap/candidates.json`, and candidate navigator assets. |
| `coverage` | string or boolean | `null` | Adds optional coverage ledger sections to feature pages. Pass `true` for `<roadmap>/coverage` or pass a folder path. |
| `contents` | boolean | `true` | Replaces `<!-- docs-tree -->` in `docs/contents.md` with a navigation tree. |
| `repo_url` | string | `null` | Sets the repository base URL for design document and issue links. Falls back to `repo_url` in `mkdocs.yml`. |

## Brand Assets

Canonical brand files stay in `sternbild_docs/assets/brand/`. The plugin exposes them to MkDocs at build time and does not duplicate files inside the package or across repositories.

| Source Path in Package | Built Site Path | Contents |
|---|---|---|
| `assets/brand/*.svg` | `assets/brand/<filename>` | Product Minerals icons and `sternbild-seal.svg`. |
| `assets/brand/fonts/*` | `assets/fonts/<filename>` | `SternbildDisplay-Regular.woff2`, `IBMPlexSansCondensed-Regular.ttf`, `SourceCodePro-Regular.ttf`, and OFL license texts. |

## Command Line Interface

The `sternbild-docs` command checks documentation headings, validates roadmap registries, and writes generated roadmap files outside MkDocs.

| Command | Purpose |
|---|---|
| `sternbild-docs check-headings [PATH ...]` | Checks H1, H2, and H3 Markdown headings against the Title Case rule. Defaults to `docs/`. Supports `--root`, `--list`, and `--extra-words`. |
| `sternbild-docs check-roadmap [--root DIR]` | Validates roadmap YAML schemas, ids, dependency graphs, docs links, `.nav.yml` entries, privacy rules, and optional coverage or candidates folders. Supports `--strict-titles` and `--strict-core-scope`. |
| `sternbild-docs build-roadmap --out DIR` | Writes generated roadmap Markdown pages, `roadmap/graph.json`, and `roadmap.json` under the output folder. |

## Verification

Run the test suite with `pytest` from the package folder:

```bash
pytest
```
