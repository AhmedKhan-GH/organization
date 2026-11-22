# Sternbild Tokens for Rust

This crate provides the Sternbild design tokens, canonical font binaries, and Minerals brand icons for Rust projects. It has zero external runtime dependencies. Projects pull one pinned Git tag instead of hand-coded theme constants or duplicated binary assets.

## Cargo Dependency

Add the crate as a Git dependency pinned to a `design-v<version>` tag in `Cargo.toml`:

```toml
[dependencies]
sternbild-tokens = { git = "https://github.com/sternbild/organization.git", tag = "design-v1.1.0" }
```

## Module Layout

The generator `design/build.mjs` writes `src/tokens.rs` directly from `design/tokens.json`. Application code uses role tokens rather than raw hex values.

| Module | Contents |
|---|---|
| `role` | Fifteen interface role colors and the ordered `ALL` slice. |
| `data` | Five plot pigments, `SERIES`, and `ALL`. |
| `mark` | Nine mark colors and `ALL`. |
| `font` | Font families, regular weight, and website type sizes. |
| `tracking` | Letter-spacing ratios in `em`. |
| `leading` | Line-height ratios. |
| `space` | Four-pixel spacing steps from `S1` to `S18`. |
| `layout` | Website column, gutter, section, and breakpoint metrics. |
| `logo`, `rule`, `RADIUS`, `CUT` | Logo limits, rule width, square radius, and corner cut. |
| `motion` | Millisecond durations and the standard cubic-bezier curve. |
| `app` | Desktop interface metrics and `font_size` constants. |
| `fonts` | Embedded `UI_TTF`, `MONO_TTF`, `DISPLAY_OTF`, `DISPLAY_WOFF2`, and license texts. |
| `icons` | Embedded seal SVG, Minerals SVGs, Minerals PNG rasters, and the `App` enum. |

## Verification

Run the crate test suite from the repository root:

```sh
cargo test --manifest-path packages/sternbild-tokens/Cargo.toml
```
