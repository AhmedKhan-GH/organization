"""Check documentation Markdown headings against the Sternbild Title Case rule.

Checks every ATX H1, H2, and H3 heading in Markdown files. YAML frontmatter and
fenced code blocks are skipped, and H4 or deeper headings are ignored.
"""

from __future__ import annotations

import pathlib
import re
import sys
from collections.abc import Iterable, Iterator, Sequence

MINOR_WORDS = frozenset(
    "a an the and but or nor for so yet as at by in of on per to up via vs "
    "with from into onto over than".split()
)

# Lower-case technical identifiers allowed in headings without backticks.
IDENTIFIER_WORDS = frozenset(
    "macos ios npm pip uv git ctest cmake cargo rustc rustup egui sqlite "
    "rustfmt clippy zcode astrolabe caliper arm64 x86".split()
)

ARTICLE_WORDS = frozenset({"the", "a", "an"})

HTML_TAGS = (
    "a abbr b br code div em i img kbd mark p s small span strong sub sup u"
).split()

HEADING = re.compile(r"^ {0,3}(#{1,3})[ \t]+(.*?)[ \t]*$")
FENCE = re.compile(r"^ {0,3}(`{3,}|~{3,})(.*)$")
NUMBERING = re.compile(r"^\d+(\.\d+)*[.)]?$")
CODE_SPAN = re.compile(r"(`+)(.+?)\1")
PLACEHOLDER = re.compile(r"\x00(\d+)\x00")
IDENTIFIER_CHARS = re.compile(r"[._/\\=()<>]")
HTML_TAG = re.compile(r"</?(?:%s)(?:\s[^>]*)?/?>" % "|".join(HTML_TAGS), re.I)


def strip_inline(text: str) -> tuple[str, list[str]]:
    """Replace code spans with markers and strip inline Markdown syntax."""
    spans: list[str] = []

    def keep(match: re.Match[str]) -> str:
        spans.append(match.group(2))
        return "\x00%d\x00" % (len(spans) - 1)

    text = CODE_SPAN.sub(keep, text)
    text = re.sub(r"[ \t]*\{[^{}]*\}[ \t]*$", "", text)
    text = re.sub(r"!?\[([^\]]*)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"\[([^\]]*)\]\[[^\]]*\]", r"\1", text)
    text = HTML_TAG.sub("", text)
    text = re.sub(r"\*+", "", text)
    text = re.sub(r"(?<!\w)__+(?=\S)(.+?)(?<=\S)__+(?!\w)", r"\1", text)
    text = re.sub(r"(?<!\w)_(?=\S)(.+?)(?<=\S)_(?!\w)", r"\1", text)
    return text.strip(), spans


def clean_token(token: str) -> str:
    """Strip surrounding punctuation from one whitespace-separated token."""
    token = token.lstrip("([\"'\u201c\u2018")
    token = token.rstrip(",;.)]\"'\u201d\u2019?!")
    return token


def words_of(text: str) -> list[str]:
    """Return heading words after removing an optional leading numbering prefix."""
    words: list[str] = []
    for token in text.split():
        word = clean_token(token)
        if not word or not any(c.isalnum() or c == "\x00" for c in word):
            continue
        words.append(word)
    if len(words) > 1 and NUMBERING.match(words[0]):
        words = words[1:]
    return words


def part_fails(
    part: str,
    first: bool,
    identifier_words: frozenset[str] = IDENTIFIER_WORDS,
) -> bool:
    """Return True when a word or hyphenated segment breaks the Title Case rule."""
    if not part or "\x00" in part:
        return False
    if not part[0].isalpha():
        return False
    if part[0].isupper():
        return False
    if any(c.isupper() for c in part[1:]):
        return False
    if IDENTIFIER_CHARS.search(part):
        return False
    if part.lower() in identifier_words:
        return False
    if re.fullmatch(r"v\d+([._]\d+)*", part):
        return False
    if part in MINOR_WORDS and not first:
        return False
    return True


def word_failure(
    word: str,
    first_word: bool,
    identifier_words: frozenset[str] = IDENTIFIER_WORDS,
) -> str | None:
    """Return the offending token when a word is not Title Case, else None."""
    if word.startswith("-") or "\x00" in word:
        return None
    if IDENTIFIER_CHARS.search(word):
        return None
    parts = word.split("-")
    for index, part in enumerate(parts):
        if part_fails(part, first_word and index == 0, identifier_words):
            return word
    return None


def judge(
    heading: str,
    extra_words: Iterable[str] | None = None,
) -> str | None:
    """Return the failure reason for one raw heading text, or None when valid."""
    identifier_words = (
        IDENTIFIER_WORDS | frozenset(w.lower() for w in extra_words)
        if extra_words
        else IDENTIFIER_WORDS
    )
    text, _ = strip_inline(str(heading))
    words = words_of(text)
    if not words:
        return None
    first = words[0].lower()
    if first in ARTICLE_WORDS:
        return "starts with an article"
    if first == "your":
        return "starts with Your"
    if ":" in PLACEHOLDER.sub("", text):
        return "contains a colon"
    if text.rstrip().endswith("?"):
        return "question"
    for index, word in enumerate(words):
        bad = word_failure(word, index == 0, identifier_words)
        if bad:
            return "not Title Case (%s)" % bad
    return None


def headings(path: pathlib.Path) -> Iterator[tuple[int, int, str]]:
    """Yield (line_number, level, raw_text) for checked H1-H3 headings in a file."""
    lines = path.read_text(encoding="utf-8").splitlines()
    start = 0
    if lines and lines[0].strip() == "---":
        for index in range(1, len(lines)):
            if lines[index].strip() in ("---", "..."):
                start = index + 1
                break
    fence: str | None = None
    for index in range(start, len(lines)):
        line = lines[index]
        match = FENCE.match(line)
        if fence:
            if (
                match
                and match.group(1)[0] == fence[0]
                and len(match.group(1)) >= len(fence)
                and not match.group(2).strip()
            ):
                fence = None
            continue
        if match and not (match.group(1)[0] == "`" and "`" in match.group(2)):
            fence = match.group(1)
            continue
        found = HEADING.match(line)
        if found:
            text = re.sub(r"[ \t]+#+$", "", found.group(2))
            yield index + 1, len(found.group(1)), text


def _display_path(
    path: pathlib.Path,
    target: pathlib.Path,
    root: pathlib.Path | None,
) -> str:
    if root is not None:
        try:
            return path.resolve().relative_to(root.resolve()).as_posix()
        except ValueError:
            pass
    base = target.parent if target.is_dir() and target.name == "docs" else (
        target if target.is_dir() else target.parent
    )
    try:
        return path.resolve().relative_to(base.resolve()).as_posix()
    except ValueError:
        return path.as_posix()


def check_headings(
    paths: Sequence[pathlib.Path],
    *,
    root: pathlib.Path | None = None,
    extra_words: Iterable[str] | None = None,
    list_headings: bool = False,
    stream=None,
    err_stream=None,
) -> int:
    """Validate headings across all passed directories or Markdown files.

    Returns 0 when every heading passes, 1 when any fails, and 2 on invalid paths.
    """
    out = stream if stream is not None else sys.stdout
    err = err_stream if err_stream is not None else sys.stderr

    targets = list(paths)
    if not targets:
        base = root if root is not None else pathlib.Path.cwd()
        targets = [base / "docs"]

    files_with_base: list[tuple[pathlib.Path, pathlib.Path]] = []
    for target in targets:
        if target.is_dir():
            for md_file in sorted(target.rglob("*.md")):
                files_with_base.append((md_file, target))
        elif target.is_file():
            files_with_base.append((target, target))
        else:
            print("error: %s is not a file or directory" % target, file=err)
            return 2

    checked = 0
    failed = 0
    extra = frozenset(w.lower() for w in (extra_words or ()) if w)
    for md_file, target in files_with_base:
        rel = _display_path(md_file, target, root)
        for number, level, text in headings(md_file):
            checked += 1
            if list_headings:
                print("%s:%d: H%d %s" % (rel, number, level, text), file=out)
            reason = judge(text, extra_words=extra)
            if reason:
                failed += 1
                print("%s:%d: %s: %s" % (rel, number, text, reason), file=out)

    print("%d of %d docs headings break the title rule" % (failed, checked), file=out)
    return 1 if failed else 0
