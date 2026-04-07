# Pure LaTeX Export Plan

## Goal

Build a full-fledged LaTeX exporter for the Word math model that is:

- structurally correct
- regression-safe
- independently testable
- rolled out behind a feature flag or explicit condition
- isolated from the current mixed "internal linear math + LaTeX" serializer

This plan treats pure LaTeX export as a new subsystem, not as a patch on top of the current string-based export path.

## Why A New Exporter Is Needed

The current export path is not a pure LaTeX exporter. It mixes:

- standard LaTeX commands
- internal ONLYOFFICE/OMML aliases
- late string concatenation heuristics
- serializer logic spread across multiple files

This creates three systemic problems:

1. Symbol namespace mixing
   Internal commands such as `\degc` and `\funcapply` can leak into output because export uses the same symbol tables as parsing and autocorrection.

2. Boundary loss
   Fragments are flattened into strings too early. The code then tries to repair invalid command boundaries with string heuristics.

3. Distributed policy
   Multiple call sites consult `SymbolsToLaTeX` directly, so export behavior is not centralized or formally validated.

Pure LaTeX export must replace these behaviors with typed serialization plus a strict export registry.

## Non-Goals

This project does not aim to:

- change math input parsing
- remove existing internal linear math aliases
- rewrite the current legacy exporter immediately
- force all current consumers to switch at once

Legacy export remains available until the strict exporter is proven and enabled.

## High-Level Design

The new exporter has five layers:

1. Entry point and feature flag
2. Export context
3. Symbol registry
4. Node exporter registry
5. Token renderer

The strict exporter should never depend on the current `SymbolsToLaTeX` table for policy. It may use legacy tables only during migration or compatibility validation.

## Proposed New Modules

Create new files under `word/Math/`:

- `LaTeXExportFlags.js`
- `LaTeXExportContext.js`
- `LaTeXExportTokens.js`
- `LaTeXExportRenderer.js`
- `LaTeXExportRegistry.js`
- `LaTeXExportSymbols.js`
- `LaTeXExportNodes.js`

Optional split if the file grows:

- `LaTeXExportNodesText.js`
- `LaTeXExportNodesOperators.js`
- `LaTeXExportNodesLayout.js`

These files are for strict export only. Do not overload `NamesOfLiterals.js` with all strict-export policy.

## Feature Flag Strategy

Strict export must be gated. Use one of these patterns:

- explicit option passed into the export API
- editor/runtime feature flag
- HTML export condition for the specific export surface

Recommended modes:

- `legacy`
  Return current output only.

- `strict_shadow`
  Compute strict output in parallel, collect diagnostics, return legacy output.

- `strict`
  Return strict output. Unknown or forbidden cases are handled according to fallback policy.

Recommended fallback policy during rollout:

- in `strict_shadow`: log and continue
- in `strict`: fallback to legacy only if configured as permissive
- final target: fail closed for forbidden internal output on strict-enabled surfaces

## Export Context

The strict exporter should carry an explicit context object instead of relying on ambient state.

The context should contain:

- `mode`
- `fallbackPolicy`
- `validation`
- `fontMode`
- `parentNodeKind`
- `mathInputType`
- `isDefaultText`
- `sourcePath`

The validation object should collect:

- unknown symbols
- unknown node types
- forbidden internal aliases
- fallback events
- renderer invariant violations

## Token Model

The new exporter must render from typed tokens, not raw strings.

Minimum token kinds:

- `command`
- `identifier`
- `number`
- `operator`
- `delimiter`
- `text`
- `space`
- `group_open`
- `group_close`
- `sub_open`
- `sup_open`
- `invisible`
- `raw`

Each token should carry at least:

- `kind`
- `value`
- `source`

Example:

```js
{ kind: "command", value: "\\alpha", source: "symbol:U+03B1" }
```

## Renderer Rules

The renderer is responsible for output normalization and command boundaries.

The renderer must be deterministic and table-driven. It must not inspect already-rendered strings to infer syntax.

### Boundary Matrix

Examples of required rules:

- `command -> identifier`: insert separator
- `command -> number`: insert separator
- `command -> group_open`: no separator
- `command -> operator`: no forced separator
- `identifier -> command`: no forced separator
- `number -> identifier`: no forced separator unless structural exporter inserts one
- `invisible -> any`: render nothing

This boundary matrix replaces ad hoc late logic in `MathTextAndStyles.prototype.GetText`.

### Renderer Invariants

Strict output must never:

- emit internal-only aliases
- emit invisible semantic markers literally
- emit `\command` immediately glued to ASCII letter/digit unless whitelisted
- produce unbalanced exported groups from a single node exporter

## Symbol Registry

Every atomic exported symbol must be classified by export semantics.

### Symbol Classes

- `latex_command`
  Example: `α -> \alpha`

- `literal`
  Example: `+`, `=`, `(`, `)`

- `escaped_literal`
  Example: `{`, `}`, `%`, `_`, `#`, `&`

- `structural_expansion`
  Example: `℃ -> {}^{\circ}\mathrm{C}`

- `invisible_semantic`
  Example: function application marker

- `forbidden_internal`
  Example: internal aliases that must never reach strict output as commands

- `unicode_passthrough`
  Use only if intentionally allowed by policy. Avoid for strict mode when a valid LaTeX form exists.

### Registry Contract

Every symbol entry should define:

- `class`
- `emit` or `value`
- `notes`
- `strictAllowed`

Example:

```js
"α": {
  class: "latex_command",
  value: "\\alpha",
  strictAllowed: true
}
```

## Node Exporter Registry

Every math node type must have a dedicated exporter in strict mode.

This is required for full-fledged support. Symbol classification alone is not enough.

### Initial Node Coverage

Leaf and text paths:

- `word/Math/mathText.js`
- `word/Editor/Run.js`

Core structures:

- `word/Math/fraction.js`
- `word/Math/radical.js`
- `word/Math/degree.js`
- `word/Math/limit.js`
- `word/Math/nary.js`
- `word/Math/accent.js`
- `word/Math/operators.js`
- `word/Math/matrix.js`
- `word/Math/borderBox.js`
- `word/Math/mathContent.js`
- `word/Editor/Math.js`

### Node Exporter Contract

Each exporter:

- accepts `(node, context)`
- returns a token array
- never returns raw final strings
- may recursively call child exporters
- must declare fallback behavior for unsupported subcases

Example:

```js
function exportFraction(node, context) {
  return [
    cmd("\\frac"),
    group(exportNode(node.getNumerator(), context)),
    group(exportNode(node.getDenominator(), context))
  ];
}
```

## Seven-Step Implementation Sequence

## 1. Add A Strict Export Entry Point Behind A Flag

### Objective

Create a top-level switch that allows strict export to exist without changing current behavior.

### Work

- add strict export mode constants
- add a new entry point in `word/Editor/Math.js`
- keep existing `GetText(true)` behavior intact
- route strict export through a new explicit code path

### Candidate API Shapes

Internal-only first:

- `GetTextStrictLaTeX()`

Or option-driven:

- `GetText({ format: "latex", strict: true })`

If public API risk is high, use an internal helper and keep the external signature stable.

### Regression Safety

- no behavior change when flag is off
- new code path must be dead code unless explicitly enabled

### Done Criteria

- strict export entry point exists
- feature flag is wired
- legacy output unchanged when strict mode is disabled

## 2. Add A Dedicated Token Model And Renderer

### Objective

Remove late string heuristics from strict export.

### Work

- create typed token definitions
- implement a central renderer
- encode boundary rules in one place
- unit test the boundary matrix directly

### Regression Safety

- renderer is used only by strict mode
- legacy `MathTextAndStyles` path remains unchanged

### Done Criteria

- renderer can render hand-built token streams
- boundary tests pass
- no strict path uses late string glue rules

## 3. Add Separate Symbol And Node Registries

### Objective

Formalize export completeness and remove mixed namespace dependence.

### Work

- create strict symbol registry
- create strict node exporter registry
- classify all known strict-export symbols
- create registry helpers for lookup and validation

### Regression Safety

- do not remove or modify legacy parser/autocorrect tables
- strict mode must not write into shared symbol tables

### Done Criteria

- symbol lookup is centralized
- node exporter lookup is centralized
- unknown lookup is observable and testable

## 4. Port Leaf Serialization First

### Objective

Get strict export working at the leaves before porting full structure.

### Work

Port and isolate:

- `word/Math/mathText.js`
- `word/Editor/Run.js`
- leaf/operator symbol emission in `word/Math/operators.js`

These are the current hotspots where direct `SymbolsToLaTeX` lookups happen.

### Regression Safety

- strict mode only
- legacy paths untouched

### Done Criteria

- strict leaf serialization no longer depends on `SymbolsToLaTeX`
- forbidden internal aliases cannot leak from leaf exporters

## 5. Port Structured Math Nodes

### Objective

Cover the core math structures that define most exported formulas.

### Work

Port exporters for:

- fractions
- radicals
- superscript/subscript
- functions and limits
- n-ary operators
- delimiters
- accents and bars

### Regression Safety

- use exact structural output for direct LaTeX forms
- where no exact LaTeX primitive exists, define a lowering strategy in the node exporter

### Done Criteria

- core structure exporters exist
- strict export can serialize representative equations end to end

## 6. Add Invariant, Inventory, And Boundary-Rule Tests

### Objective

Make correctness rule-driven instead of example-driven.

### Test Categories

#### Boundary Matrix Tests

Unit test the renderer for token-kind transitions.

#### Symbol Registry Tests

Every exported symbol class is verified.

#### Node Exporter Tests

Each major node type gets focused serialization tests.

#### Inventory Tests

Fail if:

- a reachable symbol is unclassified
- a reachable node type has no exporter

#### Strict Output Invariants

Fail if strict output contains:

- forbidden internal aliases
- literal invisible semantic markers
- glued command-letter sequences unless explicitly allowed

### Existing Test Locations

Likely extensions:

- `sdkjs/tests/word/math-autocorrection/math-autocorrection.js`

Preferred addition:

- a dedicated strict-export suite under `sdkjs/tests/word/`

### Done Criteria

- strict mode has dedicated tests
- inventory failures are actionable
- invariants are enforced in CI or local test flow

## 7. Run Strict Mode In Shadow/Fallback Mode Before Enabling It

### Objective

Roll out without destabilizing existing export consumers.

### Work

- add `strict_shadow` mode
- run legacy and strict export in parallel on representative corpora
- record differences and classify them
- distinguish expected cleanup from real regressions

### Difference Categories

- internal alias removal
- separator insertion
- structural normalization
- unsupported node fallback
- unexpected divergence

### Enablement Strategy

Recommended order:

1. shadow mode for equation HTML export
2. strict mode for the same surface with permissive fallback
3. strict mode with fail-closed policy once unknown cases are eliminated

### Done Criteria

- shadow runs produce stable diagnostics
- unexpected differences are resolved
- target export surface can switch to strict mode safely

## File Ownership Map

### New Strict Export Infrastructure

- `word/Math/LaTeXExportFlags.js`
- `word/Math/LaTeXExportContext.js`
- `word/Math/LaTeXExportTokens.js`
- `word/Math/LaTeXExportRenderer.js`
- `word/Math/LaTeXExportRegistry.js`
- `word/Math/LaTeXExportSymbols.js`
- `word/Math/LaTeXExportNodes.js`

### Entry Point Integration

- `word/Editor/Math.js`
- `common/wordcopypaste.js`

### Existing Files To Port Gradually

- `word/Math/mathText.js`
- `word/Editor/Run.js`
- `word/Math/operators.js`
- `word/Math/fraction.js`
- `word/Math/radical.js`
- `word/Math/degree.js`
- `word/Math/limit.js`
- `word/Math/nary.js`
- `word/Math/accent.js`
- `word/Math/matrix.js`
- `word/Math/borderBox.js`
- `word/Math/mathContent.js`

### Legacy Files To Avoid Mutating For Policy

- `word/Math/NamesOfLiterals.js`

Use it for migration knowledge only. Do not keep adding strict-export policy to the mixed literal tables.

## Migration Principles

1. Strict export must be additive first, not replacement-first.
2. Policy must be centralized.
3. Unknown cases must be observable.
4. Internal aliases must never silently ship in strict output.
5. Leaf conversion is not enough; node coverage is required for full-fledged support.
6. Validation must be rule-based, not driven by ad hoc examples.

## Open Design Decisions

These should be settled before wide rollout:

- whether strict mode allows any Unicode passthrough
- exact fallback policy when strict export encounters an unknown node
- final public API shape for strict export
- logging/reporting channel for shadow mode diagnostics
- whether strict export should be available only for HTML export first or for all math export surfaces

## Immediate Next Steps

1. Implement step 1 only:
   add strict entry point and feature flag with no behavior change.

2. Implement step 2:
   add token and renderer modules with standalone tests.

3. Implement step 3:
   create symbol and node registry scaffolding and wire validation.

Only after those three are in place should leaf serialization be ported.
