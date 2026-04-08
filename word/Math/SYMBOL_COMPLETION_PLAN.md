# Symbol Completion Plan

## Purpose

This document is the engineering execution plan for strict symbol completion.

It is driven by:

- [`DOCX_SYMBOL_POLICY_SPEC.md`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/word/Math/DOCX_SYMBOL_POLICY_SPEC.md)
- [`SYMBOL_COVERAGE_MATRIX.md`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/word/Math/SYMBOL_COVERAGE_MATRIX.md)
- [`STRICT_LATEX_EXPORT_SPEC.md`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/word/Math/STRICT_LATEX_EXPORT_SPEC.md)

The plan is explicitly spec-driven:

- Unicode and role policy first
- deterministic mapping / classification second
- corpus only as regression verification, never as the source of correctness

## Goal

Reach a state where:

1. every row in [`SYMBOL_COVERAGE_MATRIX.md`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/word/Math/SYMBOL_COVERAGE_MATRIX.md) has a final status
2. placeholder symbols are treated as `invalid`, not `unknown`
3. context-sensitive symbols have explicit rules
4. strict symbol metadata is complete and observable
5. symbol behavior is test-covered

## Rules

1. No new symbol mapping without a documented class and status.
2. No global normalization for context-sensitive symbols.
3. No placeholder glyph may remain a normal symbol fallback.
4. No code change is accepted without tests.
5. Symbol work must not regress existing OMML behavior.

## Phase Structure

### Phase S0: Harness Lock

#### Goal

Lock the symbol test surface and control docs.

#### Work

- keep [`SYMBOL_COVERAGE_MATRIX.md`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/word/Math/SYMBOL_COVERAGE_MATRIX.md) current
- extend:
  - [`latex-export.js`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/tests/word/latex-export/latex-export.js)
  - [`scaffold_smoke_test.js`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/tools/latex-export/scaffold_smoke_test.js)

#### Exit Criteria

- matrix exists
- plan exists
- current symbol behaviors are represented in tests

### Phase S1: Invalid Placeholder Policy

#### Goal

Move leaked placeholders and sentinel-like artifacts out of `unknownSymbols`.

#### Scope

- `⬚`
- any explicit placeholder / object-replacement markers adopted by policy

#### Policy

- classify as `invalid`
- surface as `rendererViolation` or `invalidSource`
- do not emit as if they were legitimate math symbols

#### Likely Files

- [`LaTeXExportSymbols.js`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/word/Math/LaTeXExportSymbols.js)
- [`LaTeXExportContext.js`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/word/Math/LaTeXExportContext.js)
- [`wordcopypaste.js`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/common/wordcopypaste.js) if metadata exposure changes

#### Exit Criteria

- placeholders no longer land in `unknownSymbols`

### Phase S2: Exact Relation and Operator Mappings

#### Goal

Add direct mappings for legitimate portable operators and relations.

#### Scope

- `⇌`
- `≔`
- additional exact operator / relation symbols missing from the current registry

#### Policy

- prefer exact LaTeX when portable
- normalize only when the strict spec allows it

#### Exit Criteria

- these symbols stop appearing as `unknownSymbols`

### Phase S3: Context-Sensitive Identifier and Punctuation Policy

#### Goal

Handle symbols that cannot be mapped correctly without role-sensitive rules.

#### Scope

- `µ`
- `ℎ`
- `’`
- `ǀ`

#### Policy

- no blind global mappings
- require explicit role/context rules
- default to `unsupported` if semantics cannot be recovered safely

#### Exit Criteria

- each symbol class has a documented policy and tests

### Phase S4: Combining and Precomposed Accent Policy

#### Goal

Resolve combining-mark and precomposed-accent behavior.

#### Scope

- `̄`
- `ẋ`
- similar combining / precomposed symbols

#### Policy

- normalize only when structure/context makes the accent semantics explicit
- otherwise classify explicitly

#### Exit Criteria

- no uncontrolled fallback for these classes

### Phase S5: Unknown Symbol Closure

#### Goal

Shrink `unknownSymbols` to a deliberate, explainable remainder.

#### Scope

- audit all remaining `unknownSymbols`
- classify each as:
  - exact
  - normalized
  - unsupported
  - invalid

#### Exit Criteria

- remaining `unknownSymbols` are intentional and documented

## Test Strategy

For each batch:

1. direct symbol unit tests
2. smoke-harness assertions
3. metadata assertions if classification changes

Core files:

- [`latex-export.js`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/tests/word/latex-export/latex-export.js)
- [`scaffold_smoke_test.js`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/tools/latex-export/scaffold_smoke_test.js)

## Recommended Implementation Order

1. placeholder invalidation
2. exact operator/relation mappings
3. context-sensitive symbols
4. combining/precomposed accent rules
5. final unknown-symbol closure

## Definition of Done

Symbol completion is done only when:

1. every row in the matrix has a final status
2. no placeholder glyph is treated as a normal symbol
3. context-sensitive classes have explicit policy
4. tests pass
5. remaining symbol unknowns are explicit unsupported cases, not accidental gaps
