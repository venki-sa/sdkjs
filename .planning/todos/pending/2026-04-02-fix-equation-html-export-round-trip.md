---
created: 2026-04-02T14:49:55.650Z
title: Fix equation HTML export round-trip
area: general
files:
  - common/wordcopypaste.js:660
  - common/wordcopypaste.js:8519
  - common/wordcopypaste.js:12898
  - word/Editor/Math.js:1307
---

## Problem

Equation HTML export was changed to emit LaTeX text instead of image fallbacks, but the current export markers do not match the existing HTML import conventions. Export now writes `class="math-tex"` and `data-latex`, while import logic recognizes `oo-latex`, `oo-latex-inline`, and MathML. This creates a round-trip gap where exported equations may not be parsed back into `ParaMath` reliably. The current export also does not preserve inline vs display mode explicitly, which risks layout regressions for proofing and browser editing workflows where equations are critical.

## Solution

Update equation HTML export to use the same conventions already supported by the importer, preferably `oo-latex` / `oo-latex-inline` plus any additional `data-oo-*` metadata needed for the publishing workflow. Preserve inline vs display math mode explicitly and keep LaTeX as the canonical source representation. If browser rendering fidelity is required, pair the source-preserving export with a renderer layer instead of falling back to image-only output.
