# OMML Completion Plan

## Purpose

This document is the engineering execution plan for full OMML strict-export completion.

It is driven by:

- [`OMML_COVERAGE_MATRIX.md`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/word/Math/OMML_COVERAGE_MATRIX.md)
- [`STRICT_LATEX_EXPORT_SPEC.md`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/word/Math/STRICT_LATEX_EXPORT_SPEC.md)
- [`DOCX_SYMBOL_POLICY_SPEC.md`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/word/Math/DOCX_SYMBOL_POLICY_SPEC.md)

The plan is explicitly spec-driven:

- schema coverage first
- deterministic lowering/classification second
- corpus only as regression verification, never as the source of correctness

## Goal

Reach a state where:

1. every schema row in [`OMML_COVERAGE_MATRIX.md`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/word/Math/OMML_COVERAGE_MATRIX.md) has a final status
2. no valid OMML construct reaches generic fallback
3. every non-exact behavior is explicitly classified
4. validation metadata is complete
5. test coverage exists for every implemented or classified row

## Non-Goals

This plan does not attempt to:

- make Word pagination match HTML
- preserve every Word visual detail exactly when no portable LaTeX equivalent exists
- solve OLE / MathType / AxType in the OMML phase

## Rules

1. No schema row is implemented without an explicit policy.
2. No code change is accepted without tests.
3. No valid OMML construct may remain generic fallback by the end of the program.
4. No regression-prone visual/layout guesswork is introduced without classification.
5. Each phase must leave the repo in a testable state.

## Phase Structure

### Phase 0: Baseline and Harness Lock

#### Goal

Lock the control artifacts and test harness so future changes are measurable.

#### Work

- keep [`OMML_COVERAGE_MATRIX.md`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/word/Math/OMML_COVERAGE_MATRIX.md) current
- add a conformance-oriented test file:
  - `sdkjs/tests/word/latex-export/omml-conformance.js`
- ensure smoke coverage mirrors high-risk behaviors:
  - [`scaffold_smoke_test.js`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/tools/latex-export/scaffold_smoke_test.js)

#### Files

- [`OMML_COVERAGE_MATRIX.md`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/word/Math/OMML_COVERAGE_MATRIX.md)
- [`OMML_COMPLETION_PLAN.md`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/word/Math/OMML_COMPLETION_PLAN.md)
- [`latex-export.js`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/tests/word/latex-export/latex-export.js)
- [`scaffold_smoke_test.js`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/tools/latex-export/scaffold_smoke_test.js)

#### Exit Criteria

- matrix is complete enough to drive implementation
- conformance harness entry exists

### Phase 1: Display-Math Paragraph and Global Math Settings

#### Goal

Close the schema rows around `CT_OMathParaPr` and `CT_MathPr`.

#### Scope

- `CT_OMathParaPr.jc`
- `CT_MathPr.defJc`
- `CT_MathPr.dispDef`
- `CT_MathPr.smallFrac`
- `CT_MathPr.intLim`
- `CT_MathPr.naryLim`
- `CT_MathPr.mathFont`
- `CT_MathPr.brkBin`
- `CT_MathPr.brkBinSub`
- `CT_MathPr.lMargin`
- `CT_MathPr.rMargin`
- `CT_MathPr.preSp`
- `CT_MathPr.postSp`
- `CT_MathPr.interSp`
- `CT_MathPr.intraSp`
- `CT_MathPr.wrapIndent`
- `CT_MathPr.wrapRight`

#### Policy

- lower when there is a stable portable analogue
- otherwise classify as approximated or dropped
- never silently ignore

#### Likely Files

- [`LaTeXExportNodes.js`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/word/Math/LaTeXExportNodes.js)
- [`LaTeXExportContext.js`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/word/Math/LaTeXExportContext.js)
- [`Math.js`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/word/Editor/Math.js)
- [`math-settings.js`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/word/Math/math-settings.js)
- [`wordcopypaste.js`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/common/wordcopypaste.js) if metadata exposure changes

#### Tests

- display alignment fixtures
- math settings classification fixtures
- HTML metadata assertions for newly surfaced properties

#### Exit Criteria

- no `CT_OMathParaPr` / `CT_MathPr` row remains `not-started`

### Phase 2: Delimiter, EqArray, Matrix Property Completion

#### Goal

Complete the remaining property-level behavior/classification for layout-bearing constructs.

#### Scope

- `CT_DPr.grow`
- `CT_DPr.shp`
- `CT_EqArrPr.rSpRule`
- `CT_EqArrPr.rSp`
- `CT_MPr.rSpRule`
- `CT_MPr.cGpRule`
- any remaining matrix/eq-array spacing and alignment rows still open

#### Policy

- exact lowering where semantic and stable
- otherwise approximated with explicit validation

#### Likely Files

- [`LaTeXExportNodes.js`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/word/Math/LaTeXExportNodes.js)
- [`matrix.js`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/word/Math/matrix.js)
- [`operators.js`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/word/Math/operators.js)

#### Tests

- delimiter property fixtures
- matrix/eq-array property fixtures
- spacing heuristic regression checks

#### Exit Criteria

- no delimiter/matrix/eq-array property row remains `not-started`

### Phase 3: Node Control Properties and Wrapper Policy

#### Goal

Resolve `ctrlPr` and equivalent node-level control-property rows consistently.

#### Scope

- `ctrlPr` rows for:
  - accents
  - bars
  - boxes
  - border boxes
  - delimiters
  - functions
  - group characters
  - limits
  - matrices
  - n-ary
  - radicals
  - scripts

#### Policy

- define whether `ctrlPr` is:
  - semantically relevant for export
  - represented through inherited run styling
  - explicitly dropped
  - explicitly approximated

#### Likely Files

- [`LaTeXExportNodes.js`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/word/Math/LaTeXExportNodes.js)
- [`LaTeXExportRenderer.js`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/word/Math/LaTeXExportRenderer.js)
- [`LaTeXExportSymbols.js`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/word/Math/LaTeXExportSymbols.js)

#### Tests

- wrapper inheritance tests
- explicit `ctrlPr` classification tests

#### Exit Criteria

- every `ctrlPr` row has an explicit final status

### Phase 4: Embedded Word Content Inside Math

#### Goal

Handle the schema-allowed `w:EG_PContentMath` spillover inside OMML.

#### Scope

- `hyperlink`
- `fldSimple`
- `customXml`
- `smartTag`
- `sdt`
- run-level wrappers and markup permitted through `w:EG_PContentMath`

#### Policy

- unwrap safely when semantically transparent
- preserve text/math content when possible
- classify unsupported wrappers explicitly when not safely representable
- remove reliance on generic fallback for valid OMML wrappers

#### Likely Files

- [`LaTeXExportRegistry.js`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/word/Math/LaTeXExportRegistry.js)
- [`LaTeXExportNodes.js`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/word/Math/LaTeXExportNodes.js)
- possibly editor/runtime bridge files if these wrappers resolve to non-math runtime nodes

#### Tests

- wrapper pass-through fixtures
- content-control-in-math fixtures
- hyperlink-in-math fixtures
- explicit unsupported-wrapper metadata tests

#### Exit Criteria

- no `w:EG_PContentMath` row remains `not-started`

### Phase 5: Fallback Elimination and Validation Completion

#### Goal

Remove generic fallback from all valid OMML paths and ensure full metadata visibility.

#### Scope

- remove generic fallback from valid OMML
- ensure fallback only for:
  - unsupported-nonportable
  - invalid-source
- ensure all validation buckets are serialized when relevant:
  - `unknownNodes`
  - `unknownSymbols`
  - `forbiddenAliases`
  - `fallbacks`
  - `rendererViolations`
  - implemented/approximated/dropped properties

#### Likely Files

- [`LaTeXExportRegistry.js`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/word/Math/LaTeXExportRegistry.js)
- [`LaTeXExportContext.js`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/word/Math/LaTeXExportContext.js)
- [`wordcopypaste.js`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/common/wordcopypaste.js)

#### Tests

- metadata completeness tests
- invalid-source vs unsupported tests
- fallback-cause visibility tests

#### Exit Criteria

- no valid OMML path uses generic fallback
- metadata contract is complete

### Phase 6: Conformance Closure

#### Goal

Prove the matrix is closed and stable.

#### Work

- finish `omml-conformance.js`
- map every matrix row to a test
- rerun smoke and HTML metadata tests
- run remote corpus only as regression confirmation

#### Exit Criteria

- every matrix row has:
  - final status
  - test coverage reference
- completion criteria from [`OMML_COVERAGE_MATRIX.md`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/word/Math/OMML_COVERAGE_MATRIX.md) are met

## Regression Gates

Each phase must satisfy all of these before commit:

1. `node --check` passes for modified JS files
2. [`scaffold_smoke_test.js`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/tools/latex-export/scaffold_smoke_test.js) passes
3. affected unit test files are updated
4. no existing strict-export test regresses
5. no generic fallback is introduced for a previously handled valid OMML case

## Execution Strategy

Implement strictly in this order:

1. classification first
2. exact lowering where safe
3. approximation policy where necessary
4. unsupported/invalid separation where exact lowering is impossible

Do not:

- patch based on one corpus example
- add silent normalizations without metadata
- widen behavior without tests

## Definition of Done

The OMML program is done when:

1. every row in [`OMML_COVERAGE_MATRIX.md`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/word/Math/OMML_COVERAGE_MATRIX.md) has a final status
2. every non-finalizable row is explicitly marked as unsupported-nonportable or invalid-source
3. valid OMML never reaches generic fallback
4. validation metadata is complete and serialized
5. conformance, unit, and smoke coverage all pass
