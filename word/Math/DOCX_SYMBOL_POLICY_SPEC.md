# DOCX Symbol Policy Specification

## Purpose

This document defines how symbols in Word math content must be interpreted and exported for HTML-oriented math conversion.

The goal is to eliminate ad hoc symbol handling and replace it with a deterministic policy based on:

1. OMML structure for semantic role
2. Unicode code points for symbol identity
3. strict export policy for target LaTeX output

This spec is intended to prevent regression and reduce corpus-driven guesswork.

## Golden Source Hierarchy

Symbol handling must follow this hierarchy:

1. **OMML structure**
- authoritative for expression structure
- determines whether content is a fraction, delimiter, script, n-ary operator, group character, matrix cell, etc.

2. **Unicode identity**
- authoritative for leaf symbol identity
- determines the exact input character and prevents accidental conflation of visually similar glyphs

3. **Strict export policy**
- authoritative for output form
- determines whether export is:
  - exact
  - normalized
  - approximated
  - unsupported
  - invalid

## Non-Golden Inputs

The following must not be treated as authoritative:

- current HTML output
- legacy LaTeX output
- corpus frequency
- visual resemblance alone
- Word rendering alone

These may be used for debugging or prioritization, but not as the semantic source of truth.

## Symbol Classification Model

Every leaf symbol must be classified into exactly one primary class.

### 1. Identifier-like

Examples:

- Latin letters
- Greek letters
- mathematical alphanumeric symbols

Typical export:

- `x`
- `\alpha`
- `\mu`

### 2. Binary operator

Examples:

- `+`
- `−`
- `·`
- `×`

Typical export:

- `+`
- `-`
- `\cdot`
- `\times`

### 3. Relation

Examples:

- `=`
- `≔`
- `⇌`
- `≤`

Typical export:

- `=`
- normalized relation command or portable substitute

### 4. Delimiter

Examples:

- `(`
- `)`
- `（`
- `）`
- `|`

Typical export:

- canonical delimiter tokens

### 5. Accent / modifier

Examples:

- combining macron
- combining dot
- combining tilde

These must not be treated as standalone printable symbols unless structure/context requires that.

### 6. Punctuation-like math mark

Examples:

- prime-like marks
- commas
- colons
- semicolons

These require contextual interpretation.

### 7. Unit / text-like symbol

Examples:

- `µ` when used as micro-unit prefix in prose-like math text
- `Å`

These may require normalization into math-safe text or semantic symbol form.

### 8. Placeholder / invalid marker

Examples:

- `⬚`
- leaked sentinels
- object-replacement artifacts

These must never be treated as valid symbols.

## Output Classification

Each symbol handling result must be classified as one of:

### `exact`

The symbol has a direct portable LaTeX equivalent with the same intended semantics.

Examples:

- `·` -> `\cdot`
- `⇌` -> exact relation command if available in strict policy

### `normalized`

The output differs from the input glyph but preserves semantics.

Examples:

- `−` -> `-`
- `µ` -> `\mu` when the source semantically means Greek mu
- fullwidth parentheses -> standard parentheses

### `approximated`

The output is close, but not strictly identical in semantics or presentation.

This should be rare for symbols, and more common for layout/presentation details.

### `unsupported`

The symbol is legitimate input, but no approved strict mapping exists yet.

This must produce explicit `unknownSymbols` metadata.

### `invalid`

The symbol is not valid semantic math content for strict export.

Examples:

- placeholders
- leaked sentinels
- malformed structure artifacts

This should be classified as:

- `rendererViolation`
- or `invalidSource`

not merely `unknownSymbols`.

## Core Policy Rules

## Rule 1: Structure beats appearance

If OMML gives an explicit structural role, that role controls export.

Examples:

- a delimiter node containing `|` is not automatically the same as a relation-style vertical bar
- a group character node is not a normal standalone symbol token

## Rule 2: Unicode identity beats visual similarity

Visually similar glyphs must not be conflated without an explicit normalization rule.

Examples:

- `µ` is not identical to `μ`
- `’` is not identical to `′`
- `（` is not identical to `(`

## Rule 3: Normalization must be explicit

If a symbol is normalized, the rule must be deliberate and documented.

Examples:

- `−` -> `-`
- `·` -> `\cdot`
- `（` -> `(`

## Rule 4: Placeholders are never valid output

Placeholder glyphs must be treated as invalid-source or renderer-violation signals.

Example:

- `⬚` is not a symbol-mapping problem
- it indicates missing semantic content or leaked placeholder state

## Rule 5: Context-sensitive punctuation must be handled by role

Symbols like apostrophes, primes, bars, colons, and commas require contextual treatment.

Examples:

- `’` in `A’` may mean prime, but must not be auto-normalized to `\prime` without policy
- `:` may be punctuation, ratio, or mapping separator depending on context

## Rule 6: Unknown symbols must remain observable

If a symbol is not handled, strict output must include explicit metadata:

- `data-latex-strict-unknown-symbols`

No unknown symbol should disappear silently.

## Initial Normalization Rules

The following are approved normalization rules.

### Safe normalizations

- `−` -> `-`
- `–` -> `-`
- `（` -> `(`
- `）` -> `)`
- `·` -> `\cdot`

### Candidate semantic normalizations

These require class-based handling, not blind text replacement:

- `µ` -> `\mu` when symbol semantics are Greek mu
- `ℎ` -> normalized math italic `h` or explicit unsupported-symbol classification
- `’` -> prime handling only in approved math contexts
- `⇌` -> mapped relation command if part of approved symbol table
- `≔` -> mapped relation command or normalized assignment relation

## Invalid / Violation Rules

The following must not remain in strict output as unresolved symbols:

- `⬚`
- BOM leakage in content positions
- leaked control or sentinel markers

These must be classified as:

- `rendererViolation`
- `invalidSource`

not just `unknownSymbols`

## Symbol Table Requirements

The implementation must maintain a symbol table with:

- code point
- Unicode name
- class
- output form
- classification
- package requirement, if any
- notes

Each entry must be reproducible from spec, not corpus accident.

## Regression Invariants

The following invariants must hold:

1. No valid strict output may contain placeholder glyphs.
2. No normalization may silently erase symbol meaning.
3. No unknown symbol may be hidden from metadata.
4. No visually similar glyphs may be merged without explicit rule coverage.
5. New symbol mappings must include unit tests and smoke tests.

## Testing Requirements

Every new symbol rule must include:

1. unit test for symbol mapping
2. smoke test in the strict export scaffold
3. metadata test if fallback or invalid classification changes

Where context-sensitive handling exists, tests must include:

- positive case
- non-conversion case
- invalid case if applicable

## Corpus Policy

Corpus data is secondary.

It may be used to:

- prioritize missing symbol classes
- verify regression improvements
- identify real-world coverage gaps

It must not define the meaning of symbols.

## Immediate Priority Classes

The highest-priority unresolved classes are:

1. placeholder leakage
- `⬚`

2. normalized operator symbols
- `·`
- `⇌`
- `≔`

3. identifier normalization
- `µ`
- `ℎ`

4. punctuation or prime ambiguity
- `’`

5. fullwidth punctuation
- `（`
- `）`

## Best Rule

OMML defines the structure.
Unicode defines the symbol.
The strict export spec defines the output.

Anything else is debugging context, not truth.
