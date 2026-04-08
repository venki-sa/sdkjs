# Strict LaTeX Export Spec

## Status

This document defines the target contract for the strict OMML-to-LaTeX exporter in `word/Math`.

It is intentionally spec-driven:

- correctness is defined by OMML semantics and exporter invariants
- corpus mining is used only for prioritization and regression detection
- author-specific Word habits must not define the export contract

This spec is the source of truth for:

- node coverage
- symbol mapping rules
- style normalization
- fidelity classification
- HTML export metadata

Related implementation files:

- `word/Math/LaTeXExportRegistry.js`
- `word/Math/LaTeXExportNodes.js`
- `word/Math/LaTeXExportSymbols.js`
- `word/Math/LaTeXExportRenderer.js`
- `word/Math/LaTeXExportContext.js`
- `common/wordcopypaste.js`

Related tooling:

- `tools/latex-export/README.md`

## Goals

The strict exporter must:

1. emit portable LaTeX that preserves OMML math semantics
2. avoid legacy ONLYOFFICE linear syntax and private aliases
3. produce deterministic output for the same OMML input
4. distinguish exact, normalized, approximated, unsupported, and invalid cases
5. surface all non-exact behavior in machine-readable validation metadata

The strict exporter is not required to preserve every Word visual detail exactly when LaTeX has no semantic equivalent. Those cases must be classified explicitly rather than hidden.

## Non-Goals

The strict exporter does not attempt to:

- preserve Word pagination or line breaking
- preserve every font face exactly
- preserve every visual run property when LaTeX has no semantic equivalent
- encode Document Server HTML layout hacks inside the LaTeX payload

## Pipeline

The strict export pipeline is defined as five logical stages:

1. Node resolution
   - resolve an OMML runtime node to a registered strict exporter

2. Semantic token emission
   - emit semantic tokens, not presentation-flattened strings

3. Expression normalization
   - split mixed content into semantic spans
   - canonicalize wrapper placement
   - remove style from ineligible tokens
   - normalize scripts, groups, delimiters, and operator sequences

4. LaTeX rendering
   - render normalized tokens into final LaTeX

5. Validation classification
   - record exactness, approximations, dropped properties, unsupported constructs, invalid constructs, and fallback causes

Only stage 4 may emit final string output.

## Coverage Model

Coverage is defined by OMML construct class, not by corpus frequency.

Primary math node kinds from `mathTypes.js`:

- `MATH_FRACTION`
- `MATH_DEGREE`
- `MATH_DEGREESubSup`
- `MATH_RADICAL`
- `MATH_NARY`
- `MATH_DELIMITER`
- `MATH_GROUP_CHARACTER`
- `MATH_FUNCTION`
- `MATH_ACCENT`
- `MATH_BORDER_BOX`
- `MATH_LIMIT`
- `MATH_MATRIX`
- `MATH_BOX`
- `MATH_EQ_ARRAY`
- `MATH_BAR`
- `MATH_PHANTOM`

Export status for each node kind must be explicitly one of:

- `exact`
- `normalized-equivalent`
- `approximated`
- `unsupported-structural`
- `invalid-source`

No node kind may silently degrade without validation metadata.

## Node Contract

Each registered exporter must satisfy this contract:

1. Input
   - accepts one resolved OMML runtime node and export context

2. Output
   - returns semantic token sequence only

3. Purity
   - output depends only on node semantics and explicit export settings

4. Validation
   - must record:
     - approximations
     - dropped properties
     - unsupported subtypes
     - invalid source structure

5. Fallback
   - may use fallback only for explicitly unsupported or invalid cases
   - fallback must record a concrete reason

## Symbol Policy

Symbols are classified into these categories:

- identifier
- number
- operator
- delimiter
- structural
- invisible
- raw-escaped literal
- unsupported-symbol

Rules:

1. ASCII letters map to identifier tokens.
2. ASCII digits map to number tokens.
3. Known LaTeX math symbols map to explicit LaTeX commands or raw structural output.
4. Invisible application/operator markers must not leak into final output.
5. Unsupported symbols must be recorded in validation as `unknownSymbols`.
6. Unsupported symbols must not be silently reclassified as exact output.

Portable symbol coverage must be extended by explicit mapping, not by corpus-special-case rewrites.

## Style Model

Word run styling and OMML math alphabet styling are separate inputs.

The exporter must treat style as semantic intent over eligible math atoms, not as a wrapper over arbitrary flat text.

### Style Sources

Supported style sources:

- OMML script/style (`scr`, `sty`, `nor`, `lit`)
- run style fallbacks (`RStyle`)
- font family approximation (`RFonts`)

### Style Eligibility

Style wrappers may apply only to semantic math atoms:

- identifiers
- numbers, if the construct semantically requires styled numerals
- standalone symbol commands representing styled math atoms

Style wrappers must not apply to:

- punctuation
- separators
- operators
- delimiters
- group boundaries
- layout markers
- structural commands like `\frac`, `\sqrt`, `\left`, `\right`

### Style Normalization Rules

The normalization stage must:

1. split mixed fragments such as:
   - `i,j`
   - `j+1`
   - `k=0`
   - `1-p`
   - `I|\bar n`

2. apply wrappers only to eligible spans

3. collapse redundant nested wrappers

4. preserve intended bold-italic math alphabet semantics

5. avoid styling operators as identifiers

## Operator and Delimiter Policy

Operators and delimiters are semantic tokens, not styled text fragments.

The exporter must distinguish:

- relation operators
- binary operators
- unary operators
- separators
- fences/delimiters
- alignment markers
- equation numbering markers

Examples:

- `|`
  - delimiter or relation, depending on structure
  - must not be wrapped as a styled identifier

- `,`
  - separator
  - must not be wrapped as a styled identifier

- `=`, `+`, `-`, `*`, `/`, `:`, `;`
  - operators/separators
  - must not be wrapped as styled identifier chunks

Delimiter layout must be modeled semantically through the node exporter and normalization layer, not inferred from flattened text.

## Script and Accent Policy

Subscript, superscript, pre-subscript, pre-superscript, and accent structures must be assembled before final wrapper canonicalization.

Rules:

1. script contents are normalized as expressions, not flat strings
2. accent commands apply to normalized child expressions
3. mixed styled content inside scripts must be split by semantic atom
4. invalid script structure must be classified explicitly

Special rule:

- `CDegreeSubSup.type:-1` is currently an unsupported subtype and must remain classified until a defined lowering is implemented

## Matrix and EqArray Policy

Matrices and equation arrays are structural layout constructs and must not be flattened into ad hoc text sequences.

Rules:

1. matrices lower to explicit LaTeX matrix/array forms
2. alignment points lower structurally, not as visible markers
3. hidden row/column placeholders must not leak as visible glyphs
4. equation numbering markers must never appear as visible `#`

Equation numbering:

- OMML equation numbering is layout, not text
- internal eqno markers must be lowered either:
  - to separate structural alignment output
  - or to explicit metadata outside the visible math expression

Visible `\#(1.2)` output is always incorrect for strict mode.

## Unsupported and Invalid Policy

Unsupported and invalid cases must be separated.

### Unsupported

Use when the OMML construct is valid but the strict exporter does not yet define a lowering.

Examples:

- unsupported node kind
- unsupported subtype
- unsupported symbol without mapping

### Invalid

Use when the source structure is malformed or semantically incoherent.

Examples:

- impossible script layout
- empty structural placeholder where required child content is missing
- malformed group character payload

Unsupported and invalid cases must never be hidden under generic fallback without reason metadata.

## Fidelity Model

The strict exporter must classify output using this ordered model:

1. `exact`
   - direct semantic match

2. `normalized-equivalent`
   - same semantics, different but portable LaTeX form

3. `approximated`
   - meaning preserved with reduced presentation fidelity

4. `configurable`
   - exactness depends on enabled packages or settings

5. `unsupported-structural`
   - valid OMML construct not yet supported in strict lowering

6. `unsupported-symbol`
   - symbol has no declared strict mapping

7. `invalid-source`
   - malformed or semantically invalid input

8. `legacy-fallback`
   - exporter returned fallback text path instead of strict lowering

Current runtime string values may remain backward-compatible, but internal validation should be rich enough to map to this model.

## Non-Exactness Classification

Non-exact output must be split into two categories:

1. inherently non-exact in portable LaTeX
2. currently non-exact because the exporter is incomplete

This distinction is mandatory for planning and for acceptance criteria.

### Inherently Non-Exact In Portable LaTeX

These cases cannot be represented exactly in standard portable LaTeX and must be classified as `approximated`, `configurable`, or `dropped`.

- exact `RFonts` family choice
- exact Word math font glyph design
- text color without optional package support
- highlight/background fill without optional package support
- text outline, gradient, and theme fill effects
- exact Word spacing metrics
- exact matrix row and column spacing
- exact delimiter stretch geometry
- exact accent geometry across Word fonts
- exact page and line breaking behavior
- exact equation-number page layout
- exact border box and visual decoration styling
- skewed fraction visual style
- linear fraction visual style
- phantom/layout-only spacing tricks used only for appearance

Current codebase examples likely in this bucket:

- `ParaRun.TextPr.RFonts`
- `ParaRun.TextPr.Color`
- `ParaRun.TextPr.Highlight`
- `ParaRun.TextPr.VertAlign`
- `CFraction.linear`
- `CFraction.skewed`
- parts of `CMathMatrix.mcJc`
- parts of `CNary.grow`
- parts of `CRadical.degHide`

### Currently Non-Exact Because The Exporter Is Incomplete

These cases are expected to move to `exact` or `normalized-equivalent` as OMML support is completed.

- mixed styled fragment splitting such as `i,j`, `j+1`, `k=0`, `I|\\bar n`
- styled punctuation and operator leakage
- redundant nested wrapper emission
- missing symbol mappings for portable LaTeX equivalents
- missing semantic mapping for supported OMML operators and delimiters
- `MATH_GROUP_CHARACTER` handling
- unsupported `CDegreeSubSup` subtypes
- eq-array and alignment lowering bugs
- visible eqno marker leakage as `#`
- placeholder glyph leakage such as `⬚`
- incomplete validation serialization in HTML metadata
- generic fallback identities that should resolve to supported node logic
- forbidden/internal alias leakage
- renderer invariant violations

Current codebase examples likely in this bucket:

- `kind:6`
- `kind:2`
- `CDegreeSubSup.type:-1`
- visible eqno `#`
- styled `|`, `,`, `=`, `+`, `-`
- placeholder `⬚`
- missing `unknownSymbols` HTML metadata
- missing `rendererViolations` HTML metadata

### Decision Rule

Use this rule when classifying a strict-export gap:

- if the issue is semantic structure, symbol mapping, normalization, or fallback metadata, it is implementation-incomplete
- if the issue is exact Word visual appearance or layout beyond standard LaTeX semantics, it is inherently non-exact

## Validation Metadata Contract

Validation must record all non-exact causes explicitly.

Current fields in `CreateLaTeXExportValidation()`:

- `unknownNodes`
- `unknownSymbols`
- `forbiddenAliases`
- `fallbacks`
- `rendererViolations`
- `implementedProperties`
- `requiredPackages`
- `droppedProperties`
- `approximatedProperties`

This set is normative.

### HTML Metadata Contract

When strict HTML metadata is emitted, the following must be present when applicable:

- `data-latex-strict`
- `data-latex-strict-fidelity`
- `data-latex-strict-packages`
- `data-latex-strict-implemented`
- `data-latex-strict-approximations`
- `data-latex-strict-dropped`
- `data-latex-strict-fallbacks`
- `data-latex-strict-unknown-nodes`
- `data-latex-strict-unknown-symbols`
- `data-latex-strict-forbidden-aliases`
- `data-latex-strict-renderer-violations`

Current implementation omits the last four fields. That is an observability gap and should be closed.

## Renderer Invariants

The renderer must enforce these invariants:

1. no forbidden ONLYOFFICE aliases in strict output
2. no visible internal layout markers
3. no duplicate adjacent style wrappers with identical meaning
4. no style wrappers around pure operator/separator spans
5. no placeholder glyphs in exact or normalized-equivalent output
6. output must be deterministic for identical normalized token streams

Violations must be recorded in `rendererViolations`.

## Conformance Strategy

Conformance must be proven primarily by spec fixtures, not by corpora.

Required test layers:

1. node-level fixtures
   - one fixture per OMML construct and subtype

2. normalization fixtures
   - mixed style/operator cases
   - scripts and accents
   - matrix and eqno cases

3. renderer invariant tests
   - no forbidden aliases
   - no visible placeholders
   - no styled punctuation leakage

4. corpus regression tests
   - secondary only
   - ensure changes improve or preserve behavior on real documents

## Immediate Work Items Derived From This Spec

1. serialize all validation causes into HTML metadata
2. classify placeholder glyph output as renderer violation or invalid source
3. implement or explicitly classify `MATH_GROUP_CHARACTER`
4. implement or explicitly classify unsupported `CDegreeSubSup` subtypes
5. expand symbol coverage for high-frequency unknown symbols such as:
   - `−`
   - selected spacing glyphs
   - documented special math characters
6. extend normalization from wrapper cleanup to mixed-fragment tokenization
7. define exact lowering rules for remaining eqno and aligned-array cases

## Change Control

Any exporter change that alters strict output must answer these questions:

1. Which spec rule is being implemented or changed?
2. Does the change affect:
   - semantics
   - normalization
   - fidelity classification
   - HTML metadata
3. Which conformance fixtures are added or updated?
4. Does the change reduce unsupported or invalid cases, or merely mask them?

If a change cannot be justified against this spec, it should not ship as a strict-export correctness fix.
