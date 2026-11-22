"""Validate a Sternbild roadmap registry, optional coverage ledger, and optional candidates."""

from __future__ import annotations

import json
import os
import re
from collections import Counter
from pathlib import Path

import jsonschema
import yaml

from sternbild_docs import headings as heading_rules
from sternbild_docs import roadmap as roadmap_build

SCHEMAS_DIR = Path(__file__).resolve().parent / "schemas"
STATUSES = roadmap_build.STATUS_ORDER
SCOPES = ("core", "supporting", "peripheral")
DESIGN_INDEXES = ("README.md", "index.md")
ARTICLE = re.compile(r"^(the|a|an)\s", re.I)

_MAC_HOME = "/".join(["", "Users", ""])
_LINUX_HOME = "/".join(["", "home", ""])
_WIN_HOME = "\\".join(["C:", "Users", ""])

PRIVACY_PATTERNS = [
    (
        "home directory path",
        re.compile(
            r"(?:%s|%s|%s)[A-Za-z0-9._-]+"
            % (re.escape(_MAC_HOME), re.escape(_LINUX_HOME), re.escape(_WIN_HOME))
        ),
    ),
    (
        "email address",
        re.compile(
            r"[A-Za-z0-9._%+-]+" + chr(64) + r"[A-Za-z0-9.-]+\.[A-Za-z]{2,}"
        ),
    ),
    (
        "personal GitHub profile URL",
        re.compile(r"https?://github\.com/[A-Za-z0-9-]+/[A-Za-z0-9._-]+"),
    ),
]


def _article(title: object) -> bool:
    return isinstance(title, str) and ARTICLE.match(title) is not None


def _has_todo(value: object) -> bool:
    if isinstance(value, str):
        return "TODO" in value
    if isinstance(value, dict):
        return any(_has_todo(v) for v in value.values())
    if isinstance(value, list):
        return any(_has_todo(v) for v in value)
    return False


def _todo_fields(feature: dict) -> list[str]:
    return [k for k, v in feature.items() if _has_todo(v)]


GENERIC_USERS = {"runner", "root", "ubuntu", "admin", "user", "github", "docker", "vscode", "jenkins", "build"}


def _privacy_hits(text: str) -> list[str]:
    hits: list[str] = []
    for label, pattern in PRIVACY_PATTERNS:
        if pattern.search(text):
            hits.append(label)
    current_user = os.environ.get("USER") or ""
    # The username check protects a developer's own name. CI machines and system accounts run under generic names
    # such as "runner", which also occur as ordinary words in feature titles, so the check skips them.
    if len(current_user) >= 4 and current_user.lower() not in GENERIC_USERS and not os.environ.get("CI"):
        if re.search(r"\b%s\b" % re.escape(current_user), text, re.I):
            hits.append("local username")
    return hits


def _scan_privacy(value: object, name: str, fid: str, errors: list[str]) -> None:
    if isinstance(value, str):
        for label in _privacy_hits(value):
            errors.append("%s: %s: privacy check failed (%s)" % (name, fid, label))
    elif isinstance(value, dict):
        for val in value.values():
            _scan_privacy(val, name, fid, errors)
    elif isinstance(value, list):
        for item in value:
            _scan_privacy(item, name, fid, errors)


def _find_cycle(graph: dict[str, list[str]]) -> list[str] | None:
    """Return one cycle as a list of feature ids with the first repeated at the end."""
    state: dict[str, int] = {}
    stack: list[str] = []

    def visit(node: str) -> list[str] | None:
        state[node] = 1
        stack.append(node)
        for nxt in sorted(graph.get(node, []), key=roadmap_build.id_key):
            if nxt not in graph:
                continue
            if state.get(nxt) == 1:
                return stack[stack.index(nxt):] + [nxt]
            if nxt not in state:
                found = visit(nxt)
                if found:
                    return found
        stack.pop()
        state[node] = 2
        return None

    for node in sorted(graph, key=roadmap_build.id_key):
        if node not in state:
            found = visit(node)
            if found:
                return found
    return None


def _check_ref(
    root: Path,
    name: str,
    fid: str,
    field: str,
    ref: str,
    errors: list[str],
) -> None:
    path, anchor = roadmap_build.split_ref(ref)
    found = roadmap_build.read_headings(root / path)
    if found is None:
        errors.append("%s: %s: %s page %s does not exist" % (name, fid, field, path))
        return
    if anchor and anchor not in [slug for _, _, slug in found]:
        errors.append(
            "%s: %s: %s anchor #%s is not a heading on %s"
            % (name, fid, field, anchor, path)
        )


def _heading_key(text: object) -> str:
    return roadmap_build.heading_text(str(text))


def _load_schema(local_path: Path, builtin_name: str) -> dict:
    path = local_path if local_path.is_file() else SCHEMAS_DIR / builtin_name
    return json.loads(path.read_text(encoding="utf-8"))


def check_coverage(
    root: Path,
    features: dict[str, tuple[str, dict]],
    errors: list[str],
    warnings: list[str],
    *,
    coverage_dir: Path,
    required: bool = False,
) -> tuple[int, int]:
    """Validate the coverage ledger under coverage_dir against the registry and design/."""
    if not coverage_dir.is_dir():
        if required:
            errors.append(
                "roadmap/%s: -: the coverage ledger is missing" % roadmap_build.COVERAGE
            )
        return 0, 0
    for extra in sorted(coverage_dir.glob("*.yaml")):
        errors.append(
            "roadmap/%s/%s: -: ledger files end in .yml, so this file is not read"
            % (roadmap_build.COVERAGE, extra.name)
        )
    schema = _load_schema(coverage_dir / "schema.json", "coverage.schema.json")
    validator = jsonschema.Draft202012Validator(schema)

    groups: list[tuple[str, dict]] = []
    for path in sorted(coverage_dir.glob("*.yml")):
        name = "roadmap/%s/%s" % (roadmap_build.COVERAGE, path.name)
        try:
            data = yaml.safe_load(path.read_text(encoding="utf-8"))
        except yaml.YAMLError as err:
            errors.append("%s: -: not valid YAML: %s" % (name, err))
            continue
        problems = sorted(validator.iter_errors(data), key=lambda e: list(map(str, e.path)))
        for err in problems:
            where = "/".join(str(p) for p in err.absolute_path) or "-"
            errors.append("%s: -: schema: %s: %s" % (name, where, err.message))
        if not problems:
            groups.append((name, data))
            if _article(data["title"]):
                errors.append("%s: -: the title starts with an article" % name)
            if _has_todo(data):
                errors.append("%s: -: contains TODO" % name)

    sourced: set[str] = set()
    for name, group in groups:
        for num, entry in enumerate(group["entries"], 1):
            for fid in entry.get("ids") or []:
                if fid in features:
                    sourced.add(fid)
                else:
                    errors.append(
                        "%s: %s: entry %d maps to %s, which does not exist"
                        % (name, fid, num, fid)
                    )
            if entry.get("page"):
                _check_ref(root, name, "entry %d" % num, "docs", entry["page"], errors)

    pages: dict[str, tuple[str, dict]] = {}
    for name, group in groups:
        if group["kind"] != "page":
            continue
        if group["source"] in pages:
            errors.append(
                "%s: -: %s already has the ledger file %s"
                % (name, group["source"], pages[group["source"]][0])
            )
            continue
        pages[group["source"]] = (name, group)

    design = root / "design"
    plan_pages = (
        sorted(p for p in design.glob("*.md") if p.name not in DESIGN_INDEXES)
        if design.is_dir()
        else []
    )
    for page in plan_pages:
        rel = "design/" + page.name
        if rel not in pages:
            errors.append(
                "%s: -: the plan page has no ledger file under roadmap/%s"
                % (rel, roadmap_build.COVERAGE)
            )
            continue
        name, group = pages[rel]
        group_ref = group.get("ref", "main")
        found = roadmap_build.read_headings(page) or []
        page_headings = [text for level, text, _ in found if level in (2, 3)]
        on_page = {text for _, text, _ in found}
        skipped = [_heading_key(h) for h in group.get("not_features") or []]
        named = [
            (_heading_key(e["heading"]), e.get("ref") or group_ref)
            for e in group["entries"]
        ]
        covered = set(skipped) | {h for h, _ in named}
        for heading in page_headings:
            if heading not in covered:
                errors.append(
                    '%s: -: the heading "%s" of %s has no ledger entry and is not '
                    "listed under not_features" % (name, heading, rel)
                )
        for heading in skipped:
            if heading not in on_page:
                errors.append(
                    '%s: -: not_features names "%s", which is not a heading of %s'
                    % (name, heading, rel)
                )
        for heading, ref in sorted(set(named)):
            if heading not in on_page and ref == "main":
                errors.append(
                    '%s: -: an entry names the heading "%s", which is not on %s; '
                    "give the entry the ref of the branch it was read from"
                    % (name, heading, rel)
                )

    for rel, (name, group) in sorted(pages.items()):
        if not (root / rel).is_file() and group.get("ref", "main") == "main":
            errors.append(
                "%s: -: %s is not on this branch, so the ledger must give the ref of "
                "the branch it was read from" % (name, rel)
            )

    for fid in sorted(features, key=roadmap_build.id_key):
        if fid not in sourced:
            warnings.append(
                "%s: %s: warning: no ledger entry names this feature"
                % (features[fid][0], fid)
            )
    return len(groups), sum(len(g["entries"]) for _, g in groups)


def check_candidates(
    root: Path,
    features: dict[str, tuple[str, dict]],
    pillars: dict[str, str],
    errors: list[str],
    *,
    candidates_dir: Path,
    required: bool = False,
) -> tuple[int, int]:
    """Validate candidate pillar YAML files against the active registry."""
    if not candidates_dir.is_dir():
        if required:
            errors.append(
                "%s: -: candidates folder is missing" % roadmap_build.CANDIDATES
            )
        return 0, 0
    for extra in sorted(candidates_dir.glob("*.yaml")):
        errors.append(
            "%s/%s: -: candidate files end in .yml, so this file is not read"
            % (roadmap_build.CANDIDATES, extra.name)
        )
    schema = _load_schema(candidates_dir / "schema.json", "candidates.schema.json")
    validator = jsonschema.Draft202012Validator(schema)

    groups: list[tuple[str, str, dict]] = []
    for path in sorted(candidates_dir.glob("*.yml")):
        name = "%s/%s" % (roadmap_build.CANDIDATES, path.name)
        try:
            data = yaml.safe_load(path.read_text(encoding="utf-8"))
        except yaml.YAMLError as err:
            errors.append("%s: -: not valid YAML: %s" % (name, err))
            continue
        problems = sorted(validator.iter_errors(data), key=lambda e: list(map(str, e.path)))
        for err in problems:
            where = "/".join(str(p) for p in err.absolute_path) or "-"
            errors.append("%s: -: schema: %s: %s" % (name, where, err.message))
        if not problems:
            groups.append((name, path.stem, data))

    titles = {f["title"].casefold(): fid for fid, (_, f) in features.items()}
    prefixes: dict[str, str] = {}
    keys: dict[str, str] = {}
    feature_ids_lower = {fid.casefold() for fid in features}
    for name, stem, data in groups:
        pillar = data["pillar"]
        if pillar in prefixes:
            errors.append(
                "%s: -: duplicate pillar %s, also used by %s"
                % (name, pillar, prefixes[pillar])
            )
        prefixes.setdefault(pillar, name)
        if data.get("proposed"):
            if pillar in pillars:
                errors.append(
                    "%s: -: proposed pillar %s is already a registry prefix"
                    % (name, pillar)
                )
        elif pillar not in pillars:
            errors.append("%s: -: pillar %s is not a registry prefix" % (name, pillar))
        elif pillars[pillar] != stem:
            errors.append(
                "%s: -: the file for pillar %s must be named %s.yml"
                % (name, pillar, pillars[pillar])
            )
        reason = heading_rules.judge(data["title"])
        if reason:
            errors.append('%s: -: the title "%s" %s' % (name, data["title"], reason))
        if _has_todo(data):
            errors.append("%s: -: contains TODO" % name)
        for cand in data["candidates"]:
            key = cand["key"]
            if key in keys:
                errors.append(
                    "%s: %s: duplicate key, also in %s" % (name, key, keys[key])
                )
            keys.setdefault(key, name)
            if key.casefold() in feature_ids_lower:
                errors.append("%s: %s: the key is a registry feature id" % (name, key))
            reason = heading_rules.judge(cand["title"])
            if reason:
                errors.append(
                    '%s: %s: the title "%s" %s' % (name, key, cand["title"], reason)
                )
            if cand["title"].casefold() in titles:
                errors.append(
                    "%s: %s: the title is the title of the feature %s"
                    % (name, key, titles[cand["title"].casefold()])
                )
            for dep in cand.get("depends_on") or []:
                if dep not in features:
                    errors.append(
                        "%s: %s: depends_on %s, which does not exist"
                        % (name, key, dep)
                    )
    return sum(len(d["candidates"]) for _, _, d in groups), len(groups)


def run_checks(
    root: Path | str,
    *,
    roadmap_dir: Path | str | None = None,
    candidates_dir: Path | str | None = None,
    coverage_dir: Path | str | None = None,
    check_candidates_enabled: bool | None = None,
    check_coverage_enabled: bool | None = None,
    strict_titles: bool = False,
    strict_core_scope: bool = False,
    check_privacy: bool = True,
) -> tuple[list[str], list[str], str]:
    """Validate the roadmap registry under root and return (errors, warnings, summary)."""
    root_path = Path(root)
    rm_dir = Path(roadmap_dir) if roadmap_dir is not None else root_path / "roadmap"
    errors: list[str] = []
    warnings: list[str] = []

    try:
        files = roadmap_build.read_files(root_path, roadmap_dir=rm_dir)
    except roadmap_build.RegistryError as err:
        return [str(err)], [], ""

    if not files:
        return ["roadmap: -: no pillar .yml files found"], [], ""

    for extra in sorted(rm_dir.glob("*.yaml")):
        errors.append(
            "roadmap/%s: -: pillar files end in .yml, so this file is not read"
            % extra.name
        )

    schema = _load_schema(rm_dir / "schema.json", "roadmap.schema.json")
    validator = jsonschema.Draft202012Validator(schema)

    valid: list[tuple[str, dict]] = []
    for name, data in files:
        problems = sorted(validator.iter_errors(data), key=lambda e: list(map(str, e.path)))
        for err in problems:
            where = "/".join(str(p) for p in err.absolute_path) or "-"
            fid = "-"
            parts = list(err.absolute_path)
            if len(parts) >= 2 and parts[0] == "features" and isinstance(data, dict):
                try:
                    fid = data["features"][parts[1]].get("id", "-")
                except (KeyError, IndexError, AttributeError, TypeError):
                    pass
            errors.append("%s: %s: schema: %s: %s" % (name, fid, where, err.message))
        if not problems and isinstance(data, dict):
            valid.append((name, data))
    if errors:
        return errors, [], ""

    prefixes: dict[str, str] = {}
    orders: dict[int, str] = {}
    for name, data in valid:
        if data["prefix"] in prefixes:
            errors.append(
                "%s: -: duplicate prefix %s, also used by %s"
                % (name, data["prefix"], prefixes[data["prefix"]])
            )
        prefixes.setdefault(data["prefix"], name)
        if data["order"] in orders:
            errors.append(
                "%s: -: duplicate order %d, also used by %s"
                % (name, data["order"], orders[data["order"]])
            )
        orders.setdefault(data["order"], name)
        header_data = {k: v for k, v in data.items() if k != "features"}
        if _has_todo(header_data):
            errors.append("%s: -: contains TODO" % name)
        if check_privacy:
            _scan_privacy(header_data, name, "-", errors)
        if strict_titles:
            reason = heading_rules.judge(data["title"])
            if reason:
                errors.append(
                    '%s: -: pillar title "%s" %s' % (name, data["title"], reason)
                )
        elif _article(data["title"]):
            errors.append("%s: -: the pillar title starts with an article" % name)

    # Hand-written roadmap navigation must list every pillar page when present.
    nav_rel = "docs/roadmap/.nav.yml"
    nav_path = root_path / nav_rel
    if nav_path.is_file():
        nav_text = nav_path.read_text(encoding="utf-8")
        for name, _ in valid:
            page = Path(name).stem + ".md"
            if not re.search(r"^\s*-\s*%s\s*$" % re.escape(page), nav_text, re.M):
                errors.append(
                    "%s: -: %s does not list the pillar page %s"
                    % (name, nav_rel, page)
                )

    features: dict[str, tuple[str, dict]] = {}
    feature_pillar: dict[str, str] = {}
    for name, data in valid:
        for feat in data["features"]:
            fid = feat["id"]
            if fid in features:
                errors.append(
                    "%s: %s: duplicate id, also in %s" % (name, fid, features[fid][0])
                )
                continue
            features[fid] = (name, feat)
            feature_pillar[fid] = data["prefix"]
            if not fid.startswith(data["prefix"] + "-"):
                errors.append(
                    "%s: %s: id does not use the prefix %s"
                    % (name, fid, data["prefix"])
                )
            if feat.get("scope") not in SCOPES:
                errors.append(
                    "%s: %s: scope %r is not one of %s"
                    % (name, fid, feat.get("scope"), ", ".join(SCOPES))
                )
            for field in _todo_fields(feat):
                errors.append("%s: %s: %s contains TODO" % (name, fid, field))
            if check_privacy:
                _scan_privacy(feat, name, fid, errors)
            if strict_titles:
                reason = heading_rules.judge(feat["title"])
                if reason:
                    errors.append(
                        '%s: %s: title "%s" %s' % (name, fid, feat["title"], reason)
                    )
            elif _article(feat["title"]):
                errors.append(
                    "%s: %s: the title starts with an article" % (name, fid)
                )

    graph: dict[str, list[str]] = {}
    cross_pillar_edges = 0
    for fid, (name, feat) in sorted(
        features.items(), key=lambda item: roadmap_build.id_key(item[0])
    ):
        deps = feat.get("depends_on") or []
        graph[fid] = deps
        for dep in deps:
            if dep == fid:
                errors.append("%s: %s: depends on itself" % (name, fid))
            elif dep not in features:
                errors.append(
                    "%s: %s: depends_on %s, which does not exist" % (name, fid, dep)
                )
            elif feature_pillar[dep] != feature_pillar[fid]:
                cross_pillar_edges += 1

    cycle = _find_cycle({k: [d for d in v if d != k] for k, v in graph.items()})
    if cycle:
        errors.append(
            "%s: %s: dependency cycle %s"
            % (features[cycle[0]][0], cycle[0], " -> ".join(cycle))
        )

    rank = roadmap_build.STATUS_RANK
    for fid, (name, feat) in sorted(
        features.items(), key=lambda item: roadmap_build.id_key(item[0])
    ):
        if feat["status"] == "shipped" and not feat.get("docs"):
            errors.append("%s: %s: shipped feature has no docs" % (name, fid))
        for field in ("docs", "design"):
            if feat.get(field):
                _check_ref(root_path, name, fid, field, feat[field], errors)
        for dep in feat.get("depends_on") or []:
            if dep in features and dep != fid:
                dep_feat = features[dep][1]
                dstatus = dep_feat["status"]
                if rank[dstatus] > rank[feat["status"]]:
                    errors.append(
                        "%s: %s: %s depends on %s, which is %s and has a higher "
                        "status rank" % (name, fid, feat["status"], dep, dstatus)
                    )
                if (
                    strict_core_scope
                    and feat.get("scope") == "core"
                    and dep_feat.get("scope") != "core"
                ):
                    errors.append(
                        "%s: %s: core feature depends on %s, which has scope %s"
                        % (name, fid, dep, dep_feat.get("scope"))
                    )

    try:
        _, loaded = roadmap_build.load_registry(root_path, roadmap_dir=rm_dir)
    except roadmap_build.RegistryError:
        loaded = None
    if loaded is not None:
        for fid, feat in sorted(
            loaded.items(), key=lambda item: roadmap_build.id_key(item[0])
        ):
            if feat["status"] == "decision" and not feat["unblocks"]:
                errors.append(
                    "%s: %s: decision that no feature depends on" % (feat["file"], fid)
                )

    def reach(start: str, seen: set[str]) -> set[str]:
        for nxt in graph.get(start, []):
            if nxt in graph and nxt not in seen:
                seen.add(nxt)
                reach(nxt, seen)
        return seen

    if not cycle:
        for fid, (name, feat) in sorted(
            features.items(), key=lambda item: roadmap_build.id_key(item[0])
        ):
            deps = [d for d in graph[fid] if d in features and d != fid]
            for dep in sorted(deps, key=roadmap_build.id_key):
                if features[dep][1]["status"] == "decision":
                    continue
                for other in sorted(deps, key=roadmap_build.id_key):
                    if other != dep and dep in reach(other, set()):
                        warnings.append(
                            "%s: %s: warning: depends_on %s is already implied through %s"
                            % (name, fid, dep, other)
                        )
                        break

    cov_path = (
        Path(coverage_dir)
        if coverage_dir is not None
        else rm_dir / roadmap_build.COVERAGE
    )
    run_cov = (
        cov_path.is_dir()
        if check_coverage_enabled is None
        else bool(check_coverage_enabled)
    )
    ledger_files = ledger_entries = 0
    if run_cov:
        ledger_files, ledger_entries = check_coverage(
            root_path,
            features,
            errors,
            warnings,
            coverage_dir=cov_path,
            required=bool(check_coverage_enabled),
        )

    cand_path = (
        Path(candidates_dir)
        if candidates_dir is not None
        else root_path / roadmap_build.CANDIDATES
    )
    run_cand = (
        cand_path.is_dir()
        if check_candidates_enabled is None
        else bool(check_candidates_enabled)
    )
    candidates = candidate_files = 0
    if run_cand:
        candidates, candidate_files = check_candidates(
            root_path,
            features,
            {d["prefix"]: Path(n).stem for n, d in valid},
            errors,
            candidates_dir=cand_path,
            required=bool(check_candidates_enabled),
        )

    status_counts = Counter(f["status"] for _, f in features.values())
    active_statuses = [s for s in STATUSES if status_counts[s] > 0]
    if not active_statuses:
        active_statuses = ["shipped", "planned"]
    in_progress = sum(1 for _, f in features.values() if f.get("in_progress"))
    edges = sum(len(v) for v in graph.values())
    parts = [", ".join("%d %s" % (status_counts[s], s) for s in active_statuses)]
    if in_progress or "built" in active_statuses:
        parts.append("%d in progress" % in_progress)
    else:
        scope_counts = Counter(f["scope"] for _, f in features.values())
        parts.append(", ".join("%d %s" % (scope_counts[s], s) for s in SCOPES))
        parts.append("%d cross-pillar" % cross_pillar_edges)
    summary = "%d features, %d edges (%s)" % (
        len(features),
        edges,
        "; ".join(parts),
    )
    if ledger_files:
        summary += ", %d ledger entries in %d files" % (ledger_entries, ledger_files)
    if candidate_files:
        summary += ", %d candidates in %d files" % (candidates, candidate_files)
    return errors, warnings, summary
