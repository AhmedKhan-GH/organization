"""Command-line interface for sternbild-docs."""

from __future__ import annotations

import argparse
import pathlib
import sys
from collections.abc import Sequence

from sternbild_docs import __version__, headings, roadmap, roadmap_check


def _parse_extra_words(values: Sequence[str] | None) -> list[str]:
    words: list[str] = []
    for item in values or ():
        for piece in item.replace(",", " ").split():
            if piece:
                words.append(piece)
    return words


def _cmd_check_headings(args: argparse.Namespace) -> int:
    paths = [pathlib.Path(p) for p in args.paths]
    root = pathlib.Path(args.root) if args.root else None
    extra = _parse_extra_words(args.extra_words)
    return headings.check_headings(
        paths,
        root=root,
        extra_words=extra,
        list_headings=args.list,
    )


def _cmd_check_roadmap(args: argparse.Namespace) -> int:
    root = pathlib.Path(args.root)
    check_candidates = False if args.no_candidates else (
        True if args.candidates else None
    )
    check_coverage = False if args.no_coverage else (
        True if args.coverage else None
    )
    errors, warnings, summary = roadmap_check.run_checks(
        root,
        roadmap_dir=args.roadmap,
        candidates_dir=args.candidates,
        coverage_dir=args.coverage,
        check_candidates_enabled=check_candidates,
        check_coverage_enabled=check_coverage,
        strict_titles=args.strict_titles,
        strict_core_scope=args.strict_core_scope,
    )
    for line in errors + warnings:
        print(line)
    if errors:
        return 1
    print("ok: " + summary)
    return 0


def _cmd_build_roadmap(args: argparse.Namespace) -> int:
    root = pathlib.Path(args.root)
    roadmap_dir = pathlib.Path(args.roadmap) if args.roadmap else root / "roadmap"
    candidates_dir = pathlib.Path(args.candidates) if args.candidates else None
    coverage_dir = pathlib.Path(args.coverage) if args.coverage else None
    try:
        generated = roadmap.generate(
            root,
            site=args.site_url,
            roadmap_dir=roadmap_dir,
            candidates_dir=candidates_dir,
            coverage_dir=coverage_dir,
            repo_url=args.repo_url,
        )
    except roadmap.RegistryError as err:
        print(err, file=sys.stderr)
        return 1
    roadmap.write_generated(pathlib.Path(args.out), generated)
    print("wrote %d files under %s" % (len(generated), args.out))
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="sternbild-docs",
        description="Sternbild documentation checks and roadmap utilities.",
    )
    parser.add_argument(
        "--version",
        action="version",
        version="sternbild-docs %s" % __version__,
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p_head = sub.add_parser(
        "check-headings",
        help="Check Markdown headings against the Sternbild Title Case rule.",
    )
    p_head.add_argument(
        "paths",
        nargs="*",
        help="Docs directories or Markdown files to check (default: docs).",
    )
    p_head.add_argument(
        "--root",
        help="Repository root containing docs/ when no paths are passed.",
    )
    p_head.add_argument(
        "--list",
        action="store_true",
        help="Print every heading checked.",
    )
    p_head.add_argument(
        "--extra-words",
        action="append",
        help="Additional lower-case identifier words allowed without backticks.",
    )
    p_head.set_defaults(func=_cmd_check_headings)

    p_rm = sub.add_parser(
        "check-roadmap",
        help="Validate roadmap YAML files, links, DAG, privacy, and optional ledgers.",
    )
    p_rm.add_argument(
        "--root",
        default=".",
        help="Repository root directory (default: current working directory).",
    )
    p_rm.add_argument(
        "--roadmap",
        help="Path to roadmap pillar YAML folder (default: <root>/roadmap).",
    )
    p_rm.add_argument(
        "--candidates",
        help="Path to candidates folder to validate.",
    )
    p_rm.add_argument(
        "--coverage",
        help="Path to coverage ledger folder to validate.",
    )
    p_rm.add_argument(
        "--no-candidates",
        action="store_true",
        help="Skip candidates validation even when candidates/ exists.",
    )
    p_rm.add_argument(
        "--no-coverage",
        action="store_true",
        help="Skip coverage ledger validation even when roadmap/coverage/ exists.",
    )
    p_rm.add_argument(
        "--strict-titles",
        action="store_true",
        help="Require full Title Case on pillar and feature titles.",
    )
    p_rm.add_argument(
        "--strict-core-scope",
        action="store_true",
        help="Require core features to depend only on core features.",
    )
    p_rm.set_defaults(func=_cmd_check_roadmap)

    p_build = sub.add_parser(
        "build-roadmap",
        help="Write generated roadmap Markdown and JSON files to an output folder.",
    )
    p_build.add_argument(
        "--out",
        required=True,
        help="Output folder that receives generated roadmap files.",
    )
    p_build.add_argument(
        "--root",
        default=".",
        help="Repository root directory (default: current working directory).",
    )
    p_build.add_argument(
        "--roadmap",
        help="Path to roadmap pillar YAML folder (default: <root>/roadmap).",
    )
    p_build.add_argument(
        "--candidates",
        help="Optional path to candidates YAML folder.",
    )
    p_build.add_argument(
        "--coverage",
        help="Optional path to coverage ledger YAML folder.",
    )
    p_build.add_argument(
        "--site-url",
        help="Published site URL for roadmap.json links.",
    )
    p_build.add_argument(
        "--repo-url",
        help="Repository URL for design document and issue links.",
    )
    p_build.set_defaults(func=_cmd_build_roadmap)

    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
