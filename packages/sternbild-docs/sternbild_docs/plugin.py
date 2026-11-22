"""MkDocs plugin that provides the Sternbild theme, brand assets, contents tree, and roadmap."""

from __future__ import annotations

import re
from pathlib import Path

from mkdocs.config import base, config_options as c
from mkdocs.exceptions import ConfigurationError, PluginError
from mkdocs.plugins import BasePlugin
from mkdocs.structure.files import File, InclusionLevel

from sternbild_docs import contents, roadmap

PACKAGE_DIR = Path(__file__).resolve().parent
THEME_DIR = PACKAGE_DIR / "theme"
BRAND_DIR = PACKAGE_DIR / "assets" / "brand"
BRAND_FONTS_DIR = BRAND_DIR / "fonts"
CANDIDATES_ASSETS_DIR = PACKAGE_DIR / "assets" / "candidates"

MATERIAL_DEFAULT_FONT = {"text": "Roboto", "code": "Roboto Mono"}
MATERIAL_DEFAULT_FAVICON = "assets/images/favicon.png"

DEFAULT_PALETTE = {
    "scheme": "slate",
    "primary": "custom",
    "accent": "custom",
}

DEFAULT_FEATURES = [
    "navigation.tabs",
    "navigation.sections",
    "navigation.indexes",
    "navigation.prune",
    "navigation.tracking",
    "toc.follow",
    "content.code.copy",
    "search.suggest",
]

# Named accent presets: (primary hex, hover highlight hex).
# Values match design/tokens.json (bronze) and the Minerals icon rim gradients.
ACCENT_PRESETS: dict[str, tuple[str, str]] = {
    "bronze": ("#b38b59", "#c49b68"),
    "lapis": ("#4a5bac", "#6b7fd6"),
    "turquoise": ("#469ea8", "#6bc5cf"),
    "malachite": ("#6cb486", "#90dcaa"),
    "jade": ("#6cb486", "#90dcaa"),
    "cinnabar": ("#bf6b60", "#ea8f83"),
    "jasper": ("#bf6b60", "#ea8f83"),
    "terracotta": ("#bf6b60", "#ea8f83"),
    "amethyst": ("#b391d2", "#dab6fc"),
}

_PRESET_BY_HEX: dict[str, str] = {
    primary.lower(): hover for primary, hover in ACCENT_PRESETS.values()
}

_HEX_RE = re.compile(r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")


def _normalize_hex(raw: str) -> str:
    value = raw.strip().lower()
    if len(value) == 4:
        return "#" + "".join(ch * 2 for ch in value[1:])
    return value


def _lighten_hex(hex_color: str, amount: float = 0.16) -> str:
    r = int(hex_color[1:3], 16)
    g = int(hex_color[3:5], 16)
    b = int(hex_color[5:7], 16)
    lr = min(255, round(r + (255 - r) * amount))
    lg = min(255, round(g + (255 - g) * amount))
    lb = min(255, round(b + (255 - b) * amount))
    return "#%02x%02x%02x" % (lr, lg, lb)


def resolve_accent(value: str | None) -> tuple[str, str] | None:
    """Resolve a mineral preset name or CSS hex string to (accent, hover) hex values."""
    if value is None:
        return None
    text = value.strip()
    if not text:
        return None
    key = text.lower()
    if key in ACCENT_PRESETS:
        return ACCENT_PRESETS[key]
    if _HEX_RE.match(text):
        normalized = _normalize_hex(text)
        hover = _PRESET_BY_HEX.get(normalized) or _lighten_hex(normalized)
        return normalized, hover
    valid = ", ".join(sorted(ACCENT_PRESETS))
    raise ConfigurationError(
        "sternbild plugin accent %r must be a #RGB/#RRGGBB hex color or one of: %s"
        % (value, valid)
    )


class SternbildPluginConfig(base.Config):
    """Configuration schema for the sternbild MkDocs plugin."""

    icon = c.Optional(c.Type(str))
    accent = c.Optional(c.Type(str))
    roadmap = c.Optional(c.Type(str))
    candidates = c.Optional(c.Type(str))
    coverage = c.Optional(c.Type((str, bool)))
    contents = c.Type(bool, default=True)
    repo_url = c.Optional(c.Type(str))


class SternbildPlugin(BasePlugin[SternbildPluginConfig]):
    """Provide the Sternbild theme, brand assets, contents tree, and roadmap generator."""

    def __init__(self) -> None:
        super().__init__()
        self._contents_tree: str = ""
        self._project_root: Path = Path.cwd()
        self._roadmap_dir: Path | None = None
        self._candidates_dir: Path | None = None
        self._coverage_dir: Path | None = None
        self._custom_icon: tuple[str, Path] | None = None
        self._docs_prefix: str = "docs"

    def _resolve_project_path(self, rel_or_abs: str) -> Path:
        candidate = Path(rel_or_abs)
        if candidate.is_absolute():
            return candidate
        return (self._project_root / candidate).resolve()

    def _resolve_icon(self, icon: str, config) -> str:
        raw = icon.strip().replace("\\", "/")
        if raw.startswith("assets/brand/"):
            name = raw[len("assets/brand/"):]
            if (BRAND_DIR / name).is_file():
                return "assets/brand/" + name
        if "/" not in raw:
            if (BRAND_DIR / raw).is_file():
                return "assets/brand/" + raw
            mineral = f"{raw}-icon-minerals.svg"
            if (BRAND_DIR / mineral).is_file():
                return "assets/brand/" + mineral

        docs_dir = Path(config.docs_dir).resolve()
        docs_candidate = (docs_dir / raw).resolve()
        if docs_candidate.is_file():
            try:
                return docs_candidate.relative_to(docs_dir).as_posix()
            except ValueError:
                pass

        project_candidate = self._resolve_project_path(raw)
        if project_candidate.is_file():
            try:
                return project_candidate.relative_to(docs_dir).as_posix()
            except ValueError:
                src_uri = "assets/" + project_candidate.name
                self._custom_icon = (src_uri, project_candidate)
                return src_uri

        raise ConfigurationError(
            "sternbild plugin icon %r was not found in brand assets or project files"
            % icon
        )

    def _ensure_watch(self, config, directory: Path | None) -> None:
        if directory is None or not directory.is_dir():
            return
        watch_list = config.get("watch")
        if watch_list is None:
            return
        target = str(directory)
        if target not in watch_list:
            watch_list.append(target)

    def on_config(self, config):
        self._contents_tree = ""
        self._custom_icon = None

        config_file = getattr(config, "config_file_path", None)
        self._project_root = (
            Path(config_file).resolve().parent if config_file else Path.cwd()
        )
        docs_dir = Path(config.docs_dir).resolve()
        try:
            self._docs_prefix = docs_dir.relative_to(self._project_root).as_posix()
        except ValueError:
            self._docs_prefix = "docs"

        # Register package theme overrides ahead of Material, behind any user custom_dir.
        theme_str = str(THEME_DIR)
        if theme_str not in config.theme.dirs:
            insert_at = 1 if getattr(config.theme, "custom_dir", None) else 0
            config.theme.dirs.insert(insert_at, theme_str)

        # Apply Sternbild defaults when the site uses a minimal Material theme config.
        if config.theme.get("font") == MATERIAL_DEFAULT_FONT:
            config.theme["font"] = False
        if "palette" not in config.theme or not config.theme.get("palette"):
            config.theme["palette"] = dict(DEFAULT_PALETTE)
        if not config.theme.get("features"):
            config.theme["features"] = list(DEFAULT_FEATURES)

        if self.config.icon:
            icon_uri = self._resolve_icon(self.config.icon, config)
            if not config.theme.get("logo"):
                config.theme["logo"] = icon_uri
            if config.theme.get("favicon") in (None, "", MATERIAL_DEFAULT_FAVICON):
                config.theme["favicon"] = icon_uri

        accent_pair = resolve_accent(self.config.accent)

        self._roadmap_dir = (
            self._resolve_project_path(self.config.roadmap)
            if self.config.roadmap
            else None
        )
        self._candidates_dir = (
            self._resolve_project_path(self.config.candidates)
            if self.config.candidates
            else None
        )
        coverage_opt = self.config.coverage
        if isinstance(coverage_opt, str) and coverage_opt.strip():
            self._coverage_dir = self._resolve_project_path(coverage_opt)
        elif coverage_opt is True and self._roadmap_dir is not None:
            self._coverage_dir = self._roadmap_dir / roadmap.COVERAGE
        else:
            self._coverage_dir = None

        self._ensure_watch(config, self._roadmap_dir)
        self._ensure_watch(config, self._candidates_dir)
        self._ensure_watch(config, self._coverage_dir)

        extra = config.extra
        sb_extra = dict(extra.get("sternbild") or {})
        sb_extra["candidates"] = bool(self._candidates_dir)
        if accent_pair is not None:
            sb_extra["accent"] = accent_pair[0]
            sb_extra["accent_hover"] = accent_pair[1]
        extra["sternbild"] = sb_extra
        return config

    def _add_file_if_missing(
        self,
        files,
        config,
        src_uri: str,
        *,
        abs_src_path: Path | None = None,
        content: str | bytes | None = None,
        inclusion: InclusionLevel = InclusionLevel.UNDEFINED,
    ) -> None:
        if files.get_file_from_path(src_uri) is not None:
            return
        if abs_src_path is not None:
            files.append(
                File.generated(
                    config,
                    src_uri,
                    abs_src_path=str(abs_src_path),
                    inclusion=inclusion,
                )
            )
        else:
            files.append(
                File.generated(
                    config,
                    src_uri,
                    content=content,
                    inclusion=inclusion,
                )
            )

    def on_files(self, files, config):
        # Serve canonical fonts from assets/brand/fonts/ at assets/fonts/.
        if BRAND_FONTS_DIR.is_dir():
            for font_file in sorted(BRAND_FONTS_DIR.iterdir()):
                if font_file.is_file():
                    self._add_file_if_missing(
                        files,
                        config,
                        f"assets/fonts/{font_file.name}",
                        abs_src_path=font_file,
                    )

        # Serve canonical brand SVGs at assets/brand/.
        if BRAND_DIR.is_dir():
            for svg_file in sorted(BRAND_DIR.glob("*.svg")):
                if svg_file.is_file():
                    self._add_file_if_missing(
                        files,
                        config,
                        f"assets/brand/{svg_file.name}",
                        abs_src_path=svg_file,
                    )

        # Serve custom project-relative icon when configured outside docs_dir.
        if self._custom_icon is not None:
            src_uri, icon_path = self._custom_icon
            self._add_file_if_missing(
                files,
                config,
                src_uri,
                abs_src_path=icon_path,
            )

        # Serve optional candidates assets only when candidates is enabled.
        if self._candidates_dir is not None and CANDIDATES_ASSETS_DIR.is_dir():
            candidate_mappings = [
                ("assets/candidates.css", CANDIDATES_ASSETS_DIR / "candidates.css"),
                ("assets/candidates.js", CANDIDATES_ASSETS_DIR / "candidates.js"),
                (
                    "assets/roadmap/navigator.css",
                    CANDIDATES_ASSETS_DIR / "navigator.css",
                ),
                (
                    "assets/roadmap/navigator.js",
                    CANDIDATES_ASSETS_DIR / "navigator.js",
                ),
            ]
            for src_uri, asset_path in candidate_mappings:
                if asset_path.is_file():
                    self._add_file_if_missing(
                        files,
                        config,
                        src_uri,
                        abs_src_path=asset_path,
                    )

        # Generate roadmap pages and data files when roadmap is configured.
        if self._roadmap_dir is not None:
            site_url = config.get("site_url") or "/"
            repo_url = self.config.repo_url or config.get("repo_url") or None
            try:
                generated = roadmap.generate(
                    self._project_root,
                    site=site_url,
                    roadmap_dir=self._roadmap_dir,
                    candidates_dir=self._candidates_dir,
                    coverage_dir=self._coverage_dir,
                    repo_url=repo_url,
                    docs_prefix=self._docs_prefix,
                )
            except roadmap.RegistryError as err:
                raise PluginError(str(err)) from err
            for src_uri, content, in_nav in generated:
                inclusion = (
                    InclusionLevel.UNDEFINED if in_nav else InclusionLevel.NOT_IN_NAV
                )
                self._add_file_if_missing(
                    files,
                    config,
                    src_uri,
                    content=content,
                    inclusion=inclusion,
                )
        return files

    def on_nav(self, nav, config, files):
        if self.config.contents:
            self._contents_tree = contents.build_tree_html(
                nav,
                use_directory_urls=bool(config.use_directory_urls),
            )
        return nav

    def on_page_markdown(self, markdown, page, config, files):
        if self.config.contents:
            return contents.render_contents_markdown(
                markdown,
                page,
                self._contents_tree,
            )
        return markdown
