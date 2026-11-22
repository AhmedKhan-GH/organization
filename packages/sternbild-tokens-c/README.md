# Sternbild Tokens for C and C++

This CMake package exposes the `sternbild::tokens` interface target for C11 and C++20 projects. It delivers the generated `sternbild_tokens.h` header and target properties that point to the canonical font and icon assets in the repository checkout.

## CMake FetchContent Configuration

Declare the package with `FetchContent` and pin `GIT_TAG` to a `design-v<version>` tag:

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

## Header Contents

The build script `design/build.mjs` generates `include/sternbild_tokens.h` from `design/tokens.json`. C consumers use `sb_color_t`, `#define` macros, and `static const` tables. C++ consumers also access `constexpr` values inside `namespace sternbild::tokens`.

| Symbol Group | C Interface | C++ Interface |
|---|---|---|
| Version | `STERNBILD_TOKENS_VERSION`, `_MAJOR`, `_MINOR`, `_PATCH` | `sternbild::tokens::VERSION`, `PREFIX` |
| Role Colors | `SB_ROLE_*`, `SB_ROLE_ALL` | `sternbild::tokens::role::*`, `role::all` |
| Data Pigments | `SB_DATA_*`, `SB_DATA_SERIES`, `SB_DATA_ALL` | `sternbild::tokens::data::*`, `data::series` |
| Mark Colors | `SB_MARK_*`, `SB_MARK_ALL` | `sternbild::tokens::mark::*`, `mark::all` |
| Typography | `SB_FONT_*`, `SB_TRACKING_*`, `SB_LEADING_*` | `font::*`, `tracking::*`, `leading::*` |
| Spacing and Layout | `SB_SPACE_*`, `SB_LAYOUT_*`, `SB_LOGO_*`, `SB_RULE_WIDTH` | `space::*`, `layout::*`, `logo::*`, `rule::width` |
| Shape and Motion | `SB_RADIUS`, `SB_CUT`, `SB_MOTION_*` | `RADIUS`, `CUT`, `motion::*` |
| Application Metrics | `SB_APP_*`, `SB_APP_FONT_SIZE_*` | `app::*`, `app::font_size::*` |

Each `sb_color_t` entry includes `imu32`, which packs `r`, `g`, `b`, and `a` in Dear ImGui `ABGR` order.

## Asset Properties and Copy Helper

Read canonical file paths from `sternbild::tokens` with `get_target_property`. Call `sternbild_tokens_copy_assets` to copy fonts or icons after a target builds.

| Property | Contents |
|---|---|
| `STERNBILD_FONTS_DIR` | Canonical directory for font binaries and OFL texts. |
| `STERNBILD_FONT_UI`, `STERNBILD_FONT_MONO` | Paths to IBM Plex Sans Condensed and Source Code Pro TTF files. |
| `STERNBILD_FONT_DISPLAY_OTF`, `STERNBILD_FONT_DISPLAY_WOFF2` | Paths to Sternbild Display OTF and WOFF2 files. |
| `STERNBILD_FONT_FILES` | Full list of canonical font files and OFL texts. |
| `STERNBILD_SEAL_SVG`, `STERNBILD_ICON_SVGS` | Canonical seal SVG and Minerals application SVGs. |
| `STERNBILD_ICON_PNGS` | Canonical Minerals application PNG rasters at 32 to 2048 px. |
| `STERNBILD_ICON_<APP>_SVG`, `STERNBILD_ICON_<APP>_PNG_<SIZE>` | Per-application SVG and PNG asset paths. |

## Verification

Run the CMake consumer test script from the repository root:

```sh
node tools/test-tokens-c.mjs
```
