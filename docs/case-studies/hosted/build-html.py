#!/usr/bin/env python3
# Builds the six hosted case-study HTML pages from their markdown sources.
# Run after ANY edit to a chapter .md:  /usr/local/bin/python3 build-html.py
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
  "fields-and-canvases": "Fields and Canvases · Cadence Case Study",
  "key-decisions": "Key Decisions · Cadence Case Study",
  "built-and-learned": "What I Built, What I Learned · Cadence Case Study",
}

md = markdown.Markdown(extensions=["extra", "nl2br"])
for src in sorted(HOSTED.glob("*.md")):
    stem = src.stem
    text = re.sub(r"\(([a-z0-9-]+)\.md\)", r"(\1.html)", src.read_text())
    protected, blocks = protect(text)
    md.reset()
    body = md.convert(protected)
    for n, block in enumerate(blocks):
        body = body.replace(f"<p>HTMLPROTECT{n}TOK</p>", block).replace(f"HTMLPROTECT{n}TOK", block)
    page = f"""<!DOCTYPE html>
<html lang=\"en\">
<head>
  <meta charset=\"utf-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
  <title>{htmlmod.escape(TITLES.get(stem, stem))}</title>
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
    src.with_suffix(".html").write_text(page)
    print("rebuilt", stem)
print("leftover-tokens:", sum("HTMLPROTECT" in p.read_text() for p in HOSTED.glob("*.html")))
