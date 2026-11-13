# Referencing the style guide

This page explains how Sternbild's other projects use the style guide once it is hosted online. The guide's source
lives in this repository; the projects reference the files that GitHub Pages publishes from it. No project copies the
style by hand, and no agent has to read the guide page to apply it.

## Source and published files

| Folder | What it holds | Published |
|---|---|---|
| `design/` | The source: `tokens.json`, the build script and the README | No; it stays in the repository |
| `site/design/` | The output: the style guide page, the generated CSS and the tokens, by version | Yes, by the Pages workflow that publishes `site/` |

The guide page is for people. The CSS and `tokens.json` files are the contract for software.

## Hosted layout

Once the repository is on GitHub with Pages turned on, the files are served at
`https://ahmedkhan-gh.github.io/organization/design/`:

```
design/                 the style guide page
design/v1/              always the latest 1.x release
    sternbild.css       CSS custom properties and @font-face rules
    tokens.json         the same values as data
design/1.3.0/           a frozen copy of each release, never changed
design/fonts/           the font files
design/marks/           the logo, the seal and the product marks
```

A `v1` path follows every release in the 1.x series. A numbered path, such as `1.3.0`, never changes after it is
published.

## How each kind of project references it

| Project | How it references the guide | When the guide changes |
|---|---|---|
| Landing pages and documentation sites | `<link rel="stylesheet" href="https://ahmedkhan-gh.github.io/organization/design/v1/sternbild.css">` | Nothing to do: the page loads the new 1.x values on its next visit |
| Compass and other web apps | The same link, or a build step that downloads `v1/tokens.json` or a pinned version and bundles it | Nothing to do with the `v1` link; a version bump when pinned |
| Caliper, Astrolabe and Artisan Apps | A build step that downloads `tokens.json` from a pinned version path and generates the app's theme file (a C++ header, a Rust module), which is compiled in | A one-line version bump |
| Atlas | Its build downloads the tokens and the fonts from a pinned version path | A one-line version bump |

Native applications fetch the tokens when they are built, not when they start, so they work offline and start
quickly. GitHub Pages allows cross-origin loading, so sites on other domains can load the CSS and the fonts too.

## Roles, not values

Projects use role names such as `--sb-surface`, `--sb-text` and `--sb-accent`, never raw colour values. Changing what
a role looks like is therefore a value change, and every project follows it without any edit to its own code.

## Versions

- **Patch** (1.3.0 to 1.3.1): corrections to values.
- **Minor** (1.3 to 1.4): new roles or new values. Nothing existing is removed.
- **Major** (1.x to 2.0): a role is renamed or removed. It is published under `v2`, and projects stay on `v1` until
  they are migrated.

Each release is tagged in this repository as `design-v<version>`.

## Releasing a change

1. Edit `design/tokens.json`.
2. Run the build, which regenerates the CSS and copies the release into its `v1` and numbered folders.
3. Check the style guide page and a few consuming projects in screenshots.
4. Commit, tag `design-v<version>` and push. Pages publishes the release.
5. Pages and sites that use the `v1` link update on their next load. Pinned projects take the release when their
   version is bumped; a bot such as Renovate, or one script across the repositories, can open those bumps
   automatically.

## When an agent is needed

- **First wiring of a project:** adding the link or the build step, mapping the project's existing colours and fonts
  onto the roles, and checking screenshots.
- **A major version:** updating a project's code for renamed or removed roles, then checking screenshots.

Ordinary releases need no agent and no hand edits.

## Before this works

- The repository is local today. It needs a GitHub repository with Pages turned on before any project can reference
  the hosted files.
- Publishing the fonts on Pages makes Sternbild Display downloadable by anyone. That is a licensing decision to make
  first.
- The build script must publish the `v1` and numbered folders described above.
