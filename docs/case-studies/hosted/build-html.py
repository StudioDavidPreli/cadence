#!/usr/bin/env python3
# Builds the hosted case-study HTML set from markdown: the chapter pages from the
# sources in this directory, plus the five companion papers one level up (the
# Going Deeper set and the chronology), which emit their HTML here so every
# relative link resolves on the web host (davidpreli.com/cadence/).
# Run after ANY edit to a chapter or companion .md:
#   /usr/local/bin/python3 build-html.py
# (that interpreter has the markdown module; Homebrew python3 does not).
#
# Raw HTML blocks (the inline SVGs with blank lines, the flex layouts, style
# blocks) are swapped for opaque tokens before conversion and restored after,
# because python-markdown splits HTML blocks on blank lines. nl2br is on
# deliberately: the chapter files use single newlines for the Role/Timeline
# block and the build-note field lines, and every prose paragraph is one
# source line, so the extension matches authoring intent everywhere.
import re, html as htmlmod
from pathlib import Path
import markdown

HOSTED = Path(__file__).resolve().parent

def protect(text):
    lines = text.split("\n")
    out, blocks, i = [], [], 0
    def closes(tag):
        return {"svg": "</svg>", "style": "</style>", "figure": "</figure>"}.get(tag)
    while i < len(lines):
        line = lines[i]
        if line.startswith("<!--"):
            j = i
            while "-->" not in lines[j]: j += 1
            blocks.append("\n".join(lines[i:j+1])); out.append(f"HTMLPROTECT{len(blocks)-1}TOK"); i = j+1; continue
        m = re.match(r"<(svg|style|figure|div|h1|h2|h3|img|iframe)\b", line)
        if m:
            tag = m.group(1)
            if tag in ("h1", "h2", "h3", "img", "iframe") and (f"</{tag}>" in line or line.rstrip().endswith("/>")):
                blocks.append(line); out.append(f"HTMLPROTECT{len(blocks)-1}TOK"); i += 1; continue
            if tag == "div":
                depth, j = 0, i
                while True:
                    depth += lines[j].count("<div") - lines[j].count("</div>")
                    if depth == 0: break
                    j += 1
                blocks.append("\n".join(lines[i:j+1])); out.append(f"HTMLPROTECT{len(blocks)-1}TOK"); i = j+1; continue
            close = closes(tag)
            if close:
                j = i
                while close not in lines[j]: j += 1
                blocks.append("\n".join(lines[i:j+1])); out.append(f"HTMLPROTECT{len(blocks)-1}TOK"); i = j+1; continue
        out.append(line); i += 1
    return "\n".join(out), blocks

STYLE = """
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #141414; color: #e1e1e1;
      font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 14px; line-height: 1.7; }
    main { max-width: 880px; margin: 0 auto; padding: 48px 24px 96px; }
    h1 { font-size: 26px; line-height: 1.3; }
    h2 { font-size: 20px; margin-top: 56px; }
    h3 { font-size: 16px; margin-top: 40px; }
    h4 { font-size: 14px; margin-top: 32px; }
    a { color: #76c17d; text-decoration: none; }
    a:hover { text-decoration: underline; }
    code { background: #1a1a1a; border: 1px solid #2e2e2e; border-radius: 4px; padding: 1px 5px; font-size: 0.92em; }
    hr { border: 0; border-top: 1px solid #2e2e2e; margin: 40px 0; }
    img, svg, iframe { max-width: 100%; }
    h1 img, main > img, figure img { display: block; margin-left: auto; margin-right: auto; }
    figcaption { text-align: center; }
    figure { margin: 0 0 16px 0; }
    strong { color: #ffffff; }
    ol, ul { padding-left: 24px; }
    li { margin: 6px 0; }
"""

TITLES = {
  "index": "Cadence: Case Study",
  "token-system": "The Token System · Cadence Case Study",
  "principles": "The Principles · Cadence Case Study",
  "build-notes": "Build Notes · Cadence Case Study",
  "fields-and-canvases": "Fields and Canvases · Cadence Case Study",
  "key-decisions": "Key Decisions · Cadence Case Study",
  "built-and-learned": "What I Built, What I Learned · Cadence Case Study",
  "cadence-overview": "The Plain Overview · Cadence Case Study",
  "cadence-two-lexicons": "Two Lexicons · Cadence Case Study",
  "working-with-claude": "Working with Claude · Cadence Case Study",
  "cadence-what-this-demonstrates": "What This Demonstrates · Cadence Case Study",
  "cadence-animation-chronology": "The Animation Chronology · Cadence Case Study",
}

# Meta descriptions for search snippets and the og/twitter link cards. Each reuses
# a framing sentence already in the set's markdown (the index's own chapter and
# Going Deeper blurbs; the companions' opening lines). Nothing here is new prose.
DESCRIPTIONS = {
  "index": "Cadence is a motion design system explorer. It demonstrates how design tokens drive animation behavior in real UI components, through the classic 12 principles of animation and six design-engineering extensions.",
  "token-system": "Five token families, the two-channel dispatch, and the bezier that spent three months claiming to be a spring.",
  "principles": "Eighteen cards, the classic twelve plus six extensions, each demonstrated on a real component, with build notes for all eighteen.",
  "build-notes": "Each of the eighteen carries the same four fields: the component, the tokens driving it, the key decision, and what it demonstrates.",
  "fields-and-canvases": "Fifty tiles on one clock, tokens crossing into WebGL, and a generative background that listens to the presets.",
  "key-decisions": "Why layoutId left the codebase, why the grid took five tries, and the bug that existed only in production.",
  "built-and-learned": "The shipped surface, the numbers, and what the build changed about the builder.",
  "cadence-overview": "What Cadence does, in plain language, no engineering required.",
  "cadence-two-lexicons": "The technical paper, organized as a translation table between motion design and design engineering.",
  "working-with-claude": "How the collaboration ran, every line read before it landed, and which methods earned their keep.",
  "cadence-what-this-demonstrates": "The hiring-manager cut of the Cadence case study.",
  "cadence-animation-chronology": "Eleven days of iteration on the PrincipleCard animation that produced no commits, kept because the patterns instruct.",
}

# The five companion papers one level up (docs/case-studies/*.md). Their sources
# stay where they are (GitHub-linkable as before); their HTML emits into hosted/
# so the Going Deeper links resolve on the web host.
COMPANIONS = [
  "cadence-overview",
  "cadence-two-lexicons",
  "working-with-claude",
  "cadence-what-this-demonstrates",
  "cadence-animation-chronology",
]

# Where the set is served, for canonical/og URLs and the shared og:image.
BASE_URL = "https://davidpreli.com/cadence/"
# A relative .md link whose stem is NOT in the built set (working-with-claude's
# ../claude-workflow.md) rewrites to the file on GitHub, matching the absolute
# GitHub links the chapters already carry.
GITHUB_DOCS = "https://github.com/StudioDavidPreli/cadence/blob/main/docs/"

def rewrite_links(text, in_hosted, page_stems):
    # (hosted/x.md): how the companion sources reference the chapters.
    text = re.sub(r"\(hosted/([a-z0-9-]+)\.md\)", r"(\1.html)", text)
    # (../x.md): an in-set stem lands beside this page as .html; anything else
    # goes to GitHub. ../ resolves against the SOURCE location, which differs:
    # docs/case-studies/ for chapter sources (in hosted/), docs/ for companions.
    def parent(m):
        stem = m.group(1)
        if stem in page_stems:
            return f"({stem}.html)"
        prefix = "case-studies/" if in_hosted else ""
        return f"({GITHUB_DOCS}{prefix}{stem}.md)"
    text = re.sub(r"\(\.\./([a-z0-9-]+)\.md\)", parent, text)
    # (x.md): same-directory links between chapters.
    return re.sub(r"\(([a-z0-9-]+)\.md\)", r"(\1.html)", text)

md = markdown.Markdown(extensions=["extra", "nl2br"])
SOURCES = [(src, True) for src in sorted(HOSTED.glob("*.md"))] + [
    (HOSTED.parent / f"{stem}.md", False) for stem in COMPANIONS
]
PAGE_STEMS = {src.stem for src, _ in SOURCES}
# The chapters carry a "[Cadence: Case Study](index.md) · Chapter N" breadcrumb in
# their sources; the companion sources do not (on GitHub their directory context is
# the way back). The hosted pages need one, so the build injects it: after the
# page's <h1> when there is one, at the top of the body for the chronology (which
# opens with its metadata block instead of a heading).
CRUMB = '<p><a href="index.html">Cadence: Case Study</a> · Companion</p>'

for src, in_hosted in SOURCES:
    stem = src.stem
    text = rewrite_links(src.read_text(), in_hosted, PAGE_STEMS)
    protected, blocks = protect(text)
    md.reset()
    body = md.convert(protected)
    for n, block in enumerate(blocks):
        body = body.replace(f"<p>HTMLPROTECT{n}TOK</p>", block).replace(f"HTMLPROTECT{n}TOK", block)
    if stem in COMPANIONS:
        if "</h1>" in body:
            body = body.replace("</h1>", "</h1>\n" + CRUMB, 1)
        else:
            body = CRUMB + "\n" + body
    title = htmlmod.escape(TITLES.get(stem, stem))
    desc = htmlmod.escape(DESCRIPTIONS.get(stem, DESCRIPTIONS["index"]))
    # The index's canonical URL is the bare directory; every other page keeps its
    # real .html filename (all internal links depend on the extension surviving).
    url = BASE_URL if stem == "index" else f"{BASE_URL}{stem}.html"
    og_type = "website" if stem == "index" else "article"
    og_image = f"{BASE_URL}media/og-image.png"
    page = f"""<!DOCTYPE html>
<html lang=\"en\">
<head>
  <meta charset=\"utf-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
  <title>{title}</title>
  <meta name=\"description\" content=\"{desc}\" />
  <link rel=\"canonical\" href=\"{url}\" />
  <meta property=\"og:title\" content=\"{title}\" />
  <meta property=\"og:description\" content=\"{desc}\" />
  <meta property=\"og:type\" content=\"{og_type}\" />
  <meta property=\"og:url\" content=\"{url}\" />
  <meta property=\"og:image\" content=\"{og_image}\" />
  <meta property=\"og:image:width\" content=\"1200\" />
  <meta property=\"og:image:height\" content=\"630\" />
  <meta name=\"twitter:card\" content=\"summary_large_image\" />
  <meta name=\"twitter:title\" content=\"{title}\" />
  <meta name=\"twitter:description\" content=\"{desc}\" />
  <meta name=\"twitter:image\" content=\"{og_image}\" />
  <link rel=\"icon\" href=\"https://cadence.davidpreli.com/favIcon/favIcon.svg\" />
  <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">
  <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>
  <link href=\"https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap\" rel=\"stylesheet\">
  <style>{STYLE}</style>
</head>
<body>
  <main>
{body}
  </main>
</body>
</html>
"""
    (HOSTED / f"{stem}.html").write_text(page)
    print("rebuilt", stem)
print("leftover-tokens:", sum("HTMLPROTECT" in p.read_text() for p in HOSTED.glob("*.html")))
