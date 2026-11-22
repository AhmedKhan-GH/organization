"""Tests for sternbild_docs.headings and the check-headings CLI subcommand."""

from __future__ import annotations

import io
from pathlib import Path

from sternbild_docs import cli, headings


def test_judge_accepts_valid_title_case_headings():
    valid = [
        "First Applet",
        "Up-to-Date Guide for macOS",
        "Using `cargo` and WebGPU",
        "1. Getting Started on arm64",
        "Install with pip and uv",
        "Run ctest and cmake",
        "Check sqlite and egui State",
        "Release v1.2 Notes",
    ]
    for title in valid:
        assert headings.judge(title) is None, title


def test_judge_rejects_rule_violations():
    cases = [
        ("The First Applet", "starts with an article"),
        ("A Quick Guide", "starts with an article"),
        ("An Overview", "starts with an article"),
        ("Your First Applet", "starts with Your"),
        ("Input: Play Button", "contains a colon"),
        ("Why Does It Fail?", "question"),
        ("Getting started", "not Title Case (started)"),
        ("in-Tree Builds", "not Title Case (in-Tree)"),
    ]
    for title, expected in cases:
        reason = headings.judge(title)
        assert reason is not None
        assert expected in reason


def test_judge_supports_extra_identifier_words():
    assert headings.judge("Custom mytool Command") is not None
    assert headings.judge("Custom mytool Command", extra_words=["mytool"]) is None


def test_headings_skips_frontmatter_fences_and_h4(tmp_path: Path):
    doc = tmp_path / "sample.md"
    doc.write_text(
        "---\n"
        "title: not checked\n"
        "---\n"
        "\n"
        "# Valid Page\n"
        "\n"
        "```markdown\n"
        "# the fenced heading: bad?\n"
        "```\n"
        "\n"
        "## Valid Section\n"
        "\n"
        "#### lower case h4 is ignored\n",
        encoding="utf-8",
    )
    found = list(headings.headings(doc))
    assert found == [(5, 1, "Valid Page"), (11, 2, "Valid Section")]


def test_cli_check_headings_pass_and_fail(tmp_path: Path, capsys):
    docs_dir = tmp_path / "docs"
    docs_dir.mkdir()
    (docs_dir / "good.md").write_text(
        "# Good Title\n\n## Second Section\n",
        encoding="utf-8",
    )

    rc = cli.main(["check-headings", str(docs_dir)])
    out = capsys.readouterr().out
    assert rc == 0
    assert "0 of 2 docs headings break the title rule" in out

    (docs_dir / "bad.md").write_text(
        "# The Bad Title\n\n## Broken: Heading\n",
        encoding="utf-8",
    )
    rc_bad = cli.main(["check-headings", str(docs_dir)])
    out_bad = capsys.readouterr().out
    assert rc_bad == 1
    assert "starts with an article" in out_bad
    assert "contains a colon" in out_bad
    assert "2 of 4 docs headings break the title rule" in out_bad


def test_cli_check_headings_extra_words_and_missing_path(tmp_path: Path, capsys):
    docs_dir = tmp_path / "docs"
    docs_dir.mkdir()
    (docs_dir / "tool.md").write_text("# Using custombin Tool\n", encoding="utf-8")

    assert cli.main(["check-headings", str(docs_dir)]) == 1
    capsys.readouterr()

    assert (
        cli.main(["check-headings", "--extra-words", "custombin", str(docs_dir)]) == 0
    )
    capsys.readouterr()

    rc_missing = headings.check_headings(
        [tmp_path / "does-not-exist"],
        stream=io.StringIO(),
        err_stream=io.StringIO(),
    )
    assert rc_missing == 2
