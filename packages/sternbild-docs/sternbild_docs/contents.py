"""Build the interactive documentation tree for docs/contents.md."""

from __future__ import annotations

import html
import re

from mkdocs.structure.nav import Page, Section

CONTENTS_PAGE = "contents.md"
CONTENTS_MARK = "<!-- docs-tree -->"


def _title(page: Page) -> str:
    if page.title:
        return page.title
    match = re.search(r"^# (.+)$", page.file.content_string, re.M)
    return match.group(1).strip() if match else page.file.src_uri


def _href(page: Page, use_directory_urls: bool) -> str:
    # When directory URLs are active, contents.md renders at contents/index.html.
    prefix = "../" if use_directory_urls else ""
    return prefix + page.url


def _leaf(page: Page, use_directory_urls: bool) -> str:
    return '<li class="dt-page"><a href="%s">%s</a></li>' % (
        html.escape(_href(page, use_directory_urls)),
        html.escape(_title(page)),
    )


def _node(title: str, children, use_directory_urls: bool, contents_page: str) -> str:
    body = "".join(
        _item(child, use_directory_urls, contents_page) for child in children
    )
    return (
        '<li class="dt-section is-open">'
        '<button type="button" class="dt-toggle">%s</button>'
        "<ul>%s</ul></li>" % (html.escape(title), body)
    )


def _item(item, use_directory_urls: bool, contents_page: str) -> str:
    if isinstance(item, Section):
        return _node(item.title, item.children, use_directory_urls, contents_page)
    if isinstance(item, Page) and item.file.src_uri != contents_page:
        return _leaf(item, use_directory_urls)
    return ""


def build_tree_html(
    nav,
    *,
    use_directory_urls: bool = True,
    contents_page: str = CONTENTS_PAGE,
) -> str:
    """Return the HTML tree block representing all pages in the site navigation."""
    roots = "".join(
        _item(item, use_directory_urls, contents_page) for item in nav.items
    )
    buttons = (
        '<div class="dt-actions">'
        '<button type="button" class="dt-btn" data-all="open">Expand All</button>'
        '<button type="button" class="dt-btn" data-all="close">Collapse All</button>'
        "</div>"
    )
    script = (
        "<script>(function () {"
        "var tree = document.currentScript.parentElement;"
        "tree.addEventListener('click', function (e) {"
        "var t = e.target.closest('.dt-toggle');"
        "if (t) { t.parentElement.classList.toggle('is-open'); return; }"
        "var b = e.target.closest('[data-all]');"
        "if (b) tree.querySelectorAll('.dt-section').forEach(function (s) {"
        "s.classList.toggle('is-open', b.getAttribute('data-all') === 'open'); });"
        "}); })();</script>"
    )
    return '<div class="docs-tree">%s<ul class="dt-root">%s</ul>%s</div>' % (
        buttons,
        roots,
        script,
    )


def render_contents_markdown(
    markdown: str,
    page: Page,
    tree_html: str,
    *,
    contents_page: str = CONTENTS_PAGE,
) -> str:
    """Inject the rendered documentation tree into the contents page marker."""
    if page.file.src_uri == contents_page and tree_html:
        return markdown.replace(CONTENTS_MARK, tree_html)
    return markdown
