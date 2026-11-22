//! Sternbild design tokens, embedded font files, and Minerals brand icons.

pub mod tokens;
pub use tokens::*;

/// Canonical Sternbild font binaries and license texts.
pub mod fonts {
    pub const UI_TTF: &[u8] = include_bytes!(
        "../../sternbild-docs/sternbild_docs/assets/brand/fonts/IBMPlexSansCondensed-Regular.ttf"
    );
    pub const UI_LICENSE: &str = include_str!(
        "../../sternbild-docs/sternbild_docs/assets/brand/fonts/OFL-ibmplexsanscondensed.txt"
    );
    pub const MONO_TTF: &[u8] = include_bytes!(
        "../../sternbild-docs/sternbild_docs/assets/brand/fonts/SourceCodePro-Regular.ttf"
    );
    pub const MONO_LICENSE: &str = include_str!(
        "../../sternbild-docs/sternbild_docs/assets/brand/fonts/OFL-sourcecodepro.txt"
    );
    pub const DISPLAY_OTF: &[u8] = include_bytes!(
        "../../sternbild-docs/sternbild_docs/assets/brand/fonts/SternbildDisplay-Regular.otf"
    );
    pub const DISPLAY_WOFF2: &[u8] = include_bytes!(
        "../../sternbild-docs/sternbild_docs/assets/brand/fonts/SternbildDisplay-Regular.woff2"
    );
}

/// Canonical Sternbild seal and Minerals application icons.
pub mod icons {
    pub const STERNBILD_SEAL_SVG: &[u8] =
        include_bytes!("../../sternbild-docs/sternbild_docs/assets/brand/sternbild-seal.svg");
    pub const ALIDADE_SVG: &[u8] = include_bytes!(
        "../../sternbild-docs/sternbild_docs/assets/brand/alidade-icon-minerals.svg"
    );
    pub const ASTROLABE_SVG: &[u8] = include_bytes!(
        "../../sternbild-docs/sternbild_docs/assets/brand/astrolabe-icon-minerals.svg"
    );
    pub const ATLAS_SVG: &[u8] = include_bytes!(
        "../../sternbild-docs/sternbild_docs/assets/brand/atlas-icon-minerals.svg"
    );
    pub const CALIPER_SVG: &[u8] = include_bytes!(
        "../../sternbild-docs/sternbild_docs/assets/brand/caliper-icon-minerals.svg"
    );
    pub const COMPASS_SVG: &[u8] = include_bytes!(
        "../../sternbild-docs/sternbild_docs/assets/brand/compass-icon-minerals.svg"
    );

    pub const ALIDADE_PNG_32: &[u8] =
        include_bytes!("../../../public/assets/alidade-icon-minerals-32.png");
    pub const ALIDADE_PNG_180: &[u8] =
        include_bytes!("../../../public/assets/alidade-icon-minerals-180.png");
    pub const ALIDADE_PNG_256: &[u8] =
        include_bytes!("../../../public/assets/alidade-icon-minerals-256.png");
    pub const ALIDADE_PNG_512: &[u8] =
        include_bytes!("../../../public/assets/alidade-icon-minerals-512.png");
    pub const ALIDADE_PNG_1024: &[u8] =
        include_bytes!("../../../public/assets/alidade-icon-minerals-1024.png");

    pub const ASTROLABE_PNG_32: &[u8] =
        include_bytes!("../../../public/assets/astrolabe-icon-minerals-32.png");
    pub const ASTROLABE_PNG_180: &[u8] =
        include_bytes!("../../../public/assets/astrolabe-icon-minerals-180.png");
    pub const ASTROLABE_PNG_256: &[u8] =
        include_bytes!("../../../public/assets/astrolabe-icon-minerals-256.png");
    pub const ASTROLABE_PNG_512: &[u8] =
        include_bytes!("../../../public/assets/astrolabe-icon-minerals-512.png");
    pub const ASTROLABE_PNG_1024: &[u8] =
        include_bytes!("../../../public/assets/astrolabe-icon-minerals-1024.png");

    pub const ATLAS_PNG_32: &[u8] =
        include_bytes!("../../../public/assets/atlas-icon-minerals-32.png");
    pub const ATLAS_PNG_180: &[u8] =
        include_bytes!("../../../public/assets/atlas-icon-minerals-180.png");
    pub const ATLAS_PNG_256: &[u8] =
        include_bytes!("../../../public/assets/atlas-icon-minerals-256.png");
    pub const ATLAS_PNG_512: &[u8] =
        include_bytes!("../../../public/assets/atlas-icon-minerals-512.png");
    pub const ATLAS_PNG_1024: &[u8] =
        include_bytes!("../../../public/assets/atlas-icon-minerals-1024.png");

    pub const CALIPER_PNG_32: &[u8] =
        include_bytes!("../../../public/assets/caliper-icon-minerals-32.png");
    pub const CALIPER_PNG_180: &[u8] =
        include_bytes!("../../../public/assets/caliper-icon-minerals-180.png");
    pub const CALIPER_PNG_256: &[u8] =
        include_bytes!("../../../public/assets/caliper-icon-minerals-256.png");
    pub const CALIPER_PNG_512: &[u8] =
        include_bytes!("../../../public/assets/caliper-icon-minerals-512.png");
    pub const CALIPER_PNG_1024: &[u8] =
        include_bytes!("../../../public/assets/caliper-icon-minerals-1024.png");

    pub const COMPASS_PNG_32: &[u8] =
        include_bytes!("../../../public/assets/compass-icon-minerals-32.png");
    pub const COMPASS_PNG_180: &[u8] =
        include_bytes!("../../../public/assets/compass-icon-minerals-180.png");
    pub const COMPASS_PNG_256: &[u8] =
        include_bytes!("../../../public/assets/compass-icon-minerals-256.png");
    pub const COMPASS_PNG_512: &[u8] =
        include_bytes!("../../../public/assets/compass-icon-minerals-512.png");
    pub const COMPASS_PNG_1024: &[u8] =
        include_bytes!("../../../public/assets/compass-icon-minerals-1024.png");

    /// Sternbild desktop and web applications with Minerals icon sets.
    #[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
    pub enum App {
        Alidade,
        Astrolabe,
        Atlas,
        Caliper,
        Compass,
    }

    impl App {
        pub const ALL: [App; 5] = [
            App::Alidade,
            App::Astrolabe,
            App::Atlas,
            App::Caliper,
            App::Compass,
        ];

        pub const fn name(self) -> &'static str {
            match self {
                App::Alidade => "alidade",
                App::Astrolabe => "astrolabe",
                App::Atlas => "atlas",
                App::Caliper => "caliper",
                App::Compass => "compass",
            }
        }

        pub const fn svg(self) -> &'static [u8] {
            match self {
                App::Alidade => ALIDADE_SVG,
                App::Astrolabe => ASTROLABE_SVG,
                App::Atlas => ATLAS_SVG,
                App::Caliper => CALIPER_SVG,
                App::Compass => COMPASS_SVG,
            }
        }

        pub const fn png_32(self) -> &'static [u8] {
            match self {
                App::Alidade => ALIDADE_PNG_32,
                App::Astrolabe => ASTROLABE_PNG_32,
                App::Atlas => ATLAS_PNG_32,
                App::Caliper => CALIPER_PNG_32,
                App::Compass => COMPASS_PNG_32,
            }
        }

        pub const fn png_180(self) -> &'static [u8] {
            match self {
                App::Alidade => ALIDADE_PNG_180,
                App::Astrolabe => ASTROLABE_PNG_180,
                App::Atlas => ATLAS_PNG_180,
                App::Caliper => CALIPER_PNG_180,
                App::Compass => COMPASS_PNG_180,
            }
        }

        pub const fn png_256(self) -> &'static [u8] {
            match self {
                App::Alidade => ALIDADE_PNG_256,
                App::Astrolabe => ASTROLABE_PNG_256,
                App::Atlas => ATLAS_PNG_256,
                App::Caliper => CALIPER_PNG_256,
                App::Compass => COMPASS_PNG_256,
            }
        }

        pub const fn png_512(self) -> &'static [u8] {
            match self {
                App::Alidade => ALIDADE_PNG_512,
                App::Astrolabe => ASTROLABE_PNG_512,
                App::Atlas => ATLAS_PNG_512,
                App::Caliper => CALIPER_PNG_512,
                App::Compass => COMPASS_PNG_512,
            }
        }

        pub const fn png_1024(self) -> &'static [u8] {
            match self {
                App::Alidade => ALIDADE_PNG_1024,
                App::Astrolabe => ASTROLABE_PNG_1024,
                App::Atlas => ATLAS_PNG_1024,
                App::Caliper => CALIPER_PNG_1024,
                App::Compass => COMPASS_PNG_1024,
            }
        }

        pub const fn png(self, size: u32) -> Option<&'static [u8]> {
            match size {
                32 => Some(self.png_32()),
                180 => Some(self.png_180()),
                256 => Some(self.png_256()),
                512 => Some(self.png_512()),
                1024 => Some(self.png_1024()),
                _ => None,
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse_hex_rgb(hex: &str) -> (u8, u8, u8) {
        assert_eq!(hex.len(), 7, "hex must be #rrggbb: {hex}");
        assert!(hex.starts_with('#'), "hex must start with #: {hex}");
        let r = u8::from_str_radix(&hex[1..3], 16).expect("valid hex red");
        let g = u8::from_str_radix(&hex[3..5], 16).expect("valid hex green");
        let b = u8::from_str_radix(&hex[5..7], 16).expect("valid hex blue");
        (r, g, b)
    }

    fn assert_color_valid(color: Color, expected_var_prefix: &str) {
        assert!(!color.name.is_empty());
        assert!(
            color.css_var.starts_with(expected_var_prefix),
            "unexpected css_var {} for {}",
            color.css_var,
            color.name
        );
        let (r, g, b) = parse_hex_rgb(color.hex);
        assert_eq!((color.r, color.g, color.b), (r, g, b), "{}", color.name);
        assert_eq!(color.rgb(), [r, g, b]);
        assert_eq!(color.rgba(), [r, g, b, color.a]);
        assert_eq!(color.a, 255);
    }

    fn assert_png_dimensions(bytes: &[u8], expected_size: u32, label: &str) {
        const PNG_SIG: &[u8; 8] = b"\x89PNG\r\n\x1a\n";
        assert!(bytes.len() >= 24, "{label}: PNG too short");
        assert_eq!(&bytes[0..8], PNG_SIG, "{label}: invalid PNG signature");
        assert_eq!(&bytes[12..16], b"IHDR", "{label}: missing IHDR chunk");
        let width = u32::from_be_bytes([bytes[16], bytes[17], bytes[18], bytes[19]]);
        let height = u32::from_be_bytes([bytes[20], bytes[21], bytes[22], bytes[23]]);
        assert_eq!((width, height), (expected_size, expected_size), "{label}: unexpected PNG dimensions");
    }

    #[test]
    fn version_matches_cargo_package() {
        assert_eq!(VERSION, env!("CARGO_PKG_VERSION"));
        assert_eq!(PREFIX, "sb");
    }

    #[test]
    fn role_data_and_mark_colors_are_consistent() {
        assert_eq!(role::ALL.len(), 15);
        for &color in role::ALL {
            assert_color_valid(color, "--sb-");
        }
        assert_eq!(role::BACKGROUND_APP.hex, "#181715");
        assert_eq!(role::BACKGROUND_APP.rgb(), [0x18, 0x17, 0x15]);
        assert_eq!(role::SURFACE.hex, "#201f1c");
        assert_eq!(role::SURFACE.css_var, "--sb-surface");
        assert_eq!(role::ACCENT.hex, "#b38b59");
        assert_eq!(role::ACCENT.rgba(), [0xb3, 0x8b, 0x59, 0xff]);

        assert_eq!(data::SERIES.len(), 5);
        assert_eq!(data::ALL, &data::SERIES);
        for &color in data::ALL {
            assert_color_valid(color, "--sb-data-");
        }
        assert_eq!(data::SMALT.hex, "#4677ad");

        assert_eq!(mark::ALL.len(), 9);
        for &color in mark::ALL {
            assert_color_valid(color, "--sb-mark-");
        }
        assert_eq!(mark::BRONZE.hex, "#b38b59");
    }

    #[test]
    fn metrics_and_scales_match_specification() {
        assert_eq!(font::family::DISPLAY[0], "Sternbild Display");
        assert_eq!(font::family::TEXT[0], "IBM Plex Sans Condensed");
        assert_eq!(font::family::MONO[0], "Source Code Pro");
        assert_eq!(font::weight::REGULAR, 400);
        assert_eq!(font::size::BODY, 17.0);
        assert_eq!(font::size::HERO, 84.0);
        assert_eq!(tracking::UI_LABEL, 0.08);
        assert_eq!(leading::BODY, 1.65);
        assert_eq!(space::S1, 4.0);
        assert_eq!(space::S18, 72.0);
        assert_eq!(layout::MAX, 1160.0);
        assert_eq!(layout::GUTTER, 28.0);
        assert_eq!(logo::MIN_SIZE, 40.0);
        assert_eq!(logo::CLEAR_SPACE, 0.5);
        assert_eq!(rule::WIDTH, 1.0);
        assert_eq!(RADIUS, 0.0);
        assert_eq!(CUT, 6.0);
        assert_eq!(motion::duration::FAST_MS, 150);
        assert_eq!(motion::duration::MOVE_MS, 300);
        assert_eq!(motion::easing::STANDARD, [0.2, 0.65, 0.3, 1.0]);
        assert_eq!(app::ROW, 22.0);
        assert_eq!(app::COMMAND_BAR, 28.0);
        assert_eq!(app::PAD, 8.0);
        assert_eq!(app::GAP, 16.0);
        assert_eq!(app::font_size::UI, 15.0);
        assert_eq!(app::font_size::DISPLAY, 16.0);
    }

    #[test]
    fn embedded_fonts_have_valid_headers_and_licenses() {
        assert!(fonts::UI_TTF.starts_with(b"\x00\x01\x00\x00"));
        assert!(fonts::MONO_TTF.starts_with(b"\x00\x01\x00\x00"));
        assert!(fonts::DISPLAY_OTF.starts_with(b"OTTO"));
        assert!(fonts::DISPLAY_WOFF2.starts_with(b"wOF2"));
        assert!(fonts::UI_LICENSE.contains("SIL OPEN FONT LICENSE"));
        assert!(fonts::MONO_LICENSE.contains("SIL OPEN FONT LICENSE"));
    }

    #[test]
    fn embedded_icons_have_valid_svg_and_png_headers() {
        let seal = std::str::from_utf8(icons::STERNBILD_SEAL_SVG).expect("seal UTF-8");
        assert!(seal.contains("<svg"));

        for app in icons::App::ALL {
            let svg = std::str::from_utf8(app.svg()).expect("icon SVG UTF-8");
            assert!(svg.contains("<svg"), "{} SVG missing <svg", app.name());

            for size in [32u32, 180, 256, 512, 1024] {
                let bytes = app.png(size).expect("supported PNG size");
                assert_png_dimensions(bytes, size, app.name());
            }
            assert!(app.png(64).is_none());
        }
    }
}
