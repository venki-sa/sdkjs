# OMML Coverage Matrix

## Purpose

This document is the execution matrix for full OMML strict-export completion.

Golden-source hierarchy:

1. OMML schema and structure
2. Unicode symbol identity
3. strict export spec and portability policy

Primary schema source:

- [`shared-math.xsd`](/Users/venki/ClaudeCode/onlyoffice/DocumentServer/core/Test/Applications/DocxFormatCodeGen/codegen/Resource/shared-math.xsd)

Related specs:

- [`STRICT_LATEX_EXPORT_SPEC.md`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/word/Math/STRICT_LATEX_EXPORT_SPEC.md)
- [`DOCX_SYMBOL_POLICY_SPEC.md`](/Users/venki/ClaudeCode/onlyoffice/sdkjs/word/Math/DOCX_SYMBOL_POLICY_SPEC.md)

Status vocabulary:

- `exact`
- `normalized`
- `approximated`
- `classified-only`
- `unsupported`
- `not-started`

The target state is:

- no valid OMML construct falls into generic fallback
- every schema property is either lowered or explicitly classified
- every non-exact behavior is observable in validation metadata

## Top-Level Elements

| OMML element | Schema type | Runtime/exporter | Current status | Notes |
| --- | --- | --- | --- | --- |
| `acc` | `CT_Acc` | `CAccent` -> `ExportAccent` | `normalized` | Core lowering exists |
| `bar` | `CT_Bar` | `CBar` -> `ExportBar` | `normalized` | Core lowering exists |
| `box` | `CT_Box` | `CBox` -> `ExportBox` | `approximated` | Structural box exported; properties now surfaced |
| `borderBox` | `CT_BorderBox` | `CBorderBox` -> `ExportBorderBox` | `approximated` | Partial edge/strike support |
| `d` | `CT_D` | `CDelimiter` -> `ExportDelimiter` | `normalized` | Core lowering exists |
| `eqArr` | `CT_EqArr` | `CEqArray` -> `ExportEqArray` | `approximated` | Eqno support implemented; layout properties partial |
| `f` | `CT_F` | `CFraction` -> `ExportFraction` | `approximated` | Linear/skewed are non-exact |
| `func` | `CT_Func` | `CMathFunc` -> `ExportMathFunction` | `normalized` | Core lowering exists |
| `groupChr` | `CT_GroupChr` | `CGroupCharacter` -> `ExportGroupCharacter` | `approximated` | Core lowering exists; `vertJc` only classified |
| `limLow` | `CT_LimLow` | `CLimit` -> `ExportLimit` | `normalized` | Core lowering exists |
| `limUpp` | `CT_LimUpp` | `CLimit` -> `ExportLimit` | `normalized` | Core lowering exists |
| `m` | `CT_M` | `CMathMatrix` -> `ExportMatrix` | `approximated` | Core lowering exists; spacing/justification partial |
| `nary` | `CT_Nary` | `CNary` -> `ExportNary` | `approximated` | `grow`, `subHide`, `supHide` are non-exact |
| `phant` | `CT_Phant` | `CPhantom` -> `ExportPhantom` | `approximated` | Partial-height combinations are non-exact |
| `rad` | `CT_Rad` | `CRadical` -> `ExportRadical` | `approximated` | `degHide` is non-exact |
| `sPre` | `CT_SPre` | `CDegreeSubSup` -> `ExportDegreeSubSup` | `normalized` | Prescripts implemented |
| `sSub` | `CT_SSub` | `CDegree` -> `ExportDegree` | `normalized` | Core lowering exists |
| `sSubSup` | `CT_SSubSup` | `CDegreeSubSup` -> `ExportDegreeSubSup` | `approximated` | `alnScr` now surfaced only |
| `sSup` | `CT_SSup` | `CDegree` -> `ExportDegree` | `normalized` | Core lowering exists |
| `r` | `CT_R` | `ParaRun` / `CMathText` -> `ExportParaRun` / `ExportMathTextNode` | `approximated` | Run styling and font mapping are partial |

## Property Matrix

### `CT_RPR`

| Property | Current status | Notes |
| --- | --- | --- |
| `lit` | `approximated` | Surfaced as `ParaRun.MathPrp.lit` |
| `nor` | `approximated` | Surfaced as `ParaRun.MathPrp.nor` |
| `scr` | `normalized` | Lowered to math alphabet wrappers |
| `sty` | `normalized` | Lowered to math alphabet wrappers |
| `brk` | `classified-only` | Surfaced as `ParaRun.MathPrp.brk` |
| `aln` | `classified-only` | Surfaced as `ParaRun.MathPrp.aln`; dedicated align-point lowering exists via `CMathAmp.alignPoint` |

### `CT_AccPr`

| Property | Current status | Notes |
| --- | --- | --- |
| `chr` | `normalized` | Accent mapping exists |
| `ctrlPr` | `classified-only` | Surfaced as `CAccent.ctrlPr` |

### `CT_BarPr`

| Property | Current status | Notes |
| --- | --- | --- |
| `pos` | `normalized` | Lowered to `\overline` / `\underline` |
| `ctrlPr` | `classified-only` | Surfaced as `CBar.ctrlPr` |

### `CT_BoxPr`

| Property | Current status | Notes |
| --- | --- | --- |
| `opEmu` | `classified-only` | Surfaced as `CBox.opEmu` |
| `noBreak` | `classified-only` | Surfaced as `CBox.noBreak` |
| `diff` | `classified-only` | Surfaced as `CBox.diff` |
| `brk` | `classified-only` | Surfaced as `CBox.brk` |
| `aln` | `classified-only` | Surfaced as `CBox.aln` |
| `ctrlPr` | `classified-only` | Surfaced as `CBox.ctrlPr` |

### `CT_BorderBoxPr`

| Property | Current status | Notes |
| --- | --- | --- |
| `hideTop` | `approximated` | Partial edge lowering |
| `hideBot` | `approximated` | Partial edge lowering |
| `hideLeft` | `approximated` | Partial edge lowering |
| `hideRight` | `approximated` | Partial edge lowering |
| `strikeH` | `approximated` | Classified as orthogonal strike approximation |
| `strikeV` | `approximated` | Classified as orthogonal strike approximation |
| `strikeBLTR` | `approximated` | Better with `cancel` package where available |
| `strikeTLBR` | `approximated` | Better with `cancel` package where available |
| `ctrlPr` | `classified-only` | Surfaced as `CBorderBox.ctrlPr` |

### `CT_DPr`

| Property | Current status | Notes |
| --- | --- | --- |
| `begChr` | `normalized` | Lowered |
| `sepChr` | `normalized` | Lowered as `\mid` for multi-content case |
| `endChr` | `normalized` | Lowered |
| `grow` | `approximated` | Surfaced as `CDelimiter.grow` |
| `shp` | `approximated` | Surfaced as `CDelimiter.shp` |
| `ctrlPr` | `classified-only` | Surfaced as `CDelimiter.ctrlPr` |

### `CT_EqArrPr`

| Property | Current status | Notes |
| --- | --- | --- |
| `baseJc` | `approximated` | Surfaced as `CEqArray.baseJc` |
| `maxDist` | `classified-only` | Surfaced as `CEqArray.maxDist` |
| `objDist` | `classified-only` | Surfaced as `CEqArray.objDist` |
| `rSpRule` | `approximated` | Surfaced as `CEqArray.rSpRule` |
| `rSp` | `approximated` | Surfaced as `CEqArray.rSp` |
| `ctrlPr` | `classified-only` | Surfaced as `CEqArray.ctrlPr` |

### `CT_FPr`

| Property | Current status | Notes |
| --- | --- | --- |
| `type=bar` | `exact` | Standard fraction |
| `type=noBar` | `normalized` | Lowered to binomial form |
| `type=skw` | `approximated` | Surfaced as `CFraction.skewed` |
| `type=lin` | `approximated` | Surfaced as `CFraction.linear` |
| `ctrlPr` | `classified-only` | Surfaced as `CFraction.ctrlPr` |

### `CT_FuncPr`

| Property | Current status | Notes |
| --- | --- | --- |
| `ctrlPr` | `classified-only` | Surfaced as `CMathFunc.ctrlPr` |

### `CT_GroupChrPr`

| Property | Current status | Notes |
| --- | --- | --- |
| `chr` | `normalized` | Core lowering exists |
| `pos` | `normalized` | Above/below distinction works |
| `vertJc` | `classified-only` | Surfaced as `CGroupCharacter.vertJc` |
| `ctrlPr` | `classified-only` | Surfaced as `CGroupCharacter.ctrlPr` |

### `CT_LimLowPr` / `CT_LimUppPr`

| Property | Current status | Notes |
| --- | --- | --- |
| `ctrlPr` | `classified-only` | Surfaced as `CLimit.ctrlPr` |

### `CT_MPr`

| Property | Current status | Notes |
| --- | --- | --- |
| `baseJc` | `approximated` | Surfaced as `CMathMatrix.baseJc` |
| `plcHide` | `approximated` | Surfaced as `CMathMatrix.plcHide` |
| `rSpRule` | `approximated` | Surfaced as `CMathMatrix.rSpRule` |
| `cGpRule` | `approximated` | Surfaced as `CMathMatrix.cGpRule` |
| `rSp` | `approximated` | Spacing heuristics partial |
| `cSp` | `approximated` | Spacing heuristics partial |
| `cGp` | `approximated` | Spacing heuristics partial |
| `mcs` | `approximated` | Column alignment partial |
| `ctrlPr` | `classified-only` | Surfaced as `CMathMatrix.ctrlPr` |

### `CT_NaryPr`

| Property | Current status | Notes |
| --- | --- | --- |
| `chr` | `normalized` | Core operator mapping exists |
| `limLoc` | `normalized` | Explicit `limLoc` plus document-default `intLim` / `naryLim` |
| `grow` | `approximated` | Surfaced as `CNary.grow` |
| `subHide` | `approximated` | Surfaced as `CNary.subHide` |
| `supHide` | `approximated` | Surfaced as `CNary.supHide` |
| `ctrlPr` | `classified-only` | Surfaced as `CNary.ctrlPr` |

### `CT_PhantPr`

| Property | Current status | Notes |
| --- | --- | --- |
| `show` | `exact` | Visible phantoms pass through; hidden phantoms lower structurally |
| `zeroWid` | `implemented` | Via `\vphantom` path where applicable |
| `zeroAsc` | `approximated` | Partial-height semantics not exact |
| `zeroDesc` | `approximated` | Partial-height semantics not exact |
| `transp` | `implemented` | Surfaced as `CPhantom.transp` |
| `ctrlPr` | `classified-only` | Surfaced as `CPhantom.ctrlPr` |

### `CT_RadPr`

| Property | Current status | Notes |
| --- | --- | --- |
| `degHide` | `approximated` | Surfaced as `CRadical.degHide` |
| `ctrlPr` | `classified-only` | Surfaced as `CRadical.ctrlPr` |

### `CT_SSubSupPr`

| Property | Current status | Notes |
| --- | --- | --- |
| `alnScr` | `classified-only` | Surfaced as `CDegreeSubSup.alnScr` |
| `ctrlPr` | `classified-only` | Surfaced as `CDegreeSubSup.ctrlPr` |

### `CT_OMathArgPr`

| Property | Current status | Notes |
| --- | --- | --- |
| `argSz` | `classified-only` | Surfaced as `CMathContent.argSz` |

### `CT_OMathParaPr`

| Property | Current status | Notes |
| --- | --- | --- |
| `jc` | `classified-only` | Surfaced as `ParaMath.Jc` while portable alignment policy remains unresolved |

### `CT_MathPr`

| Property | Current status | Notes |
| --- | --- | --- |
| `mathFont` | `classified-only` | Surfaced as `MathPr.mathFont` |
| `brkBin` | `classified-only` | Surfaced as `MathPr.brkBin` |
| `brkBinSub` | `classified-only` | Surfaced as `MathPr.brkBinSub` |
| `smallFrac` | `classified-only` | Surfaced as `MathPr.smallFrac` |
| `dispDef` | `classified-only` | Surfaced as `MathPr.dispDef` |
| `lMargin` | `classified-only` | Surfaced as `MathPr.lMargin` |
| `rMargin` | `classified-only` | Surfaced as `MathPr.rMargin` |
| `defJc` | `classified-only` | Surfaced as `MathPr.defJc` |
| `preSp` | `classified-only` | Surfaced as `MathPr.preSp` |
| `postSp` | `classified-only` | Surfaced as `MathPr.postSp` |
| `interSp` | `classified-only` | Surfaced as `MathPr.interSp` |
| `intraSp` | `classified-only` | Surfaced as `MathPr.intraSp` |
| `wrapIndent` | `classified-only` | Surfaced as `MathPr.wrapIndent` |
| `wrapRight` | `classified-only` | Surfaced as `MathPr.wrapRight` |
| `intLim` | `normalized` | Applied as the document-default integral limit policy |
| `naryLim` | `normalized` | Applied as the document-default non-integral limit policy |

## Embedded Word Content Inside Math

OMML allows `w:EG_PContentMath` inside `CT_OMath` and `CT_OMathArg`.

Schema references:

- [`shared-math.xsd` lines 489-543](/Users/venki/ClaudeCode/onlyoffice/DocumentServer/core/Test/Applications/DocxFormatCodeGen/codegen/Resource/shared-math.xsd#L489)
- [`wml.xsd` lines 930-947](/Users/venki/ClaudeCode/onlyoffice/DocumentServer/core/Test/Applications/DocxFormatCodeGen/codegen/Resource/wml.xsd#L930)

Current status:

- `customXml` -> `classified-only`
- `fldSimple` -> `normalized`
- `hyperlink` -> `normalized`
- `smartTag` -> `unsupported`
- `sdt` -> `normalized`
- run-level wrapper markup inside math -> `normalized`

Requirement:

- each must be either unwrapped safely, exported semantically, or explicitly classified
- none may remain silent generic fallback for valid OMML

## Validation/Observability Gaps

These are not schema rows, but they block completion claims.

| Area | Current status | Notes |
| --- | --- | --- |
| Generic fallback removal for valid OMML | `complete` | Canonical OMML rows and schema-legal transparent wrappers have explicit handling; remaining fallback is treated as invalid-source or non-OMML |
| Full HTML serialization of strict metadata | `partial` | Improved, but must stay complete for all new classifications |
| Renderer violation policy for placeholder leakage | `partial` | Needed for invalid-source separation |
| Unsupported vs approximated distinction for all properties | `partial` | Matrix must drive this consistently |

## Recommended Execution Order

1. `CT_OMathParaPr.jc` and `CT_MathPr.defJc`
2. `CT_MathPr` display and spacing policy classification
3. `CT_DPr.grow` and `CT_DPr.shp`
4. `CT_EqArrPr.rSpRule` / `rSp`
5. `CT_MPr.rSpRule` / `cGpRule`
6. `ctrlPr` policy across all node types
7. `w:EG_PContentMath` spillover handling
8. final fallback-elimination pass

## Completion Criteria

We can claim full OMML strict compilation only when:

1. every row in this matrix has a final status other than `not-started`
2. no valid OMML construct reaches generic fallback
3. all non-exact behaviors are classified and emitted in validation metadata
4. conformance tests exist for every row that is exact, normalized, approximated, or unsupported
