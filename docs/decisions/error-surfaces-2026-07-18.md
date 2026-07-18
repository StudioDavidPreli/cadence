# Error surfaces: copy, contrast, and the no-accent rule

**Date: 2026-07-18**
**Status: complete, verified on built output, all four themes**

A session that started as a copy review. David asked what the error messages
and screens looked like. The inventory turned up five surfaces and two
problems the theme QA had never caught, because a crash screen only renders
when something else is already wrong.

## The inventory

Four ErrorBoundary mounts (root, the Carousel demo, the Principles Library,
the Motion Tiles grid) sharing one card component. Two bug-report forms with
identical status lines. The token import report. The Motion Tiles load
failure. The fps readout's warn state. The Worker's bare 502, which the
client translates before anyone reads it. None of these are modals except
the two that live inside one already: the import report and the bug-report
status.

## Finding one: the load error spoke to the wrong person

"Failed to load /riveTiles/ingredients_v8.riv. Check the path and the
export." A visitor cannot check the export. The line now reads "The tile
grid could not load. Check your connection and reload the page.", carries
`role="alert"`, and the asset path moved to `console.error`, where it still
helps the one person it can. The loading label dropped its raw status
interpolation on the way: "Loading…", not "Loading… (loading)".

## Finding two: the crash card was illegible in three themes

`ErrorBoundary.module.css` paired `--color-surface` with text tokens meant
for a raised card. In this system `--color-surface` is the interactive
surface: dark in the light theme, inverted at the extremes in both HC
themes. The message ran 3.0:1 in light and black-on-black in
high-contrast-light; the Reload label bottomed out at 1.4:1. The title
survived everywhere by coincidence: `text-primary` means "text on dark
interactive surfaces," which happened to match the wrong background.

The card was built 2026-07-15, three months after the contrast audit, and no
theme pass since had reason to crash the app.

The fix is a token swap, no layout change: `--color-surface-raised` for the
card, `text-base` for the title, and the Reload button now wears the same
ghost pattern as the bug-report submit buttons (border, transparent
background, `surface-active` on hover with `color` restated). One button
vocabulary across every error surface. Message contrast after the swap:
5.5:1 dark, 5.7:1 light, 21:1 in both HC themes.

## The decision: errors carry no accent

The load error wore `--color-accent`. The bug-report error state wore
`--color-accent3`. David cut both. Accent means active, connected, currently
affecting the system, and a failure is none of those. Error text is now
plain `--color-text-base` everywhere it appears: the load error, both
report error lines, the import-failure line. The sent status keeps its
accent; a delivered report is exactly the state the token names. The
accent-as-text census in the deploy checklist shrank from six to four.

## Verification

Built output. A temporary `?crash` query hook in App forced a render throw,
the one thing a boundary catches, and David cycled all four themes against
the card by setting `data-theme` from the console (the theme switcher
crashes with the rest of the shell, which is the point). The hook came out
after the pass. 104 unit tests and the build stayed green throughout.
Checklist and matrix each gained an Error surfaces section; the CLAUDE.md
accent census was corrected the same day.

The crash card is the only surface in the app that must work when the app
does not. It is now the most boring screen in the project: a quiet card, a
gray sentence, a button that says Reload.
