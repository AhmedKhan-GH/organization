# Sternbild design tokens

This folder is the single source of the Sternbild style: colour, type, spacing, rules, corners, motion and the
application metrics. The website and every application will reference it by version instead of copying the style by
hand. The style guide page, `app/design/page.tsx`, documents it for people; the generated files are the contract
for software. How other projects reference the hosted files is described in
[`docs/referencing-the-style-guide.md`](../docs/referencing-the-style-guide.md).

## Files

| Path | What it is |
|---|---|
| `design/tokens.json` | The tokens, in the W3C Design Tokens Community Group format (2025.10), with the version |
| `design/build.mjs` | The build: plain Node 18 or later, no dependencies |
| `design/README.md` | This file |
| `public/design/v1/` | `sternbild.css` and `tokens.json` for the latest 1.x release, published at `design/v1/` |
| `public/design/<version>/` | The same two files for each release, frozen, published at `design/<version>/` |
| `lib/tokens.ts` | The same tokens as a typed module for the site's own pages; generated, not part of a release |
| `app/design/page.tsx` | The style guide page, published at `design/`; it links `v1/sternbild.css` |

## Building

```
npm run tokens         # write the release to public/design/v1/ and public/design/<version>/, and lib/tokens.ts
npm run tokens:check   # exit 1 if the generated files differ from what the tokens produce
```

The same build runs on its own before `npm run dev` and `npm run build` (the `predev` and `prebuild` scripts), so the
site always serves the current tokens. Without npm, `node design/build.mjs` and `node design/build.mjs --check` do
the same.

The build reads the version from `$extensions["org.sternbild"].version` in `tokens.json`. It writes `sternbild.css`
and a byte-for-byte copy of `tokens.json` into `v<major>/` and into the numbered folder. A rerun of the same version
writes identical files. The build refuses to change a numbered folder that already exists with different content,
and it refuses to move `v<major>/` back to an older version. It also writes `lib/tokens.ts`, which the style guide
page imports: each token's custom property name, type, resolved value and CSS value, with the helpers `cssVar`, `hex`
and `amount`. That module is not part of a release, so it can change without a new version. Commit the generated
files with the tokens.

Everything in `public/` is published as it is by the Next.js static export, so the release folders keep their
URLs: `design/v1/sternbild.css`, `design/v1/tokens.json` and `design/1.0.0/…` under the site's address.

## Names

Each token becomes a CSS custom property named `--sb-` followed by its path, joined by hyphens:
`palette.deep` is `--sb-palette-deep`, `font.size.body` is `--sb-font-size-body` and `space.4` is `--sb-space-4`.
The role group carries no group name, so `role.text` is `--sb-text` and `role.surface` is `--sb-surface`. Projects
use the roles, never palette names or raw values. A reference such as `"{palette.deep}"` becomes
`var(--sb-palette-deep)`, so a role follows its palette colour. The build stops if two tokens would get the same name.

Three extensions carry what the format does not:

- `org.sternbild.source` on every token: the file and line it was taken from (see below).
- `org.sternbild.css`: a CSS-only value (the `clamp()` for the hero size), the `em` unit for tracking, the geometry of
  the aura's radial gradient, and `inPropertyName: false` on the role group.
- `org.sternbild.font-face` on the two font families that ship here: the file, format, weight and style for the
  `@font-face` rule.

## Versioning

- Each release is tagged `design-v<semver>`, for example `design-v1.0.0`, and every application pins one version.
- A patch corrects values. A minor version adds roles or values and removes nothing. A major version renames or
  removes a role and is published under a new folder, `v2/`, while projects stay on `v1/` until they are moved.
- Sites that should follow every 1.x release link `v1/sternbild.css`. Native applications download `tokens.json`
  from a numbered folder when they are built and generate their theme from it.
- Release 1.0.0 is built but not tagged. The repository has no remote yet.
- Generators for C++ (Dear ImGui), Rust and other platforms will read `tokens.json`; they are not built yet.
- The fonts and the marks are in `public/assets/`, published at `assets/`, and the generated CSS reaches the fonts by
  relative path (`../../assets/fonts/`). Moving them into the release folders is a later step; it changes the font
  URLs in the CSS, so it needs a new release.
- The font-face files in `tokens.json` 1.0.0 are written `site/assets/fonts/…`, after the folder the site was
  published from before the move to Next.js. The build reads a leading `site/` or `public/` as the published root,
  `public/`, so the frozen 1.0.0 files stay unchanged. A later release can write the paths as `assets/fonts/…`.

## Where the values came from

Every token names its source in `org.sternbild.source`. The citations of `site/index.html` and `site/assets/` refer
to the static site as it stood before the move to Next.js, at commit `4fd6d1a`. In summary:

| Tokens | Values | Source |
|---|---|---|
| `palette` (chrome) | deep #12110f, ground #181715, plate #201f1c, plate-hover #2a2925, rule #4b4945, rule-faint #2c2b28, parchment #e8e0d0, secondary #c1baaa, faint #8f897c, bronze #b38b59 | Identical in the organization site (`site/index.html:30-39`) and Caliper's theme (`sternbild_theme.h:30-39`); also the Caliper docs and the three product landing pages |
| `palette` (website) | bronze-hover #c49b68, deep-hover #161513, aura #1b1a17, construction #6a655a, light #fff6e8, white #ffffff | Organization site (`site/index.html:40, 41, 177, 184, 191, 234`) |
| `role` | 15 roles over the palette | Caliper's theme comments and style mapping for the application roles; the organization site for `background`, `row-hover` and `accent-hover` |
| `data` | smalt #4677ad, verdigris #3ca99c, olive ochre #867424, madder #a35a74, slate #55524c | Caliper's theme (`sternbild_theme.h:42-46`) and the Caliper interface specification, which names the pigments |
| `mark` | tile #36332d / #211f1b / #141311, parchment #f6f0e4 / #e8e0d0 / #cfc3aa, bronze #d8b27a / #b38b59 / #8d6a3e | The marks brief and the mark files in `site/assets/` |
| `gradient.aura` | radial, 120% 90% at 50% 100%, #1b1a17 to deep at 62% | Organization site (`site/index.html:177`) |
| `font.family` | Sternbild Display; IBM Plex Sans Condensed; Source Code Pro | Organization site (`site/index.html:25-26, 43-44`); Caliper's fonts (`sternbild_fonts.h:9-11`) |
| `font.size` | 12, 13, 14, 15, 16, 17, 19, 24, 28 px; hero `clamp(40px, 5.6vw, 84px)` | Organization site; 24 px headings from the Caliper site, docs and brand book |
| `tracking` | 0.3, 0.26, 0.22, 0.18, 0.1, 0.08, 0.06 em | Organization site; Caliper's theme for 0.1 and 0.08; the Caliper site and docs for 0.06 |
| `leading` | 1, 1.2, 1.35, 1.55, 1.65 | Organization site; the Caliper site and docs for 1.2 |
| `space` | 4 to 72 px on a 4 px base | Values that recur in the organization site and Caliper's theme |
| `layout` | max 1160, gutter 28, narrow 18, masthead 64, section 110 and 72, breakpoint 820 | Organization site |
| `rule`, `radius`, `cut` | 1 px, 0, 6 px | Organization site and Caliper's theme; the cut is Caliper's primary action |
| `logo` | minimum 40 px, clear space half the diamond's width | The October site study (`~/Creative/sternbild-site/research/TYPOGRAPHY.md:33`); see question 6 |
| `motion` | 150 ms, 300 ms, `cubic-bezier(0.2, 0.65, 0.3, 1)` | Organization site |
| `app` | row 22, pane header 24, command bar 28, status bar 22, pad 8, gap 16, key button 20, focus offset 3, scrollbar 8, mark 18; font sizes 15, 14, 15, 16 | Caliper's theme and fonts (`sternbild_theme.h:54-62`, `sternbild_theme.cpp`, `sternbild_fonts.h:38-41`) |

Sources read, all local and read-only:

- The organization site, `site/index.html` and `site/assets/`.
- Caliper: `src/host/ui/sternbild_theme.{h,cpp}`, `sternbild_fonts.{h,cpp}`, `docs/wiki/stylesheets/sternbild.css`,
  `docs/wiki/explanation/ui-principles.md` and `site/index.html`, in `~/CLionProjects/caliper`.
- The Caliper interface specification, rev 3, `~/Creative/caliper-product/SPEC-sternbild.md`. Caliper's theme is
  later and wins where they differ.
- The landing pages of Astrolabe, Alidade and Compass (`compass-legacy`).
- The brand book, `~/Creative/sternbild-brand/brand.html`; the typeface notes in `~/Creative/sternbild-type/`; the
  logo and marks notes in `~/Creative/sternbild-logo/` and `~/Creative/sternbild-marks/`.
- An identity guide from another organization, used only as a model for the order of the page's sections. Nothing
  was copied from it.

Where sources disagreed, Caliper's theme was preferred for application interfaces and the organization site for the
website. No value was invented. `public/assets/loggia-icon.svg` is internal and is deliberately left out of the guide.

## Checks done for 1.0.0

- The source citations in `tokens.json` were checked against the files: 103 tokens and about 149 citations were
  read. Two citations were corrected; the two font-family names differ from the site's on purpose (question 19).
- The contrast ratios on the page are WCAG 2.2 ratios, truncated to two decimals.
- The page was checked in headless Chrome at 1440 and 390 px wide: no horizontal scrolling, both fonts loaded, no
  failed or external requests.
- Font licences: IBM Plex Sans Condensed is under the SIL Open Font License 1.1, and its licence is in
  `public/assets/fonts/OFL-ibmplexsanscondensed.txt`. Sternbild Display has no licence file (see question 13).

## Open questions

Colour

1. **The text face.** The brand book and Caliper's specification rev 3 set text in Source Serif 4. Every site and
   the Caliper application use IBM Plex Sans Condensed, and so does this guide. Is Source Serif 4 retired?
2. **The Caliper landing page palette.** `caliper/site/index.html:22-33` redefines every chrome colour in a lighter
   variant (deep #1c1b18, plate #272622, plate-hover #312f2b, rule #5a5751, rule-faint #36342f, parchment #f0e9db,
   secondary #d0c9ba, faint #a49d8f), names #12110f `--night`, and uses `--deep` for a lighter tone. Should it move
   to the shared palette?
3. **The page ground.** The organization site sets its page on deep #12110f. The product landing pages and the
   Caliper docs set theirs on ground #181715. The guide keeps `background` (deep, the website) and `background-app`
   (ground, applications). Should the landing pages move to deep?
4. **Bronze.** Caliper's specification rev 3 forbids bronze on focus, buttons, links and eyebrow labels. Caliper's
   theme, which is later, uses it for focus, selection and keys. The website uses it for eyebrow labels, kickers,
   arc labels, flow lines and hovered names. The guide allows focus, selection, keys, section numerals, hover on
   the website and one accent per mark. Should the website keep its bronze labels and drawing lines?
5. **Hover.** Website rows hover to deep-hover #161513; applications hover to plate-hover #2a2925. The guide keeps
   both as `row-hover` and `surface-hover`. Is that right?

Logo and marks

6. **Minimum size and clear space.** The only source is the October site study, whose palette and layout were
   later replaced: 40 px and half the diamond's width. The website's masthead sets the logo at 38 px. Confirm 40 px
   and move the masthead to it, or set the minimum at 38 px.
7. **The logo at the centre.** The website's opening centres the seal and sets the logo on the horizon below the
   applications, while the rule is that the logo is visible but not central. Is the opening an accepted exception?
8. **Glows, shadows and blur.** The opening's name and seal carry white glows, the drawing's marks carry drop
   shadows, and the masthead is translucent with a blur. Caliper's specification forbids glows, shadows and blur on
   chrome. The tokens leave all three out. Are they an exception for the opening only?
9. **Nebula's colours.** Nebula's mark uses teal and terracotta shades besides its bronze accent, while the marks
   brief allows exactly one bronze accent per mark.
10. **The data pigments.** Caliper names them after one dataset's classes; the guide names them by pigment and
    order. Are they the data palette for every application?
11. **The brand book.** `brand.html` (19 October) shows the older flat marks and lists Compass and Alidade as still
    to be supplied. Retire it or update it?

Type

12. **Tracking of the name.** STERNBILD is tracked 0.3 em on the organization site, 0.22 em in the product
    mastheads, 0.16 em in the product heroes, 0.1 em in the Caliper application, and 0.02 em in the font's own CSS
    and the brand book ("tracked +2%"). The guide keeps 0.3 em for the website, 0.22 em for names and 0.1 em for an
    application's wordmark. Is the brand book's +2% superseded?
13. **The Sternbild Display licence.** The font is house-owned and has no licence file. Caliper keeps it out of its
    repository, while this site, the three landing pages and Caliper's site and docs publish the woff2. Hosting the
    guide makes it downloadable by anyone. Decide on a licence statement before publishing.
14. **Older copies of Sternbild Display.** The woff2 in Caliper's site and docs differs from version 1.000 here, and
    the product landing pages switch to the text face for the middle dot, which version 1.000 has. Update the copies.
15. **The smallest Display size.** The Caliper application never sets Sternbild Display below 16 px, and the font
    notes suggest 36 px or more for headings. The website sets it at 9 to 13 px for labels and kickers. On 1x
    screens, Display below 16 px loses the thin strokes of the M, which then reads as a V; on 2x screens it holds.
    Set a floor for the website?
16. **Label tracking.** Uppercase labels are tracked 0.26, 0.24, 0.22, 0.2, 0.18 and 0.16 em across the sites, and
    0.08 em in the application. The guide keeps 0.26 (labels), 0.18 (navigation) and 0.08 (application labels).
17. **The smallest text.** The Caliper application allows CSS 11 px, the specification 12 px, and the website sets
    kickers at 9 to 11 px. The guide says 12 px.
18. **Source Code Pro.** Caliper sets code in Source Code Pro (SIL OFL 1.1), but the file is not in this
    repository, so the `mono` token falls back to the system's monospace face. Add it here with its licence?
19. **The family name.** The site's CSS calls the text face "Plex Condensed"; the tokens use the font's full name,
    "IBM Plex Sans Condensed". This changes nothing on screen.

Layout and writing

20. **Corners.** The Caliper landing page, the three product landing pages and the Caliper docs use radii of 3 to
    9 px, and the Caliper landing page's primary button is rounded rather than cut. The organization site and the
    Caliper application use none, and so does the guide.
21. **Spacing off the base.** The sites use many values off the 4 px base (6, 10, 14, 18, 22, 26, 30 and 34 px). The
    tokens keep a 4 px scale and the 18 px phone margin. Should the sites move onto the scale?
22. **Breakpoints.** The organization site uses 820 px, the landing pages 900, 680 and 520 px, and Caliper's site
    eight different values. The guide uses 820 px.
23. **Construction lines.** The opening drawing uses #6a655a on the organization and Caliper sites; the three product
    landing pages use rule-faint #2c2b28.
24. **The colour of light.** #fff6e8 is named the opening's one colour of light, but the site's beams are #e9f0ff and
    the product landing pages' beams are parchment.
25. **Atlas.** Resolved: Atlas is an application. The guide now lists it with the other applications, as the site
    already did. The site's lists still give every item the kicker "Project".

Publishing

26. **Tagging.** Release 1.0.0 is ready to tag as `design-v1.0.0` once it is approved.
27. **The interface principles.** Section 7 of the page follows `docs/wiki/explanation/ui-principles.md` in
    Caliper, which is not committed there yet.
