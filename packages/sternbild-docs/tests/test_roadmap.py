"""Tests for sternbild_docs.roadmap, sternbild_docs.roadmap_check, and CLI commands."""

from __future__ import annotations

import json
from pathlib import Path

from sternbild_docs import cli, roadmap, roadmap_check

SAMPLE_PILLAR = """\
prefix: COR
title: Core Engine
order: 1
summary: Core runtime and storage components.
features:
  - id: COR-01
    title: Event Store
    status: shipped
    scope: core
    docs: docs/guide.md#event-store
    summary: Stores events in an append-only log.
    depends_on: []
  - id: COR-02
    title: Query Planner
    status: planned
    scope: supporting
    summary: Plans queries over stored events.
    depends_on: [COR-01]
"""

SAMPLE_GUIDE = """\
# Guide

## Event Store

Details about the event store.
"""


def _make_sample_repo(root: Path) -> Path:
    (root / "roadmap").mkdir(parents=True)
    (root / "roadmap" / "core.yml").write_text(SAMPLE_PILLAR, encoding="utf-8")
    (root / "docs" / "roadmap").mkdir(parents=True)
    (root / "docs" / "guide.md").write_text(SAMPLE_GUIDE, encoding="utf-8")
    (root / "docs" / "roadmap" / "index.md").write_text(
        "# Roadmap\n", encoding="utf-8"
    )
    (root / "docs" / "roadmap" / ".nav.yml").write_text(
        "nav:\n  - index.md\n  - core.md\n",
        encoding="utf-8",
    )
    return root


def test_check_roadmap_passes_without_local_schema_or_ledgers(tmp_path: Path):
    repo = _make_sample_repo(tmp_path)
    errors, warnings, summary = roadmap_check.run_checks(repo)
    assert errors == []
    assert warnings == []
    assert "2 features, 1 edges" in summary
    assert "1 shipped, 1 planned" in summary


def test_check_roadmap_strict_core_scope(tmp_path: Path):
    repo = _make_sample_repo(tmp_path)
    pillar = SAMPLE_PILLAR.replace("scope: core", "scope: supporting", 1).replace(
        "scope: supporting\n    summary: Plans", "scope: core\n    summary: Plans", 1
    )
    (repo / "roadmap" / "core.yml").write_text(pillar, encoding="utf-8")

    errors_default, _, _ = roadmap_check.run_checks(repo)
    assert errors_default == []

    errors_strict, _, _ = roadmap_check.run_checks(repo, strict_core_scope=True)
    assert any("core feature depends on COR-01" in e for e in errors_strict)


def test_check_roadmap_detects_schema_cycle_docs_nav_and_privacy_errors(tmp_path: Path):
    repo = _make_sample_repo(tmp_path)

    # Missing pillar in .nav.yml
    (repo / "docs" / "roadmap" / ".nav.yml").write_text(
        "nav:\n  - index.md\n", encoding="utf-8"
    )
    errors, _, _ = roadmap_check.run_checks(repo)
    assert any("does not list the pillar page core.md" in e for e in errors)
    (repo / "docs" / "roadmap" / ".nav.yml").write_text(
        "nav:\n  - index.md\n  - core.md\n", encoding="utf-8"
    )

    # Missing docs anchor
    (repo / "roadmap" / "core.yml").write_text(
        SAMPLE_PILLAR.replace("#event-store", "#missing-anchor"),
        encoding="utf-8",
    )
    errors, _, _ = roadmap_check.run_checks(repo)
    assert any("anchor #missing-anchor" in e for e in errors)

    # Dependency cycle
    cycle_pillar = SAMPLE_PILLAR.replace(
        "depends_on: []", "depends_on: [COR-02]"
    ).replace("status: planned", "status: shipped\n    docs: docs/guide.md")
    (repo / "roadmap" / "core.yml").write_text(cycle_pillar, encoding="utf-8")
    errors, _, _ = roadmap_check.run_checks(repo)
    assert any("dependency cycle" in e for e in errors)

    # Privacy violation (home directory path and email)
    sample_home = "/".join(["", "Users", "exampleuser", "data"])
    sample_email = "user" + chr(64) + "example.com"
    bad_privacy = SAMPLE_PILLAR.replace(
        "Stores events in an append-only log.",
        f"Reads {sample_home} and mails {sample_email}.",
    )
    (repo / "roadmap" / "core.yml").write_text(bad_privacy, encoding="utf-8")
    errors, _, _ = roadmap_check.run_checks(repo)
    assert any("home directory path" in e for e in errors)
    assert any("email address" in e for e in errors)

    # Schema failure
    (repo / "roadmap" / "core.yml").write_text(
        SAMPLE_PILLAR.replace("status: planned", "status: invalid-status"),
        encoding="utf-8",
    )
    errors, _, _ = roadmap_check.run_checks(repo)
    assert any("schema:" in e for e in errors)


def test_check_roadmap_optional_coverage_and_candidates(tmp_path: Path):
    repo = _make_sample_repo(tmp_path)
    (repo / "design").mkdir()
    (repo / "design" / "plan.md").write_text(
        "# Plan\n\n## Planner Step\n", encoding="utf-8"
    )
    (repo / "roadmap" / "coverage").mkdir()
    (repo / "roadmap" / "coverage" / "design-plan.yml").write_text(
        "title: Plan Page\n"
        "kind: page\n"
        "source: design/plan.md\n"
        "summary: Plan coverage.\n"
        "entries:\n"
        "  - heading: Planner Step\n"
        "    item: Planner work.\n"
        "    ids: [COR-02]\n",
        encoding="utf-8",
    )
    (repo / "roadmap" / "coverage" / "docs.yml").write_text(
        "title: Docs\n"
        "kind: docs\n"
        "summary: Shipped docs.\n"
        "entries:\n"
        "  - page: docs/guide.md#event-store\n"
        "    item: Event store page.\n"
        "    ids: [COR-01]\n",
        encoding="utf-8",
    )
    (repo / "candidates").mkdir()
    (repo / "candidates" / "core.yml").write_text(
        "pillar: COR\n"
        "title: Core Engine\n"
        "proposed: false\n"
        "candidates:\n"
        "  - key: compact-log\n"
        "    title: Log Compaction\n"
        "    summary: Compacts old event segments.\n"
        "    serves: Reduces storage use.\n"
        "    origin: plan-idea\n"
        "    depends_on: [COR-01]\n",
        encoding="utf-8",
    )

    errors, warnings, summary = roadmap_check.run_checks(repo)
    assert errors == []
    assert warnings == []
    assert "2 ledger entries in 2 files" in summary
    assert "1 candidates in 1 files" in summary

    # Break a candidate dependency and verify detection.
    (repo / "candidates" / "core.yml").write_text(
        (repo / "candidates" / "core.yml")
        .read_text(encoding="utf-8")
        .replace("COR-01", "COR-99"),
        encoding="utf-8",
    )
    errors_bad, _, _ = roadmap_check.run_checks(repo)
    assert any("depends_on COR-99, which does not exist" in e for e in errors_bad)


def test_cli_check_roadmap_and_build_roadmap(tmp_path: Path, capsys):
    repo = _make_sample_repo(tmp_path / "repo")
    out_dir = tmp_path / "out"

    rc = cli.main(["check-roadmap", "--root", str(repo), "--strict-titles"])
    stdout = capsys.readouterr().out
    assert rc == 0
    assert stdout.startswith("ok: 2 features, 1 edges")

    rc_build = cli.main(
        [
            "build-roadmap",
            "--root",
            str(repo),
            "--out",
            str(out_dir),
            "--site-url",
            "https://example.org/docs/",
        ]
    )
    assert rc_build == 0
    assert (out_dir / "roadmap" / "core.md").is_file()
    assert (out_dir / "roadmap" / "cor-01.md").is_file()
    assert (out_dir / "roadmap" / "cor-02.md").is_file()
    graph = json.loads((out_dir / "roadmap" / "graph.json").read_text(encoding="utf-8"))
    assert len(graph["pillars"]) == 1
    assert len(graph["nodes"]) == 2
    assert len(graph["edges"]) == 1
    reg = json.loads((out_dir / "roadmap.json").read_text(encoding="utf-8"))
    assert reg["site"] == "https://example.org/docs/"
    assert "candidates" not in (out_dir / "roadmap" / "core.md").read_text(
        encoding="utf-8"
    )
    assert "Sprint" not in (out_dir / "roadmap" / "cor-01.md").read_text(
        encoding="utf-8"
    )


def test_extended_registry_generation_without_hardcoded_urls(tmp_path: Path):
    repo = _make_sample_repo(tmp_path)
    (repo / "design").mkdir()
    (repo / "design" / "plan.md").write_text("# Plan\n\n## Details\n", encoding="utf-8")
    extended = """\
prefix: COR
title: Core Engine
order: 1
summary: Core runtime components.
features:
  - id: COR-01
    title: Event Store
    status: shipped
    scope: core
    docs: docs/guide.md#event-store
    summary: Stores events.
    depends_on: []
    issue: 12
  - id: COR-02
    title: Streaming Sink
    status: built
    scope: supporting
    summary: Streams events out.
    depends_on: [COR-01]
    sprint: "1.2"
    branches: [feature/sink]
    in_progress: true
    design: design/plan.md#details
    draft: true
"""
    (repo / "roadmap" / "core.yml").write_text(extended, encoding="utf-8")
    generated = dict(
        (src_uri, content)
        for src_uri, content, _ in roadmap.generate(
            repo,
            site="https://example.org/docs/",
            repo_url="https://example.org/org/project",
        )
    )
    cor02 = generated["roadmap/cor-02.md"]
    assert '!!! note "Draft"' in cor02
    assert "roadmap-badge--progress" in cor02
    assert "| Sprint | 1.2 |" in cor02
    assert "| Branches | `feature/sink` |" in cor02
    assert "https://example.org/org/project/blob/main/design/plan.md#details" in cor02
    cor01 = generated["roadmap/cor-01.md"]
    assert "[#12](https://example.org/org/project/issues/12)" in cor01


def test_username_check_skips_ci_and_generic_accounts(monkeypatch):
    from sternbild_docs.roadmap_check import _privacy_hits

    title = "CLI Quota and Probe Runner"
    monkeypatch.delenv("CI", raising=False)
    monkeypatch.setenv("USER", "runner")
    assert "local username" not in _privacy_hits(title)

    monkeypatch.setenv("USER", "probe")
    assert "local username" in _privacy_hits(title)
    monkeypatch.setenv("CI", "true")
    assert "local username" not in _privacy_hits(title)
