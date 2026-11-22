"""Generate roadmap pages and JSON data files from a YAML feature registry.

Supports both minimal registries (shipped and planned features) and extended
registries with branch status, sprints, design links, issues, coverage ledgers,
and optional candidate pillars.
"""

from __future__ import annotations

import html
import json
import os
import re
from pathlib import Path

import yaml
from markdown.extensions.toc import slugify

STATUS_ORDER = ["shipped", "built", "planned", "idea", "decision"]
STATUS_RANK = {"shipped": 0, "built": 1, "planned": 2, "idea": 2, "decision": 2}
# Built work whose branches are unfinished displays as in progress.
SHOWN_ORDER = ["shipped", "built", "progress", "planned", "idea", "decision"]
SECTION_TITLES = {
    "shipped": "Shipped",
    "built": "Built",
    "progress": "In Progress",
    "planned": "Planned",
    "idea": "Ideas",
    "decision": "Decisions",
}
BADGE_LABELS = {
    "shipped": "Shipped",
    "built": "Built",
    "progress": "In Progress",
    "planned": "Planned",
    "idea": "Idea",
    "decision": "Decision",
}
SCOPE_LABELS = {
    "core": "Core",
    "supporting": "Supporting",
    "peripheral": "Peripheral",
}
FEATURE_KEYS = [
    "id",
    "title",
    "status",
    "scope",
    "priority",
    "summary",
    "depends_on",
    "sprint",
    "docs",
    "branches",
    "in_progress",
    "design",
    "issue",
    "draft",
]
COVERAGE = "coverage"
CANDIDATES = "candidates"
# Candidate origins in section display order: (value, section title).
ORIGINS = [
    ("cut", "Scope Cuts"),
    ("plan-idea", "Plan Ideas"),
    ("adjacent-work", "Adjacent Work"),
    ("field", "Field"),
]
# Proposed pillars follow active registry pillars in this order when present.
PROPOSED_ORDER = [
    "datasets",
    "training-diagnostics",
    "evaluation",
    "profiling-and-systems",
    "robotics-and-simulation",
    "scientific-fields",
    "publishing-and-teaching",
]


class RegistryError(Exception):
    """Raised when the roadmap registry cannot be loaded."""


def id_key(fid: str) -> tuple[str, int, str]:
    """Sort feature ids by prefix and numeric suffix."""
    prefix, _, number = fid.partition("-")
    return (prefix, int(number) if number.isdigit() else 0, fid)


_MD_SPECIAL = re.compile(r"([\\`*_\[\]|#])")


def md(text) -> str:
    """Escape registry text for Markdown prose and table cells."""
    return _MD_SPECIAL.sub(r"\\\1", html.escape(str(text).strip(), quote=False))


def excluded_docs(root: Path) -> set[str]:
    """Return docs paths listed under exclude_docs in mkdocs.yml."""
    try:
        with open(Path(root) / "mkdocs.yml", encoding="utf-8") as handle:
            text = (yaml.safe_load(handle) or {}).get("exclude_docs") or ""
    except (OSError, yaml.YAMLError):
        return set()
    return {
        line.strip()
        for line in str(text).splitlines()
        if line.strip() and not line.strip().startswith("#")
    }


def site_url_from_mkdocs(root: Path) -> str:
    """Read site_url from mkdocs.yml when present, else return '/'."""
    try:
        with open(Path(root) / "mkdocs.yml", encoding="utf-8") as handle:
            return (yaml.safe_load(handle) or {}).get("site_url") or "/"
    except (OSError, yaml.YAMLError):
        return "/"


# Markdown heading parsing

_FENCE = re.compile(r"^\s{0,3}(`{3,}|~{3,})")
_ATX = re.compile(r"^\s{0,3}(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$")


def heading_text(raw: str) -> str:
    """Normalize a Markdown heading the same way MkDocs generates slugs."""
    text = re.sub(r"(?<!`)<[A-Za-z/][^<>`]*>(?!`)", "", raw)
    text = re.sub(r"!?\[([^\]]*)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"!?\[([^\]]*)\]\[[^\]]*\]", r"\1", text)
    text = text.replace("`", "")
    text = re.sub(r"(\*\*|__)(.+?)\1", r"\2", text)
    text = re.sub(r"\*(.+?)\*", r"\1", text)
    return text.strip()


def parse_headings(markdown_text: str) -> list[tuple[int, str, str]]:
    """Return [(level, text, slug)] for ATX headings, skipping frontmatter and fences."""
    found: list[tuple[int, str, str]] = []
    seen: set[str] = set()
    fence: str | None = None
    lines = markdown_text.splitlines()
    start = 0
    if lines and lines[0].strip() == "---":
        for idx in range(1, len(lines)):
            if lines[idx].strip() in ("---", "..."):
                start = idx + 1
                break
    for line in lines[start:]:
        match = _FENCE.match(line)
        if match:
            marker = match.group(1)
            if fence is None:
                fence = marker[0]
            elif marker[0] == fence:
                fence = None
            continue
        if fence is not None:
            continue
        match = _ATX.match(line)
        if not match:
            continue
        text = heading_text(match.group(2))
        slug = base = slugify(text, "-")
        suffix = 0
        while slug in seen:
            suffix += 1
            slug = "%s_%d" % (base, suffix)
        seen.add(slug)
        found.append((len(match.group(1)), text, slug))
    return found


def read_headings(path: Path) -> list[tuple[int, str, str]] | None:
    """Return headings of the Markdown file at path, or None if unreadable."""
    try:
        return parse_headings(Path(path).read_text(encoding="utf-8"))
    except OSError:
        return None


def first_heading(headings: list[tuple[int, str, str]]) -> str | None:
    for level, text, _ in headings:
        if level == 1:
            return text
    return None


def shown_status(feature: dict) -> str:
    """Return 'progress' for unfinished built work, else the feature status."""
    if feature["status"] == "built" and feature.get("in_progress"):
        return "progress"
    return feature["status"]


def split_ref(ref: str) -> tuple[str, str | None]:
    """Split 'docs/a.md#x' into ('docs/a.md', 'x'); no anchor gives None."""
    path, _, anchor = ref.partition("#")
    return path, (anchor or None)


def _rel_label(path: Path, root: Path, fallback_dir: str) -> str:
    try:
        return path.resolve().relative_to(Path(root).resolve()).as_posix()
    except ValueError:
        return "%s/%s" % (fallback_dir, path.name)


# Registry loading

def read_files(root: Path, roadmap_dir: Path | None = None) -> list[tuple[str, object]]:
    """Return [(relative_name, data)] for every pillar YAML file, sorted by name."""
    root_path = Path(root)
    folder = Path(roadmap_dir) if roadmap_dir is not None else root_path / "roadmap"
    if not folder.is_dir():
        raise RegistryError("roadmap folder %s does not exist" % folder)
    result: list[tuple[str, object]] = []
    for path in sorted(folder.glob("*.yml")):
        rel = _rel_label(path, root_path, "roadmap")
        try:
            data = yaml.safe_load(path.read_text(encoding="utf-8"))
        except yaml.YAMLError as err:
            raise RegistryError("%s: not valid YAML: %s" % (rel, err)) from err
        result.append((rel, data))
    return result


def read_coverage(root: Path, coverage_dir: Path | None = None) -> list[dict]:
    """Return coverage ledger groups when coverage_dir is configured and present."""
    if coverage_dir is None:
        return []
    folder = Path(coverage_dir)
    if not folder.is_dir():
        return []
    root_path = Path(root)
    groups: list[dict] = []
    for path in sorted(folder.glob("*.yml")):
        rel = _rel_label(path, root_path, "roadmap/" + COVERAGE)
        try:
            data = yaml.safe_load(path.read_text(encoding="utf-8"))
        except yaml.YAMLError as err:
            raise RegistryError("%s: not valid YAML: %s" % (rel, err)) from err
        if isinstance(data, dict):
            group = dict(data)
            group["file"] = rel
            group["entries"] = [
                entry for entry in group.get("entries") or [] if isinstance(entry, dict)
            ]
            groups.append(group)
    return groups


def load_registry(
    root: Path,
    *,
    roadmap_dir: Path | None = None,
    coverage_dir: Path | None = None,
) -> tuple[list[dict], dict[str, dict]]:
    """Return (pillars, features) from the roadmap YAML files.

    Pillars are sorted by order and hold features sorted by id. Every feature
    receives its resolved scope, pillar metadata, computed unblocks list, and
    optional coverage ledger sources.
    """
    pillars: list[dict] = []
    features: dict[str, dict] = {}
    for name, data in read_files(root, roadmap_dir=roadmap_dir):
        if not isinstance(data, dict):
            raise RegistryError("%s: not a pillar mapping" % name)
        pillar = {
            "prefix": data["prefix"],
            "title": data["title"],
            "slug": Path(name).stem,
            "order": data["order"],
            "summary": data["summary"],
            "file": name,
            "features": [],
        }
        for raw in data.get("features") or []:
            fid = raw["id"]
            if fid in features:
                raise RegistryError("%s: %s: duplicate id" % (name, fid))
            feature = {key: raw.get(key) for key in FEATURE_KEYS}
            feature["scope"] = raw.get("scope") or raw.get("priority") or "core"
            feature["depends_on"] = sorted(raw.get("depends_on") or [], key=id_key)
            feature["branches"] = list(raw.get("branches") or [])
            feature["in_progress"] = bool(raw.get("in_progress"))
            feature["draft"] = bool(raw.get("draft"))
            feature["sources"] = []
            feature["pillar"] = pillar["prefix"]
            feature["pillar_title"] = pillar["title"]
            feature["pillar_slug"] = pillar["slug"]
            feature["file"] = name
            feature["unblocks"] = []
            features[fid] = feature
            pillar["features"].append(feature)
        pillar["features"].sort(key=lambda f: id_key(f["id"]))
        pillars.append(pillar)
    pillars.sort(key=lambda p: (p["order"], p["prefix"]))
    for fid in sorted(features, key=id_key):
        for dep in features[fid]["depends_on"]:
            if dep not in features:
                raise RegistryError(
                    "%s: %s: depends_on %s, which does not exist"
                    % (features[fid]["file"], fid, dep)
                )
            features[dep]["unblocks"].append(fid)
    for feature in features.values():
        feature["unblocks"].sort(key=id_key)
    for group in read_coverage(root, coverage_dir=coverage_dir):
        for entry in group["entries"]:
            for fid in entry.get("ids") or []:
                if fid in features:
                    features[fid]["sources"].append((group, entry))
    return pillars, features


def read_candidates(
    root: Path,
    features: dict[str, dict],
    *,
    roadmap_dir: Path | None = None,
    candidates_dir: Path | None = None,
) -> list[dict]:
    """Return candidate pillars when candidates_dir is configured and present."""
    if candidates_dir is None:
        return []
    folder = Path(candidates_dir)
    if not folder.is_dir():
        return []
    root_path = Path(root)
    pillars: list[dict] = []
    for path in sorted(folder.glob("*.yml")):
        name = _rel_label(path, root_path, CANDIDATES)
        try:
            data = yaml.safe_load(path.read_text(encoding="utf-8"))
        except yaml.YAMLError as err:
            raise RegistryError("%s: not valid YAML: %s" % (name, err)) from err
        if not isinstance(data, dict):
            raise RegistryError("%s: not a pillar mapping" % name)
        pillar = dict(data)
        pillar["slug"] = path.stem
        pillar["candidates"] = list(pillar.get("candidates") or [])
        for item in pillar["candidates"]:
            for dep in item.get("depends_on") or []:
                if dep not in features:
                    raise RegistryError(
                        "%s: %s: depends_on %s, which does not exist"
                        % (name, item["key"], dep)
                    )
        pillars.append(pillar)

    order = {
        Path(name).stem: data["order"]
        for name, data in read_files(root_path, roadmap_dir=roadmap_dir)
        if isinstance(data, dict) and "order" in data
    }

    def rank(pillar: dict) -> tuple[int, int]:
        if pillar["slug"] in PROPOSED_ORDER:
            return (1, PROPOSED_ORDER.index(pillar["slug"]))
        if pillar.get("proposed"):
            return (2, 0)
        return (0, order.get(pillar["slug"], 0))

    pillars.sort(key=lambda p: (rank(p), p["slug"]))
    return pillars


# Page generators

def candidates_index() -> str:
    """Generate the Candidates navigator index page."""
    return "\n".join(
        [
            "---",
            "template: roadmap.html",
            "candidates_navigator: true",
            "hide:",
            "  - navigation",
            "  - toc",
            "---",
            "",
            "# Candidates",
            "",
            '<div id="candidate-navigator" class="roadmap-window" '
            'data-candidates="../candidates.json"></div>',
            "",
            "Candidates are ideas that are not in the registry. They are kept here to review "
            "as the project grows, and they appear in no graph or count of the roadmap. On a "
            "wide screen, the navigator shows every candidate as a card under its pillar. "
            "Hover a card for its summary, and click it for its dependencies and links. On a "
            "narrow screen, the pillar list links to the page of each pillar's candidates.",
            "",
        ]
    )


def candidates_page(
    pillar: dict,
    features: dict[str, dict],
    by_prefix: dict[str, dict],
) -> str:
    """Generate the Markdown page for one candidates pillar."""
    lines = ["---", "candidates_filter: true", "---", "", "# " + md(pillar["title"]), ""]
    if pillar.get("proposed"):
        lines += [md(pillar.get("description") or ""), ""]
        if pillar.get("alternative"):
            lines += ["Alternative: %s" % md(pillar["alternative"]), ""]
    else:
        target = by_prefix[pillar["pillar"]]
        lines += [
            "These candidates are not in the registry. The pillar itself is on the "
            "[%s](../%s.md) roadmap page." % (md(target["title"]), target["slug"]),
            "",
        ]
    lines += [
        '<input type="search" class="candidate-filter" aria-label="Filter candidates" '
        'placeholder="Filter candidates">',
        "",
    ]
    for origin, title in ORIGINS:
        items = [c for c in pillar["candidates"] if c["origin"] == origin]
        if not items:
            continue
        lines += ["## " + title, ""]
        for cand in items:
            lines.append("- **%s**" % md(cand["title"]))
            lines += ["", "    " + md(cand["summary"]), ""]
            if cand.get("serves"):
                lines += ["    Serves: %s" % md(cand["serves"]), ""]
            deps = cand.get("depends_on") or []
            if deps:
                links = ", ".join(
                    "[%s](../%s.md)" % (dep, dep.lower())
                    for dep in sorted(deps, key=id_key)
                )
                lines += ["    Depends on: " + links, ""]
        lines.append("")
    return "\n".join(lines)


def _heading_link(
    root: Path,
    base_dir: str,
    ref: str,
    kind: str,
    repo_url: str | None,
    docs_prefix: str = "docs",
) -> str:
    """Return a Markdown link for a docs or design reference, labeled by its heading."""
    path, anchor = split_ref(ref)
    headings = read_headings(Path(root) / path) or []
    title = first_heading(headings) or path
    text = title
    if anchor:
        for _, htext, slug in headings:
            if slug == anchor:
                text = "%s, %s" % (title, htext)
                break
    prefix = docs_prefix.rstrip("/") + "/"
    if kind == "docs" and path.startswith(prefix):
        target = os.path.relpath(path[len(prefix):], base_dir).replace(os.sep, "/")
        if anchor:
            target += "#" + anchor
        return "[%s](%s)" % (md(text), target)
    if kind == "design":
        if repo_url:
            target = "%s/blob/main/%s" % (repo_url.rstrip("/"), ref)
            return "[%s](%s)" % (md(text), target)
        return "`%s`" % ref
    return md(ref)


def _feature_links(ids: list[str], features: dict[str, dict]) -> str:
    if not ids:
        return "None"
    return "<br>".join(
        "[%s](%s.md) (`%s`)" % (md(features[fid]["title"]), fid.lower(), fid)
        for fid in ids
    )


def pillar_page(pillar: dict, *, has_candidates: bool = False) -> str:
    """Generate the Markdown page for one roadmap pillar."""
    lines = [
        "---",
        "template: roadmap.html",
        "---",
        "",
        "# " + md(pillar["title"]),
        "",
        md(pillar["summary"]),
        "",
        "The [roadmap graph](index.md) shows how these features depend on features in "
        "other pillars.",
    ]
    if has_candidates:
        lines.append(
            "Ideas for this pillar that are not in the registry are on its "
            "[candidates page](%s/%s.md)." % (CANDIDATES, pillar["slug"])
        )
    lines.append("")
    for status in SHOWN_ORDER:
        items = [f for f in pillar["features"] if shown_status(f) == status]
        if not items:
            continue
        lines += ["## " + SECTION_TITLES[status], ""]
        for feat in items:
            line = '- <span class="roadmap-id">%s</span> [%s](%s.md). %s' % (
                feat["id"],
                md(feat["title"]),
                feat["id"].lower(),
                md(feat["summary"]),
            )
            if feat.get("sprint"):
                line += " Sprint %s." % feat["sprint"]
            lines.append(line)
        lines.append("")
    return "\n".join(lines)


def _sentence(text: str) -> str:
    escaped = md(text)
    return escaped if escaped.endswith((".", "?", "!")) else escaped + "."


def source_line(
    root: Path,
    group: dict,
    entry: dict,
    repo_url: str | None,
    docs_prefix: str = "docs",
) -> str:
    """Format one Coverage Ledger bullet on a feature page."""
    kind = group.get("kind")
    ref = entry.get("ref") or group.get("ref") or "main"
    if kind == "page":
        path = group["source"]
        heading = entry.get("heading")
        on_main = ref == "main" and (Path(root) / path).is_file()
        if on_main and repo_url:
            anchor = ""
            if heading:
                for _, text, slug in read_headings(Path(root) / path) or []:
                    if text == heading_text(heading):
                        anchor = "#" + slug
                        break
            where = "[%s](%s/blob/main/%s%s)" % (
                md(path),
                repo_url.rstrip("/"),
                path,
                anchor,
            )
        elif on_main:
            where = "`%s`" % path
        else:
            where = "`%s` on the branch `%s`" % (path, ref)
        if heading:
            where += ", under *%s*" % md(heading_text(heading))
    elif kind == "docs":
        path = split_ref(entry["page"])[0]
        prefix = docs_prefix.rstrip("/") + "/"
        rel = path[len(prefix):] if path.startswith(prefix) else path
        if rel in excluded_docs(root):
            where = "`%s`, which the docs site leaves out" % path
        else:
            where = _heading_link(
                root, "roadmap", entry["page"], "docs", repo_url, docs_prefix
            )
    elif kind == "github":
        number = entry.get("pr")
        if repo_url:
            where = "[Pull request #%d](%s/pull/%d)" % (
                number,
                repo_url.rstrip("/"),
                number,
            )
        else:
            where = "Pull request #%d" % number
    elif kind in ("branches", "worktrees"):
        label = "Branch" if kind == "branches" else "Uncommitted work on the branch"
        where = "%s `%s`" % (label, entry["branch"])
        if entry.get("commits"):
            where += ", %s" % md(entry["commits"])
    elif kind == "notes":
        where = "%s, `%s`" % (md(group.get("title", "Notes")), entry["file"])
    else:
        where = md(group.get("title", group["file"]))
    return "%s. %s" % (where, _sentence(entry["item"]))


def feature_page(
    feature: dict,
    pillars_by_prefix: dict[str, dict],
    features: dict[str, dict],
    root: Path,
    *,
    repo_url: str | None = None,
    docs_prefix: str = "docs",
    show_sprint: bool = False,
    show_branches: bool = False,
    show_design: bool = False,
    show_issue: bool = False,
) -> str:
    """Generate the Markdown page for one roadmap feature."""
    pillar = pillars_by_prefix[feature["pillar"]]
    lines = [
        "---",
        "template: roadmap.html",
        "---",
        "",
        "# " + md(feature["title"]),
        "",
    ]
    if feature.get("draft"):
        lines += [
            '!!! note "Draft"',
            "    The dependencies of this entry are a first draft and still need checking.",
            "",
        ]
    lines += [md(feature["summary"]), ""]
    docs = (
        _heading_link(root, "roadmap", feature["docs"], "docs", repo_url, docs_prefix)
        if feature.get("docs")
        else "None"
    )
    shown = shown_status(feature)
    scope = feature["scope"]
    rows = [
        ("ID", "`%s`" % feature["id"]),
        (
            "Status",
            '<span class="roadmap-badge roadmap-badge--%s">%s</span>'
            % (shown, BADGE_LABELS[shown]),
        ),
        (
            "Scope",
            '<span class="roadmap-scope roadmap-scope--%s">%s</span>'
            % (scope, SCOPE_LABELS.get(scope, "None")),
        ),
        ("Pillar", "[%s](%s.md)" % (md(pillar["title"]), pillar["slug"])),
    ]
    if show_sprint:
        rows.append(
            ("Sprint", str(feature["sprint"]) if feature.get("sprint") else "None")
        )
    rows.append(("Depends On", _feature_links(feature["depends_on"], features)))
    rows.append(("Unblocks", _feature_links(feature["unblocks"], features)))
    rows.append(("Docs", docs))
    if show_branches:
        branches = (
            "<br>".join("`%s`" % b for b in feature["branches"])
            if feature.get("branches")
            else "None"
        )
        rows.append(("Branches", branches))
    if show_design:
        design = (
            _heading_link(
                root, "roadmap", feature["design"], "design", repo_url, docs_prefix
            )
            if feature.get("design")
            else "None"
        )
        rows.append(("Design", design))
    if show_issue:
        if feature.get("issue"):
            issue = (
                "[#%d](%s/issues/%d)"
                % (feature["issue"], repo_url.rstrip("/"), feature["issue"])
                if repo_url
                else "#%d" % feature["issue"]
            )
        else:
            issue = "None"
        rows.append(("Issue", issue))

    lines += ["| Field | Value |", "| --- | --- |"]
    lines += ["| %s | %s |" % row for row in rows]
    if feature.get("in_progress"):
        lines += [
            "",
            "The work on these branches is unfinished, so the feature shows as in progress.",
        ]
    lines += [""]
    if feature.get("sources"):
        lines += ["## Coverage Ledger", ""]
        lines += [
            "- " + source_line(root, group, entry, repo_url, docs_prefix)
            for group, entry in feature["sources"]
        ]
        lines += [""]
    # Raw links because the node anchor exists only once the graph renders.
    lines += [
        '<a class="md-button" href="../">Roadmap Graph</a> '
        '<a class="md-button" href="../#%s">Feature in Graph</a>' % feature["id"],
        "",
    ]
    return "\n".join(lines)


# JSON generators

def _dump(obj: object) -> str:
    return json.dumps(obj, indent=2, ensure_ascii=False) + "\n"


def graph_json(pillars: list[dict], features: dict[str, dict]) -> str:
    """Serialize graph.json consumed by roadmap.js."""
    order = {p["prefix"]: p["order"] for p in pillars}
    nodes = []
    for feat in sorted(
        features.values(), key=lambda f: (order[f["pillar"]], id_key(f["id"]))
    ):
        node: dict[str, object] = {
            "id": feat["id"],
            "title": feat["title"],
            "status": feat["status"],
            "scope": feat["scope"],
            "pillar": feat["pillar"],
            "summary": feat["summary"],
            "url": feat["id"].lower() + "/",
        }
        if feat.get("in_progress"):
            node["in_progress"] = True
        if feat.get("sprint") is not None:
            node["sprint"] = feat["sprint"]
        if feat.get("branches"):
            node["branches"] = feat["branches"]
        if feat.get("draft"):
            node["draft"] = True
        nodes.append(node)
    edges = []
    for feat in sorted(features.values(), key=lambda f: id_key(f["id"])):
        for dep in feat["depends_on"]:
            edge: dict[str, object] = {
                "id": "%s>%s" % (dep, feat["id"]),
                "source": dep,
                "target": feat["id"],
            }
            if feat.get("draft"):
                edge["draft"] = True
            edges.append(edge)
    edges.sort(key=lambda e: (id_key(str(e["target"])), id_key(str(e["source"]))))
    return _dump(
        {
            "pillars": [
                {
                    "prefix": p["prefix"],
                    "title": p["title"],
                    "slug": p["slug"],
                    "order": p["order"],
                    "url": p["slug"] + "/",
                }
                for p in pillars
            ],
            "nodes": nodes,
            "edges": edges,
        }
    )


def candidates_json(cand_pillars: list[dict], features: dict[str, dict]) -> str:
    """Serialize candidates.json consumed by navigator.js."""
    used = {
        dep
        for pillar in cand_pillars
        for cand in pillar["candidates"]
        for dep in cand.get("depends_on") or []
    }
    return _dump(
        {
            "origins": [{"origin": origin, "title": title} for origin, title in ORIGINS],
            "pillars": [
                {
                    "prefix": p["pillar"],
                    "slug": p["slug"],
                    "title": p["title"],
                    "proposed": p["proposed"],
                    "description": p.get("description"),
                    "alternative": p.get("alternative"),
                    "url": "%s/%s/" % (CANDIDATES, p["slug"]),
                    "candidates": [
                        {
                            "key": c["key"],
                            "title": c["title"],
                            "summary": c["summary"],
                            "serves": c.get("serves"),
                            "origin": c["origin"],
                            "depends_on": sorted(c.get("depends_on") or [], key=id_key),
                        }
                        for c in p["candidates"]
                    ],
                }
                for p in cand_pillars
            ],
            "features": {
                fid: {
                    "title": features[fid]["title"],
                    "status": shown_status(features[fid]),
                    "url": fid.lower() + "/",
                    "graph": "./#" + fid,
                }
                for fid in sorted(used, key=id_key)
            },
        }
    )


def _source_ref(group: dict, entry: dict) -> dict:
    ref: dict[str, object] = {"ledger": group["file"], "item": entry["item"]}
    for key in ("heading", "ref", "page", "pr", "branch", "state", "file"):
        if entry.get(key) is not None:
            ref[key] = entry[key]
    if group.get("kind") == "page":
        ref["source"] = group["source"]
        ref.setdefault("ref", group.get("ref") or "main")
    return ref


def registry_json(pillars: list[dict], features: dict[str, dict], site: str) -> str:
    """Serialize roadmap.json at the site root."""
    has_extended = any(
        f.get("sprint") is not None
        or f.get("branches")
        or f.get("in_progress")
        or f.get("design") is not None
        or f.get("issue") is not None
        or f.get("draft")
        or f.get("sources")
        for f in features.values()
    )
    items = []
    for feat in sorted(features.values(), key=lambda f: id_key(f["id"])):
        item: dict[str, object] = {
            "id": feat["id"],
            "title": feat["title"],
            "status": feat["status"],
            "scope": feat["scope"],
            "pillar": feat["pillar"],
            "summary": feat["summary"],
            "depends_on": feat["depends_on"],
            "unblocks": feat["unblocks"],
            "docs": feat["docs"],
        }
        if has_extended:
            item["sprint"] = feat["sprint"]
            item["branches"] = feat["branches"]
            item["in_progress"] = feat["in_progress"]
            item["design"] = feat["design"]
            item["issue"] = feat["issue"]
            item["draft"] = feat["draft"]
            item["sources"] = [_source_ref(g, e) for g, e in feat["sources"]]
        item["url"] = "%sroadmap/%s/" % (site, feat["id"].lower())
        items.append(item)
    return _dump(
        {
            "site": site,
            "pillars": [
                {
                    "prefix": p["prefix"],
                    "title": p["title"],
                    "slug": p["slug"],
                    "order": p["order"],
                    "summary": p["summary"],
                    "url": "%sroadmap/%s/" % (site, p["slug"]),
                    "features": [f["id"] for f in p["features"]],
                }
                for p in pillars
            ],
            "features": items,
        }
    )


def generate(
    root: Path,
    *,
    site: str | None = None,
    roadmap_dir: Path | None = None,
    candidates_dir: Path | None = None,
    coverage_dir: Path | None = None,
    repo_url: str | None = None,
    docs_prefix: str = "docs",
) -> list[tuple[str, str, bool]]:
    """Return [(src_uri, content, in_nav)] for every generated roadmap file."""
    root_path = Path(root)
    site_url = site or site_url_from_mkdocs(root_path)
    if not site_url.endswith("/"):
        site_url += "/"
    pillars, features = load_registry(
        root_path,
        roadmap_dir=roadmap_dir,
        coverage_dir=coverage_dir,
    )
    by_prefix = {p["prefix"]: p for p in pillars}
    cand = read_candidates(
        root_path,
        features,
        roadmap_dir=roadmap_dir,
        candidates_dir=candidates_dir,
    )
    with_candidates = {p["slug"] for p in cand}

    show_sprint = any(f.get("sprint") is not None for f in features.values())
    show_branches = any(f.get("branches") for f in features.values())
    show_design = any(f.get("design") is not None for f in features.values())
    show_issue = any(f.get("issue") is not None for f in features.values())

    out: list[tuple[str, str, bool]] = []
    for pillar in pillars:
        out.append(
            (
                "roadmap/%s.md" % pillar["slug"],
                pillar_page(pillar, has_candidates=pillar["slug"] in with_candidates),
                True,
            )
        )
    for fid in sorted(features, key=id_key):
        out.append(
            (
                "roadmap/%s.md" % fid.lower(),
                feature_page(
                    features[fid],
                    by_prefix,
                    features,
                    root_path,
                    repo_url=repo_url,
                    docs_prefix=docs_prefix,
                    show_sprint=show_sprint,
                    show_branches=show_branches,
                    show_design=show_design,
                    show_issue=show_issue,
                ),
                False,
            )
        )
    if cand:
        out.append(("roadmap/%s/index.md" % CANDIDATES, candidates_index(), True))
        for pillar in cand:
            out.append(
                (
                    "roadmap/%s/%s.md" % (CANDIDATES, pillar["slug"]),
                    candidates_page(pillar, features, by_prefix),
                    False,
                )
            )
        out.append(("roadmap/candidates.json", candidates_json(cand, features), True))
    out.append(("roadmap/graph.json", graph_json(pillars, features), True))
    out.append(("roadmap.json", registry_json(pillars, features, site_url), True))
    return out


def write_generated(out_dir: Path, generated: list[tuple[str, str, bool]]) -> None:
    """Write generated roadmap files under out_dir at their source paths."""
    base = Path(out_dir)
    for src_uri, content, _ in generated:
        target = base / src_uri
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
