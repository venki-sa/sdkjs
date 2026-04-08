# Symbol Coverage Matrix

## Purpose

This document is the execution matrix for strict symbol coverage in Word math export.

It complements:

- [`DOCX_SYMBOL_POLICY_SPEC.md`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/word/Math/DOCX_SYMBOL_POLICY_SPEC.md)
- [`STRICT_LATEX_EXPORT_SPEC.md`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/word/Math/STRICT_LATEX_EXPORT_SPEC.md)

Golden-source hierarchy:

1. OMML structure for role
2. Unicode code point identity
3. strict export policy for output class

Status vocabulary:

- `exact`
- `normalized`
- `approximated`
- `classified-only`
- `unsupported`
- `invalid`
- `not-started`

## Current Exporter Shape

Current implementation lives in:

- [`LaTeXExportSymbols.js`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/word/Math/LaTeXExportSymbols.js)

Current behavior classes:

- direct explicit-symbol overrides
- direct `SymbolsToLaTeX` registry lookup
- ASCII identifier / number fallback
- raw punctuation pass-through
- `unknownSymbols` metadata for everything else

This is workable, but still too flat for full symbol conformance.

## Class Matrix

### Structural and Invisible Symbols

| Symbol / class | Current status | Notes |
| --- | --- | --- |
| `℃` | `normalized` | Exported structurally as `{}^{\circ}\mathrm{C}` |
| `⁡` | `exact` | Exported as invisible |
| placeholder / sentinel glyphs | `invalid` | `⬚` and object-replacement `U+FFFC` become renderer violations, not `unknownSymbols` |

### Spacing and Delimiter Normalization

| Symbol | Current status | Notes |
| --- | --- | --- |
| space | `normalized` | `\ ` |
| tab | `normalized` | `\ ` |
| no-break space `U+00A0` | `normalized` | `\ ` |
| em quad `U+2001` | `normalized` | `\quad ` |
| punctuation space `U+2008` | `normalized` | `\ ` |
| thin space `U+2009` | `normalized` | `\,` |
| fullwidth left paren `（` | `normalized` | `(` |
| fullwidth right paren `）` | `normalized` | `)` |

### ASCII Math Punctuation

| Symbol class | Current status | Notes |
| --- | --- | --- |
| `+ - = * / ( ) , . ; : < > [ ] | ! @ ~ ? ' "` | `normalized` | Raw pass-through today; role-sensitive policy still incomplete for punctuation-like marks |
| `{ } # % & _` | `exact` | Escaped explicitly |

### Operator Normalization

| Symbol | Current status | Notes |
| --- | --- | --- |
| middle dot `·` | `exact` | `\cdot` |
| minus sign `−` | `normalized` | `-` |
| en dash `–` | `normalized` | `-` |

### Identifier-like Symbols

| Symbol class | Current status | Notes |
| --- | --- | --- |
| ASCII letters | `exact` | identifier token |
| ASCII digits | `exact` | number token |
| mapped Greek / math symbols through `SymbolsToLaTeX` | `partial` | exactness depends on registry content |
| mathematical alphanumeric symbols | `not-started` | needs explicit policy beyond incidental registry coverage |

### Context-Sensitive Symbols

| Symbol | Current status | Notes |
| --- | --- | --- |
| micro sign `µ` | `normalized` | exported as `\mu` |
| Planck-style h `ℎ` | `normalized` | exported as identifier `h` |
| right single quote `’` | `not-started` | prime vs apostrophe must be context-sensitive |
| vertical line variants like `ǀ` | `not-started` | delimiter vs relation vs punctuation role |
| assignment `≔` | `normalized` | exported as `:=` |
| reversible arrow `⇌` | `not-started` | needs relation mapping policy |
| vulgar fraction `½` | `normalized` | exported structurally as `\frac{1}{2}` |
| accented precomposed symbols like `ẋ` | `not-started` | decompose or classify |
| combining marks like `̄` | `not-started` | accent semantics must be structural/contextual |

### Invalid / Unsupported Symbols

| Symbol class | Current status | Notes |
| --- | --- | --- |
| leaked placeholder glyphs like `⬚` | `invalid` | exported as empty and recorded as `rendererViolations` |
| forbidden legacy aliases like `\degc` | `implemented` | surfaced through `forbiddenAliases` |
| unmapped Unicode symbol | `unsupported` | currently lands in `unknownSymbols` |

## Required Policy Splits

The remaining symbol work should be split into these enforcement buckets:

1. **Exact direct mappings**
- stable Unicode -> LaTeX command or raw symbol

2. **Normalization mappings**
- glyph changes that preserve semantics

3. **Context-sensitive mappings**
- require role or neighboring-token context

4. **Invalid-source classification**
- placeholders, leaked sentinels, malformed artifacts

5. **Unsupported-but-legitimate symbols**
- explicit `unknownSymbols` until mapped

## Immediate Open Sets

### Set A: Placeholder and invalid markers

- `⬚`
- object-replacement or leaked placeholder artifacts

Target:

- move from `unknownSymbols` to `invalid`

### Set B: Portable operator and relation mappings

- `⇌`
- `≔`
- additional registry-backed relation symbols

Target:

- direct exact or normalized mappings

### Set C: Context-sensitive identifier and punctuation policy

- `µ`
- `ℎ`
- `’`
- `ǀ`

Target:

- explicit symbol-role rules, not blind global mappings

### Set D: Combining and precomposed accent handling

- `̄`
- `ẋ`

Target:

- normalize only when role/context is explicit

## Completion Criteria

We can claim strict symbol completion only when:

1. every row in this matrix has a final status other than `not-started`
2. placeholder / sentinel symbols are classified as `invalid`, not `unknown`
3. context-sensitive symbols have documented rules
4. symbol fixes are backed by unit tests and smoke coverage
5. remaining `unknownSymbols` correspond only to explicitly unsupported symbols
