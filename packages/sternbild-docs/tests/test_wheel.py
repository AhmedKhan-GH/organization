"""Verify that building a wheel includes all templates, brand assets, and schemas."""

from __future__ import annotations

import subprocess
import sys
import zipfile
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parent.parent


def test_wheel_contains_all_package_data(tmp_path: Path):
    wheel_dir = tmp_path / "dist"
    wheel_dir.mkdir()

    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "pip",
            "wheel",
            "--no-deps",
            "--no-build-isolation",
            "--wheel-dir",
            str(wheel_dir),
            str(PACKAGE_ROOT),
        ],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stdout + result.stderr

    wheels = list(wheel_dir.glob("sternbild_docs-1.0.0-*.whl"))
    assert len(wheels) == 1, list(wheel_dir.iterdir())

    with zipfile.ZipFile(wheels[0]) as archive:
        names = set(archive.namelist())

    expected = [
        # Brand SVGs and fonts
        "sternbild_docs/assets/brand/alidade-icon-minerals.svg",
        "sternbild_docs/assets/brand/astrolabe-icon-minerals.svg",
        "sternbild_docs/assets/brand/atlas-icon-minerals.svg",
        "sternbild_docs/assets/brand/caliper-icon-minerals.svg",
        "sternbild_docs/assets/brand/compass-icon-minerals.svg",
        "sternbild_docs/assets/brand/sternbild-seal.svg",
        "sternbild_docs/assets/brand/fonts/IBMPlexSansCondensed-Regular.ttf",
        "sternbild_docs/assets/brand/fonts/OFL-ibmplexsanscondensed.txt",
        "sternbild_docs/assets/brand/fonts/SourceCodePro-Regular.ttf",
        "sternbild_docs/assets/brand/fonts/OFL-sourcecodepro.txt",
        "sternbild_docs/assets/brand/fonts/SternbildDisplay-Regular.woff2",
        # Optional candidate assets
        "sternbild_docs/assets/candidates/candidates.css",
        "sternbild_docs/assets/candidates/candidates.js",
        "sternbild_docs/assets/candidates/navigator.css",
        "sternbild_docs/assets/candidates/navigator.js",
        # Theme templates and assets
        "sternbild_docs/theme/main.html",
        "sternbild_docs/theme/roadmap.html",
        "sternbild_docs/theme/partials/toc.html",
        "sternbild_docs/theme/partials/sb-toc.html",
        "sternbild_docs/theme/assets/sternbild.css",
        "sternbild_docs/theme/assets/toc.js",
        "sternbild_docs/theme/assets/vendor/mermaid-11.17.2/mermaid.min.js",
        "sternbild_docs/theme/assets/vendor/mermaid-11.17.2/LICENSE",
        "sternbild_docs/theme/assets/roadmap/roadmap.css",
        "sternbild_docs/theme/assets/roadmap/roadmap.js",
        "sternbild_docs/theme/assets/roadmap/window.js",
        "sternbild_docs/theme/assets/roadmap/vendor/elkjs-0.12.1/elk.bundled.js",
        "sternbild_docs/theme/assets/roadmap/vendor/elkjs-0.12.1/LICENSE.md",
        # Schemas
        "sternbild_docs/schemas/roadmap.schema.json",
        "sternbild_docs/schemas/candidates.schema.json",
        "sternbild_docs/schemas/coverage.schema.json",
    ]
    missing = [item for item in expected if item not in names]
    assert missing == [], f"missing files in wheel: {missing}"

    # Verify brand fonts and SVGs were not duplicated into theme/assets/.
    duplicated = [
        name
        for name in names
        if name.startswith("sternbild_docs/theme/assets/fonts/")
        or name.startswith("sternbild_docs/theme/assets/brand/")
    ]
    assert duplicated == [], f"duplicated brand assets in theme: {duplicated}"
