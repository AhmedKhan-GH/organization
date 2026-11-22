"""End-to-end MkDocs build tests for SternbildPlugin."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

from sternbild_docs.plugin import resolve_accent


def _write_sample_site(
    root: Path,
    *,
    plugin_block: str,
    theme_block: str = "theme:\n  name: material\n",
    with_candidates: bool = False,
) -> Path:
    (root / "docs" / "roadmap").mkdir(parents=True)
    (root / "roadmap").mkdir(parents=True)

    (root / "docs" / ".nav.yml").write_text(
        "nav:\n"
        "  - index.md\n"
        "  - guide.md\n"
        "  - roadmap\n",
        encoding="utf-8",
    )
    (root / "docs" / "index.md").write_text(
        "# Sample Docs\n\nWelcome to the sample site.\n",
        encoding="utf-8",
    )
    (root / "docs" / "contents.md").write_text(
        "# Contents\n\n<!-- docs-tree -->\n",
        encoding="utf-8",
    )
    (root / "docs" / "guide.md").write_text(
        "# Operations Guide\n\n"
        "## Storage Engine\n\n"
        "Append-only log storage.\n\n"
        "## Verification\n\n"
        "Run automated checks.\n",
        encoding="utf-8",
    )
    (root / "docs" / "roadmap" / "index.md").write_text(
        "---\n"
        "template: roadmap.html\n"
        "roadmap_graph: true\n"
        "hide:\n"
        "  - navigation\n"
        "  - toc\n"
        "---\n\n"
        "# Roadmap\n\n"
        '<div id="roadmap-graph" class="roadmap-window" data-graph="graph.json"></div>\n',
        encoding="utf-8",
    )
    (root / "docs" / "roadmap" / ".nav.yml").write_text(
        "nav:\n  - index.md\n  - core.md\n",
        encoding="utf-8",
    )
    (root / "roadmap" / "core.yml").write_text(
        "prefix: COR\n"
        "title: Core Runtime\n"
        "order: 1\n"
        "summary: Core storage and query services.\n"
        "features:\n"
        "  - id: COR-01\n"
        "    title: Storage Engine\n"
        "    status: shipped\n"
        "    scope: core\n"
        "    docs: docs/guide.md#storage-engine\n"
        "    summary: Persists structured records.\n"
        "    depends_on: []\n"
        "  - id: COR-02\n"
        "    title: Query Index\n"
        "    status: planned\n"
        "    scope: supporting\n"
        "    summary: Indexes stored records for fast lookup.\n"
        "    depends_on: [COR-01]\n",
        encoding="utf-8",
    )

    if with_candidates:
        (root / "candidates").mkdir(parents=True)
        (root / "candidates" / "core.yml").write_text(
            "pillar: COR\n"
            "title: Core Runtime\n"
            "proposed: false\n"
            "candidates:\n"
            "  - key: cold-archive\n"
            "    title: Cold Archive\n"
            "    summary: Moves old blocks to cold storage.\n"
            "    serves: Cuts active disk usage.\n"
            "    origin: plan-idea\n"
            "    depends_on: [COR-01]\n",
            encoding="utf-8",
        )
        (root / "docs" / "roadmap" / ".nav.yml").write_text(
            "nav:\n  - index.md\n  - core.md\n  - candidates/index.md\n",
            encoding="utf-8",
        )

    mkdocs_yml = (
        "site_name: Sample Project\n"
        "docs_dir: docs\n"
        "site_dir: site-out\n"
        "validation:\n"
        "  anchors: warn\n"
        f"{theme_block}"
        "plugins:\n"
        "  - search\n"
        "  - awesome-nav\n"
        f"{plugin_block}"
        "markdown_extensions:\n"
        "  - admonition\n"
        "  - attr_list\n"
        "  - toc:\n"
        "      permalink: true\n"
    )
    (root / "mkdocs.yml").write_text(mkdocs_yml, encoding="utf-8")
    return root / "site-out"


def _run_mkdocs_strict(root: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "mkdocs", "build", "--strict"],
        cwd=str(root),
        capture_output=True,
        text=True,
    )


def test_resolve_accent_presets_and_hex():
    assert resolve_accent("lapis") == ("#4a5bac", "#6b7fd6")
    assert resolve_accent("turquoise") == ("#469ea8", "#6bc5cf")
    assert resolve_accent("bronze") == ("#b38b59", "#c49b68")
    assert resolve_accent("#4a5bac") == ("#4a5bac", "#6b7fd6")
    accent, hover = resolve_accent("#336699")
    assert accent == "#336699"
    assert hover.startswith("#") and len(hover) == 7 and hover != accent
    with pytest.raises(Exception):
        resolve_accent("not-a-color")


def test_mkdocs_strict_build_with_roadmap_icon_and_accent(tmp_path: Path):
    site_dir = _write_sample_site(
        tmp_path,
        plugin_block=(
            "  - sternbild:\n"
            "      roadmap: roadmap/\n"
            "      icon: assets/brand/astrolabe-icon-minerals.svg\n"
            '      accent: "#4a5bac"\n'
        ),
    )

    result = _run_mkdocs_strict(tmp_path)
    assert result.returncode == 0, result.stdout + result.stderr

    # Generated HTML pages
    guide_html = (site_dir / "guide" / "index.html").read_text(encoding="utf-8")
    assert "assets/sternbild.css" in guide_html
    assert "--sb-accent: #4a5bac;" in guide_html
    assert "--sb-accent-hover: #6b7fd6;" in guide_html
    assert "assets/brand/astrolabe-icon-minerals.svg" in guide_html
    assert "sb-toc-inline" in guide_html
    assert "fonts.googleapis.com" not in guide_html

    # Contents tree hook
    contents_html = (site_dir / "contents" / "index.html").read_text(encoding="utf-8")
    assert 'class="docs-tree"' in contents_html
    assert "Operations Guide" in contents_html

    # Roadmap graph page, pillar page, feature page, and JSON files
    rm_index_html = (site_dir / "roadmap" / "index.html").read_text(encoding="utf-8")
    assert "assets/roadmap/roadmap.css" in rm_index_html
    assert "assets/roadmap/roadmap.js" in rm_index_html
    assert "assets/roadmap/vendor/elkjs-0.12.1/elk.bundled.js" in rm_index_html
    assert "navigator.js" not in rm_index_html

    cor01_html = (site_dir / "roadmap" / "cor-01" / "index.html").read_text(
        encoding="utf-8"
    )
    assert "Storage Engine" in cor01_html
    assert "roadmap-badge--shipped" in cor01_html
    assert "Coverage Ledger" not in cor01_html

    graph = json.loads(
        (site_dir / "roadmap" / "graph.json").read_text(encoding="utf-8")
    )
    assert [p["prefix"] for p in graph["pillars"]] == ["COR"]
    assert [n["id"] for n in graph["nodes"]] == ["COR-01", "COR-02"]
    assert len(graph["edges"]) == 1

    registry = json.loads((site_dir / "roadmap.json").read_text(encoding="utf-8"))
    assert len(registry["features"]) == 2

    # Canonical fonts and brand icons served from assets/brand/
    assert (site_dir / "assets" / "fonts" / "SternbildDisplay-Regular.woff2").is_file()
    assert (
        site_dir / "assets" / "fonts" / "IBMPlexSansCondensed-Regular.ttf"
    ).is_file()
    assert (site_dir / "assets" / "fonts" / "SourceCodePro-Regular.ttf").is_file()
    assert (site_dir / "assets" / "brand" / "astrolabe-icon-minerals.svg").is_file()
    assert (site_dir / "assets" / "brand" / "sternbild-seal.svg").is_file()

    # Optional candidates assets stay absent when candidates is disabled
    assert not (site_dir / "assets" / "candidates.css").exists()
    assert not (site_dir / "assets" / "candidates.js").exists()
    assert not (site_dir / "assets" / "roadmap" / "navigator.js").exists()


def test_mkdocs_strict_build_default_bronze_and_project_relative_icon(tmp_path: Path):
    custom_icon = tmp_path / "site" / "assets" / "custom-mark.svg"
    custom_icon.parent.mkdir(parents=True)
    custom_icon.write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"></svg>',
        encoding="utf-8",
    )

    site_dir = _write_sample_site(
        tmp_path,
        plugin_block=(
            "  - sternbild:\n"
            "      roadmap: roadmap/\n"
            "      icon: site/assets/custom-mark.svg\n"
        ),
    )

    result = _run_mkdocs_strict(tmp_path)
    assert result.returncode == 0, result.stdout + result.stderr

    index_html = (site_dir / "index.html").read_text(encoding="utf-8")
    assert "--sb-accent:" not in index_html
    assert "assets/custom-mark.svg" in index_html
    assert (site_dir / "assets" / "custom-mark.svg").is_file()


def test_mkdocs_strict_build_with_optional_candidates(tmp_path: Path):
    site_dir = _write_sample_site(
        tmp_path,
        plugin_block=(
            "  - sternbild:\n"
            "      roadmap: roadmap/\n"
            "      candidates: candidates/\n"
            "      icon: caliper-icon-minerals.svg\n"
            "      accent: turquoise\n"
        ),
        with_candidates=True,
    )

    result = _run_mkdocs_strict(tmp_path)
    assert result.returncode == 0, result.stdout + result.stderr

    assert (site_dir / "assets" / "candidates.css").is_file()
    assert (site_dir / "assets" / "candidates.js").is_file()
    assert (site_dir / "assets" / "roadmap" / "navigator.css").is_file()
    assert (site_dir / "assets" / "roadmap" / "navigator.js").is_file()
    assert (site_dir / "roadmap" / "candidates.json").is_file()

    cand_nav = (
        site_dir / "roadmap" / "candidates" / "index.html"
    ).read_text(encoding="utf-8")
    assert "assets/roadmap/navigator.js" in cand_nav
    assert "--sb-accent: #469ea8;" in cand_nav

    cand_pillar = (
        site_dir / "roadmap" / "candidates" / "core" / "index.html"
    ).read_text(encoding="utf-8")
    assert "assets/candidates.css" in cand_pillar
    assert "Cold Archive" in cand_pillar


def test_custom_dir_precedence_explicit_logo_contents_off_and_mermaid(tmp_path: Path):
    custom_theme = tmp_path / "custom-theme"
    custom_theme.mkdir()
    (custom_theme / "main.html").write_text(
        '{% extends "base.html" %}\n'
        "{% block extrahead %}{{ super() }}<!-- custom-theme-override -->{% endblock %}\n",
        encoding="utf-8",
    )
    site_dir = _write_sample_site(
        tmp_path,
        theme_block=(
            "theme:\n"
            "  name: material\n"
            "  custom_dir: custom-theme\n"
            "  logo: assets/brand/caliper-icon-minerals.svg\n"
            "  favicon: assets/brand/caliper-icon-minerals.svg\n"
        ),
        plugin_block=(
            "  - sternbild:\n"
            "      roadmap: roadmap/\n"
            "      icon: assets/brand/astrolabe-icon-minerals.svg\n"
            "      contents: false\n"
        ),
    )

    result = _run_mkdocs_strict(tmp_path)
    assert result.returncode == 0, result.stdout + result.stderr

    # Explicit custom_dir overrides package main.html; explicit logo/favicon beat plugin icon.
    index_html = (site_dir / "index.html").read_text(encoding="utf-8")
    assert "<!-- custom-theme-override -->" in index_html
    assert "assets/brand/caliper-icon-minerals.svg" in index_html
    assert "assets/brand/astrolabe-icon-minerals.svg" not in index_html

    # Package roadmap.html still resolves from sternbild_docs/theme when custom_dir omits it.
    rm_html = (site_dir / "roadmap" / "index.html").read_text(encoding="utf-8")
    assert "assets/roadmap/roadmap.js" in rm_html

    # contents: false leaves the placeholder untouched.
    contents_html = (site_dir / "contents" / "index.html").read_text(encoding="utf-8")
    assert "<!-- docs-tree -->" in contents_html
    assert 'class="docs-tree"' not in contents_html


def test_mermaid_script_loads_only_on_diagram_pages(tmp_path: Path):
    site_dir = _write_sample_site(
        tmp_path,
        plugin_block="  - sternbild:\n      roadmap: roadmap/\n",
    )
    (tmp_path / "docs" / "diagram.md").write_text(
        "# Diagram Page\n\n"
        '<pre class="mermaid"><code>graph LR\n  A --> B\n</code></pre>\n',
        encoding="utf-8",
    )
    (tmp_path / "docs" / ".nav.yml").write_text(
        "nav:\n  - index.md\n  - guide.md\n  - diagram.md\n  - roadmap\n",
        encoding="utf-8",
    )

    result = _run_mkdocs_strict(tmp_path)
    assert result.returncode == 0, result.stdout + result.stderr

    diagram_html = (site_dir / "diagram" / "index.html").read_text(encoding="utf-8")
    guide_html = (site_dir / "guide" / "index.html").read_text(encoding="utf-8")
    assert "assets/vendor/mermaid-11.17.2/mermaid.min.js" in diagram_html
    assert "assets/vendor/mermaid-11.17.2/mermaid.min.js" not in guide_html
    assert (site_dir / "assets" / "vendor" / "mermaid-11.17.2" / "mermaid.min.js").is_file()

