#!/usr/bin/env node

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "../..");
const files = [
	"word/Math/LaTeXExportFlags.js",
	"word/Math/LaTeXExportContext.js",
	"word/Math/LaTeXExportTokens.js",
	"word/Math/LaTeXExportRenderer.js",
	"word/Math/LaTeXExportRegistry.js",
	"word/Math/LaTeXExportSymbols.js",
	"word/Math/LaTeXExportNodes.js",
];

global.window = global;
global.AscMath = {};
global.ONLYOFFICE_LATEX_EXPORT = null;
global.AscCommon = {
	encodeSurrogateChar(value) {
		return String.fromCodePoint(value);
	}
};
global.para_Math = 0x0026;
global.para_Math_Run = 0x0036;
global.para_Math_Content = 0x0037;
global.para_Math_Text = 0x0038;
global.para_Math_Ampersand = 0x0035;
global.MATH_FRACTION = 0x1001;
global.MATH_DEGREE = 0x1002;
global.MATH_DEGREESubSup = 0x1003;
global.MATH_RADICAL = 0x1004;
global.MATH_DELIMITER = 0x1005;
global.MATH_LIMIT = 0x1006;
global.MATH_FUNCTION = 0x1007;
global.MATH_NARY = 0x1008;
global.MATH_ACCENT = 0x1009;
global.MATH_BORDER_BOX = 0x1010;
global.MATH_BOX = 0x1011;
global.MATH_BAR = 0x1012;
global.MATH_PHANTOM = 0x1013;
global.MATH_MATRIX = 0x1014;
global.MATH_EQ_ARRAY = 0x1015;
global.MATH_GROUP_CHARACTER = 0x1016;
global.AscDFH = {
	historyitem_type_MathContent: 0x2001,
	historyitem_type_frac: 0x2002,
	historyitem_type_deg: 0x2003,
	historyitem_type_deg_subsup: 0x2004,
	historyitem_type_rad: 0x2005,
	historyitem_type_delimiter: 0x2006,
	historyitem_type_lim: 0x2007,
	historyitem_type_mathFunc: 0x2008,
	historyitem_type_nary: 0x2009,
	historyitem_type_acc: 0x2010,
	historyitem_type_borderBox: 0x2011,
	historyitem_type_box: 0x2012,
	historyitem_type_bar: 0x2013,
	historyitem_type_phant: 0x2014,
	historyitem_type_matrix: 0x2015,
	historyitem_type_eqArr: 0x2016,
	historyitem_type_groupChr: 0x2017,
};
global.LIMIT_LOW = 0;
global.LIMIT_UP = 1;
global.NARY_SubSup = 0;
global.NARY_UndOvr = 1;
global.TXT_ROMAN = 0;
global.TXT_SCRIPT = 1;
global.TXT_FRAKTUR = 2;
global.TXT_DOUBLE_STRUCK = 3;
global.TXT_SANS_SERIF = 4;
global.TXT_MONOSPACE = 5;
global.MCJC_CENTER = 0;
global.MCJC_LEFT = 1;
global.MCJC_RIGHT = 2;
global.BASEJC_CENTER = 0;
global.BASEJC_TOP = 1;
global.BASEJC_BOTTOM = 2;
global.STY_BOLD = 0;
global.STY_BI = 1;
global.STY_ITALIC = 2;
global.STY_PLAIN = 3;
global.AscMath.functionNames = ["sin", "cos"];
global.AscMath.LimitFunctions = ["lim", "max"];
global.AscMath.MathLiterals = {
	nary: {
		Unicode: {
			"∑": "\\sum",
			"∫": "\\int",
		}
	}
};

for (const relPath of files)
{
	const absPath = path.join(ROOT, relPath);
	const code = fs.readFileSync(absPath, "utf8");
	vm.runInThisContext(code, {filename: absPath});
}

const K = global.AscMath.LaTeXExportTokenKinds;
const token = global.AscMath.CreateLaTeXExportToken;

assert.strictEqual(global.AscMath.GetLaTeXExportMode(), global.AscMath.c_oAscLaTeXExportMode.Legacy);

let output = global.AscMath.RenderLaTeXExportTokens([
	token(K.Command, "\\alpha"),
	token(K.Identifier, "x"),
], global.AscMath.CreateLaTeXExportContext());
assert.strictEqual(output, "\\alpha x");

output = global.AscMath.RenderLaTeXExportTokens([
	token(K.Command, "\\sqrt"),
	token(K.GroupOpen, "{"),
	token(K.Identifier, "x"),
	token(K.GroupClose, "}"),
], global.AscMath.CreateLaTeXExportContext());
assert.strictEqual(output, "\\sqrt{x}");

output = global.AscMath.RenderLaTeXExportTokens([
	token(K.Command, "\\mathit"),
	token(K.GroupOpen, "{"),
	token(K.Command, "\\mathbf"),
	token(K.GroupOpen, "{"),
	token(K.Identifier, "I"),
	token(K.Operator, "|"),
	token(K.GroupClose, "}"),
	token(K.Command, "\\bar"),
	token(K.GroupOpen, "{"),
	token(K.Command, "\\mathit"),
	token(K.GroupOpen, "{"),
	token(K.Command, "\\mathbf"),
	token(K.GroupOpen, "{"),
	token(K.Identifier, "n"),
	token(K.GroupClose, "}"),
	token(K.GroupClose, "}"),
	token(K.GroupClose, "}"),
	token(K.GroupClose, "}"),
], global.AscMath.CreateLaTeXExportContext());
assert.strictEqual(output, "\\mathit{\\mathbf{I}}|\\bar{\\mathit{\\mathbf{n}}}");

output = global.AscMath.RenderLaTeXExportTokens([
	token(K.Command, "\\mathit"),
	token(K.GroupOpen, "{"),
	token(K.Command, "\\mathbf"),
	token(K.GroupOpen, "{"),
	token(K.Command, "\\beta"),
	token(K.GroupClose, "}"),
	token(K.GroupClose, "}"),
	token(K.SubOpen, "_{"),
	token(K.Command, "\\mathit"),
	token(K.GroupOpen, "{"),
	token(K.Command, "\\mathbf"),
	token(K.GroupOpen, "{"),
	token(K.Identifier, "N"),
	token(K.GroupClose, "}"),
	token(K.GroupClose, "}"),
	token(K.GroupClose, "}"),
	token(K.Command, "\\mathit"),
	token(K.GroupOpen, "{"),
	token(K.Command, "\\mathbf"),
	token(K.GroupOpen, "{"),
	token(K.Operator, ","),
	token(K.Space, " "),
	token(K.GroupClose, "}"),
	token(K.GroupClose, "}"),
], global.AscMath.CreateLaTeXExportContext());
assert.strictEqual(output, "\\mathit{\\mathbf{\\beta}}_{\\mathit{\\mathbf{N}}}, ");

global.AscMath.SetLaTeXExportMode(global.AscMath.c_oAscLaTeXExportMode.Strict);
global.AscMath.RegisterLaTeXExportNode("FakeNode", function () {
	return [
		token(K.Command, "\\beta"),
		token(K.Number, "2"),
	];
});

const strictOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "FakeNode"},
	GetText: function () {
		return "legacy";
	}
});
assert.strictEqual(strictOutput, "\\beta 2");

const typeDispatchOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "BundledNode"},
	Type: global.para_Math_Ampersand,
	IsAlignPoint() { return false; },
	GetText: function () {
		return "legacy-type-dispatch";
	}
}, {
	mode: global.AscMath.c_oAscLaTeXExportMode.Strict
});
assert.strictEqual(typeDispatchOutput, "&");

const fallbackOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "UnknownNode"},
	GetText: function () {
		return "legacy-fallback";
	}
});
assert.strictEqual(fallbackOutput, "legacy-fallback");

const symbolOutput = global.AscMath.RenderLaTeXExportTokens(
	global.AscMath.ExportSymbolToLaTeXTokens("℃", global.AscMath.CreateLaTeXExportContext()),
	global.AscMath.CreateLaTeXExportContext()
);
assert.strictEqual(symbolOutput, "{}^{\\circ}\\mathrm{C}");

const invisibleOutput = global.AscMath.RenderLaTeXExportTokens(
	global.AscMath.ExportSymbolToLaTeXTokens("⁡", global.AscMath.CreateLaTeXExportContext()),
	global.AscMath.CreateLaTeXExportContext()
);
assert.strictEqual(invisibleOutput, "");

global.ONLYOFFICE_LATEX_EXPORT = {
	mode: "strict",
	htmlPreferStrict: true,
	packageFeatures: {
		color: true,
	},
	matrixSpacingHeuristics: true,
};
const configuredSettings = global.AscMath.GetLaTeXExportSettings();
assert.strictEqual(configuredSettings.mode, global.AscMath.c_oAscLaTeXExportMode.Strict);
assert.strictEqual(configuredSettings.htmlPreferStrict, true);
assert.strictEqual(configuredSettings.packageFeatures.color, true);
assert.strictEqual(configuredSettings.matrixSpacingHeuristics, true);
global.ONLYOFFICE_LATEX_EXPORT = null;

const textNode = function (value) {
	return {
		constructor: {name: "CMathText"},
		value: value
	};
};

const fractionOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "CFraction"},
	Pr: {type: 1},
	getNumerator() { return textNode("a".codePointAt(0)); },
	getDenominator() { return textNode("b".codePointAt(0)); },
	GetText() { return "legacy-frac"; }
}, {mode: global.AscMath.c_oAscLaTeXExportMode.Strict});
assert.strictEqual(fractionOutput, "\\frac{a}{b}");

global.NO_BAR_FRACTION = 0;
global.BAR_FRACTION = 1;
global.SKEWED_FRACTION = 2;
global.LINEAR_FRACTION = 3;
const skewedFractionValidation = global.AscMath.CreateLaTeXExportValidation();
const skewedFractionOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "CFraction"},
	Pr: {type: global.SKEWED_FRACTION},
	getNumerator() { return textNode("a".codePointAt(0)); },
	getDenominator() { return textNode("b".codePointAt(0)); },
	GetText() { return "legacy-skew-frac"; }
}, {
	mode: global.AscMath.c_oAscLaTeXExportMode.Strict,
	validation: skewedFractionValidation,
});
assert.strictEqual(skewedFractionOutput, "\\frac{a}{b}");
assert.deepStrictEqual(skewedFractionValidation.approximatedProperties, ["CFraction.skewed"]);

const degreeOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "CDegree"},
	Pr: {type: 1},
	getBase() { return textNode("x".codePointAt(0)); },
	getIterator() { return textNode("2".codePointAt(0)); },
	GetText() { return "legacy-degree"; }
}, {mode: global.AscMath.c_oAscLaTeXExportMode.Strict});
assert.strictEqual(degreeOutput, "x^{2}");

const degreeSubSupFallbackValidation = global.AscMath.CreateLaTeXExportValidation();
const degreeSubSupFallbackOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "CDegreeSubSup"},
	Pr: {type: -1},
	GetText() { return "legacy-degree-subsup-fallback"; }
}, {
	mode: global.AscMath.c_oAscLaTeXExportMode.Strict,
	validation: degreeSubSupFallbackValidation,
});
assert.strictEqual(degreeSubSupFallbackOutput, "legacy-degree-subsup-fallback");
assert.deepStrictEqual(degreeSubSupFallbackValidation.fallbacks, ["CDegreeSubSup.type:-1", "CDegreeSubSup"]);

const limitOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "CLimit"},
	Pr: {type: global.LIMIT_LOW},
	getFName() { return textNode("l".codePointAt(0)); },
	getIterator() { return textNode("0".codePointAt(0)); },
	GetText() { return "legacy-limit"; }
}, {mode: global.AscMath.c_oAscLaTeXExportMode.Strict});
assert.strictEqual(limitOutput, "\\mathop{l}\\limits_{0}");

const functionNameNode = {
	constructor: {name: "FakeFunctionName"},
	GetTextOfElement() {
		return {
			GetText() {
				return "sin";
			}
		};
	},
	GetText() {
		return "sin";
	}
};
global.AscMath.RegisterLaTeXExportNode("FakeFunctionName", function () {
	return [
		token(K.Identifier, "s"),
		token(K.Identifier, "i"),
		token(K.Identifier, "n"),
	];
});

const functionOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "CMathFunc"},
	getFName() { return functionNameNode; },
	getArgument() { return textNode("x".codePointAt(0)); },
	GetText() { return "legacy-func"; }
}, {mode: global.AscMath.c_oAscLaTeXExportMode.Strict});
assert.strictEqual(functionOutput, "\\sin x");

const limitFunctionNameNode = {
	constructor: {name: "FakeLimitFunctionName"},
	GetTextOfElement() {
		return {
			GetText() {
				return "lim";
			}
		};
	},
	GetText() {
		return "lim";
	}
};
global.AscMath.RegisterLaTeXExportNode("FakeLimitFunctionName", function () {
	return [
		token(K.Identifier, "l"),
		token(K.Identifier, "i"),
		token(K.Identifier, "m"),
	];
});

const limitFunctionOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "CLimit"},
	Pr: {type: global.LIMIT_LOW},
	getFName() { return limitFunctionNameNode; },
	getIterator() { return textNode("n".codePointAt(0)); },
	GetText() { return "legacy-limit-func"; }
}, {mode: global.AscMath.c_oAscLaTeXExportMode.Strict});
assert.strictEqual(limitFunctionOutput, "\\mathop{lim}\\limits_{n}");

const naryOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "CNary"},
	Pr: {chr: "∑".charCodeAt(0), limLoc: global.NARY_UndOvr},
	getLowerIterator() { return textNode("i".codePointAt(0)); },
	getUpperIterator() { return textNode("n".codePointAt(0)); },
	getBase() { return textNode("x".codePointAt(0)); },
	GetText() { return "legacy-nary"; }
}, {mode: global.AscMath.c_oAscLaTeXExportMode.Strict});
assert.strictEqual(naryOutput, "\\sum\\limits_{i}^{n}x");

const naryNoLimitsOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "CNary"},
	Pr: {chr: "∫".charCodeAt(0), limLoc: global.NARY_SubSup},
	getLowerIterator() { return textNode("0".codePointAt(0)); },
	getUpperIterator() { return textNode("1".codePointAt(0)); },
	getBase() { return textNode("x".codePointAt(0)); },
	GetText() { return "legacy-nary-nolimits"; }
}, {mode: global.AscMath.c_oAscLaTeXExportMode.Strict});
assert.strictEqual(naryNoLimitsOutput, "\\int\\nolimits_{0}^{1}x");

const accentOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "CAccent"},
	Pr: {chr: 769},
	getBase() { return textNode("x".codePointAt(0)); },
	GetText() { return "legacy-accent"; }
}, {mode: global.AscMath.c_oAscLaTeXExportMode.Strict});
assert.strictEqual(accentOutput, "\\acute{x}");

const leftArrowAccentOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "CAccent"},
	Pr: {chr: 8406},
	getBase() { return textNode("x".codePointAt(0)); },
	GetText() { return "legacy-left-arrow-accent"; }
}, {mode: global.AscMath.c_oAscLaTeXExportMode.Strict});
assert.strictEqual(leftArrowAccentOutput, "\\overleftarrow{x}");

const rightArrowAccentOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "CAccent"},
	Pr: {chr: 8401},
	getBase() { return textNode("x".codePointAt(0)); },
	GetText() { return "legacy-right-arrow-accent"; }
}, {mode: global.AscMath.c_oAscLaTeXExportMode.Strict});
assert.strictEqual(rightArrowAccentOutput, "\\overrightarrow{x}");

const barOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "CBar"},
	Pr: {pos: 0},
	getBase() { return textNode("x".codePointAt(0)); },
	GetText() { return "legacy-bar"; }
}, {mode: global.AscMath.c_oAscLaTeXExportMode.Strict});
assert.strictEqual(barOutput, "\\overline{x}");

const borderBoxOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "CBorderBox"},
	getBase() { return textNode("x".codePointAt(0)); },
	GetText() { return "legacy-border-box"; }
}, {mode: global.AscMath.c_oAscLaTeXExportMode.Strict});
assert.strictEqual(borderBoxOutput, "\\boxed{x}");

const borderBoxValidation = global.AscMath.CreateLaTeXExportValidation();
const borderBoxApproxOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "CBorderBox"},
	Pr: {
		hideTop: true,
		strikeH: true,
	},
	getBase() { return textNode("x".codePointAt(0)); },
	GetText() { return "legacy-border-box-approx"; }
}, {
	mode: global.AscMath.c_oAscLaTeXExportMode.Strict,
	validation: borderBoxValidation,
});
assert.strictEqual(borderBoxApproxOutput, "\\boxed{x}");
assert.deepStrictEqual(borderBoxValidation.approximatedProperties, [
	"CBorderBox.hiddenEdges",
	"CBorderBox.orthogonalStrikes",
	"CBorderBox.strikes",
]);

const phantomOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "CPhantom"},
	getBase() { return textNode("x".codePointAt(0)); },
	GetText() { return "legacy-phantom"; }
}, {mode: global.AscMath.c_oAscLaTeXExportMode.Strict});
assert.strictEqual(phantomOutput, "\\phantom{x}");

const phantomZeroWidthValidation = global.AscMath.CreateLaTeXExportValidation();
const phantomZeroWidthOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "CPhantom"},
	Pr: {zeroWid: true},
	getBase() { return textNode("x".codePointAt(0)); },
	GetText() { return "legacy-phantom-zero-width"; }
}, {
	mode: global.AscMath.c_oAscLaTeXExportMode.Strict,
	validation: phantomZeroWidthValidation,
});
assert.strictEqual(phantomZeroWidthOutput, "\\vphantom{x}");
assert.deepStrictEqual(phantomZeroWidthValidation.implementedProperties, ["CPhantom.zeroWid"]);

const phantomZeroHeightValidation = global.AscMath.CreateLaTeXExportValidation();
const phantomZeroHeightOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "CPhantom"},
	Pr: {zeroAsc: true, zeroDesc: true},
	getBase() { return textNode("x".codePointAt(0)); },
	GetText() { return "legacy-phantom-zero-height"; }
}, {
	mode: global.AscMath.c_oAscLaTeXExportMode.Strict,
	validation: phantomZeroHeightValidation,
});
assert.strictEqual(phantomZeroHeightOutput, "\\hphantom{x}");
assert.deepStrictEqual(phantomZeroHeightValidation.implementedProperties, ["CPhantom.zeroAscDesc"]);

const phantomMixedValidation = global.AscMath.CreateLaTeXExportValidation();
const phantomMixedOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "CPhantom"},
	Pr: {zeroWid: true, zeroAsc: true, transp: true},
	getBase() { return textNode("x".codePointAt(0)); },
	GetText() { return "legacy-phantom-mixed"; }
}, {
	mode: global.AscMath.c_oAscLaTeXExportMode.Strict,
	validation: phantomMixedValidation,
});
assert.strictEqual(phantomMixedOutput, "\\phantom{x}");
assert.deepStrictEqual(phantomMixedValidation.implementedProperties, ["CPhantom.transp"]);
assert.deepStrictEqual(phantomMixedValidation.approximatedProperties, ["CPhantom.zeroWidHeight"]);

const matrixCellA = textNode("a".codePointAt(0));
const matrixCellB = textNode("b".codePointAt(0));
const matrixCellC = textNode("c".codePointAt(0));
const matrixCellD = textNode("d".codePointAt(0));
const matrixOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "CMathMatrix"},
	Pr: {begChr: "(".charCodeAt(0), endChr: ")".charCodeAt(0)},
	getRowsCount() { return 2; },
	getColsCount() { return 2; },
	getContentElement(row, col) {
		const cells = [
			[matrixCellA, matrixCellB],
			[matrixCellC, matrixCellD],
		];
		return cells[row][col];
	},
	GetText() { return "legacy-matrix"; }
}, {mode: global.AscMath.c_oAscLaTeXExportMode.Strict});
assert.strictEqual(matrixOutput, "\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}");

const matrixAlignValidation = global.AscMath.CreateLaTeXExportValidation();
const matrixAlignOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "CMathMatrix"},
	Pr: {
		begChr: "[".charCodeAt(0),
		endChr: "]".charCodeAt(0),
		cGp: 10,
		cSp: 20,
		rSp: 30,
		plcHide: true,
		baseJc: global.BASEJC_TOP,
		Get_ColumnMcJc(index) {
			return index === 0 ? global.MCJC_LEFT : global.MCJC_RIGHT;
		}
	},
	getRowsCount() { return 1; },
	getColsCount() { return 2; },
	getContentElement(row, col) {
		return col === 0 ? matrixCellA : matrixCellB;
	},
	GetText() { return "legacy-matrix-align"; }
}, {
	mode: global.AscMath.c_oAscLaTeXExportMode.Strict,
	validation: matrixAlignValidation,
});
assert.strictEqual(matrixAlignOutput, "\\left[\\begin{array}{lr}a&b\\end{array}\\right]");
assert.deepStrictEqual(matrixAlignValidation.approximatedProperties, [
	"CMathMatrix.mcJc",
	"CMathMatrix.cGp",
	"CMathMatrix.cSp",
	"CMathMatrix.rSp",
	"CMathMatrix.plcHide",
	"CMathMatrix.baseJc",
]);

const matrixSpacingValidation = global.AscMath.CreateLaTeXExportValidation();
const matrixSpacingOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "CMathMatrix"},
	Pr: {
		begChr: "(".charCodeAt(0),
		endChr: ")".charCodeAt(0),
		cGp: 10,
		rSp: 20,
		Get_ColumnMcJc() {
			return global.MCJC_CENTER;
		}
	},
	getRowsCount() { return 2; },
	getColsCount() { return 2; },
	getContentElement(row, col) {
		const cells = [
			[matrixCellA, matrixCellB],
			[matrixCellC, matrixCellD],
		];
		return cells[row][col];
	},
	GetText() { return "legacy-matrix-spacing"; }
}, {
	mode: global.AscMath.c_oAscLaTeXExportMode.Strict,
	matrixSpacingHeuristics: true,
	validation: matrixSpacingValidation,
});
assert.strictEqual(matrixSpacingOutput, "\\left(\\begin{array}{c@{\\hspace{1pt}}c}a&b\\\\[2pt]c&d\\end{array}\\right)");
assert.deepStrictEqual(matrixSpacingValidation.implementedProperties, ["CMathMatrix.spacingHeuristics"]);

const eqArrayRow1 = {
	constructor: {name: "FakeEqRow"},
	GetText() { return "legacy-eq-row-1"; }
};
const eqArrayRow2 = {
	constructor: {name: "FakeEqRow"},
	GetText() { return "legacy-eq-row-2"; }
};
global.AscMath.RegisterLaTeXExportNode("FakeEqRow", function (node) {
	return [token(K.Raw, node.GetText() === "legacy-eq-row-1" ? "x=1" : "y=2")];
});
const eqArrayOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "CEqArray"},
	Pr: {row: 2},
	getElement(index) { return index === 0 ? eqArrayRow1 : eqArrayRow2; },
	GetText() { return "legacy-eqarray"; }
}, {mode: global.AscMath.c_oAscLaTeXExportMode.Strict});
assert.strictEqual(eqArrayOutput, "\\begin{array}{c}x=1\\\\y=2\\end{array}");

const eqArrayAlignValidation = global.AscMath.CreateLaTeXExportValidation();
const eqArrayAlignOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "CEqArray"},
	Pr: {row: 1, baseJc: global.BASEJC_TOP},
	getElement() { return eqArrayRow1; },
	GetText() { return "legacy-eqarray-left"; }
}, {
	mode: global.AscMath.c_oAscLaTeXExportMode.Strict,
	validation: eqArrayAlignValidation,
});
assert.strictEqual(eqArrayAlignOutput, "\\begin{array}{l}x=1\\end{array}");
assert.deepStrictEqual(eqArrayAlignValidation.approximatedProperties, ["CEqArray.baseJc"]);

const eqArrayEqnoRow = {
	constructor: {name: "FakeEqnoRow"},
	GetText() { return "legacy-eq-row-eqno"; }
};
global.AscMath.RegisterLaTeXExportNode("FakeEqnoRow", function () {
	return [
		token(K.Raw, "x=1"),
		token(K.Raw, "\\#"),
		token(K.Command, "\\left"),
		token(K.Raw, "("),
		token(K.Number, "1"),
		token(K.Raw, "."),
		token(K.Number, "2"),
		token(K.Command, "\\right"),
		token(K.Raw, ")"),
	];
});
const eqArrayEqnoValidation = global.AscMath.CreateLaTeXExportValidation();
const eqArrayEqnoOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "CEqArray"},
	Pr: {row: 1},
	getElement() { return eqArrayEqnoRow; },
	GetText() { return "legacy-eqarray-eqno"; }
}, {
	mode: global.AscMath.c_oAscLaTeXExportMode.Strict,
	validation: eqArrayEqnoValidation,
});
assert.strictEqual(eqArrayEqnoOutput, "\\begin{array}{c@{\\qquad}r}x=1&\\left(1.2\\right)\\end{array}");
assert.deepStrictEqual(eqArrayEqnoValidation.implementedProperties, ["CEqArray.eqno"]);

global.AscMath.SymbolsToLaTeX = {
	"⏞": "\\overbrace",
};
const groupCharacterOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "CGroupCharacter"},
	Pr: {chr: "⏞".charCodeAt(0)},
	getBase() { return textNode("x".codePointAt(0)); },
	GetText() { return "legacy-group-character"; }
}, {mode: global.AscMath.c_oAscLaTeXExportMode.Strict});
assert.strictEqual(groupCharacterOutput, "\\overbrace{x}");

const groupCharacterPackageValidation = global.AscMath.CreateLaTeXExportValidation();
const groupCharacterPackageOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "CGroupCharacter"},
	Pr: {chr: "⏜".charCodeAt(0), pos: 1},
	getBase() { return textNode("x".codePointAt(0)); },
	GetText() { return "legacy-group-overparen"; }
}, {
	mode: global.AscMath.c_oAscLaTeXExportMode.Strict,
	validation: groupCharacterPackageValidation,
});
assert.strictEqual(groupCharacterPackageOutput, "\\overparen{x}");
assert.deepStrictEqual(groupCharacterPackageValidation.requiredPackages, ["mathtools"]);
assert.deepStrictEqual(groupCharacterPackageValidation.approximatedProperties, ["CGroupCharacter.packageCommand"]);

const mathAmpOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "CMathAmp"},
	IsAlignPoint() { return false; },
	GetText() { return "&"; }
}, {mode: global.AscMath.c_oAscLaTeXExportMode.Strict});
assert.strictEqual(mathAmpOutput, "&");

const mathAmpAlignValidation = global.AscMath.CreateLaTeXExportValidation();
const mathAmpAlignOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "CMathAmp"},
	IsAlignPoint() { return true; },
	GetText() { return ""; }
}, {
	mode: global.AscMath.c_oAscLaTeXExportMode.Strict,
	validation: mathAmpAlignValidation,
});
assert.strictEqual(mathAmpAlignOutput, "");
assert.deepStrictEqual(mathAmpAlignValidation.implementedProperties, ["CMathAmp.alignPoint"]);

const fakeLeaf = function (char) {
	return {
		GetCodePoint() {
			return char.codePointAt(0);
		}
	};
};

const romanPlainOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "ParaRun"},
	Content: [fakeLeaf("x")],
	MathPrp: {
		lit: false,
		GetCompiled_ScrStyles() {
			return {nor: false, scr: global.TXT_ROMAN, sty: global.STY_PLAIN};
		}
	},
	GetText() { return "legacy-roman-plain"; }
}, {mode: global.AscMath.c_oAscLaTeXExportMode.Strict});
assert.strictEqual(romanPlainOutput, "\\mathrm{x}");

const romanBoldOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "ParaRun"},
	Content: [fakeLeaf("x")],
	MathPrp: {
		lit: false,
		GetCompiled_ScrStyles() {
			return {nor: false, scr: global.TXT_ROMAN, sty: global.STY_BOLD};
		}
	},
	GetText() { return "legacy-roman-bold"; }
}, {mode: global.AscMath.c_oAscLaTeXExportMode.Strict});
assert.strictEqual(romanBoldOutput, "\\mathbf{x}");

const mixedStyledRunOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "ParaRun"},
	Content: [fakeLeaf("I"), fakeLeaf("|"), fakeLeaf("n")],
	MathPrp: {
		lit: false,
		GetCompiled_ScrStyles() {
			return {nor: false, scr: global.TXT_ROMAN, sty: global.STY_BI};
		}
	},
	GetText() { return "legacy-mixed-styled-run"; }
}, {mode: global.AscMath.c_oAscLaTeXExportMode.Strict});
assert.strictEqual(mixedStyledRunOutput, "\\mathit{\\mathbf{I}}|\\mathit{\\mathbf{n}}");

const doubleStruckOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "ParaRun"},
	Content: [fakeLeaf("R")],
	MathPrp: {
		lit: false,
		GetCompiled_ScrStyles() {
			return {nor: false, scr: global.TXT_DOUBLE_STRUCK, sty: global.STY_PLAIN};
		}
	},
	GetText() { return "legacy-double-struck"; }
}, {mode: global.AscMath.c_oAscLaTeXExportMode.Strict});
assert.strictEqual(doubleStruckOutput, "\\mathbb{R}");

const sansItalicOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "ParaRun"},
	Content: [fakeLeaf("x")],
	MathPrp: {
		lit: false,
		GetCompiled_ScrStyles() {
			return {nor: false, scr: global.TXT_SANS_SERIF, sty: global.STY_ITALIC};
		}
	},
	GetText() { return "legacy-sans-italic"; }
}, {mode: global.AscMath.c_oAscLaTeXExportMode.Strict});
assert.strictEqual(sansItalicOutput, "\\mathit{\\mathsf{x}}");

const textValidation = global.AscMath.CreateLaTeXExportValidation();
const textOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "ParaRun"},
	Content: [fakeLeaf("a"), fakeLeaf("b")],
	math_autocorrection: {
		getIsMathRm() { return false; },
		getIsText() { return true; }
	},
	GetText() { return "legacy-text"; }
}, {
	mode: global.AscMath.c_oAscLaTeXExportMode.Strict,
	validation: textValidation,
});
assert.strictEqual(textOutput, "\\text{ab}");

const normalValidation = global.AscMath.CreateLaTeXExportValidation();
const normalOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "ParaRun"},
	Content: [fakeLeaf("x")],
	MathPrp: {
		lit: false,
		GetCompiled_ScrStyles() {
			return {nor: true, scr: global.TXT_ROMAN, sty: global.STY_ITALIC};
		}
	},
	GetText() { return "legacy-normal"; }
}, {
	mode: global.AscMath.c_oAscLaTeXExportMode.Strict,
	validation: normalValidation,
});
assert.strictEqual(normalOutput, "\\mathrm{x}");
assert.deepStrictEqual(normalValidation.approximatedProperties, ["ParaRun.MathPrp.nor"]);

const directFormattingValidation = global.AscMath.CreateLaTeXExportValidation();
const directFormattingOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "ParaRun"},
	Content: [fakeLeaf("x")],
	Pr: {
		Bold: true,
		Italic: true,
		RStyle: "Strong",
		Color: {r: 1, g: 2, b: 3},
		HighLight: 1,
		VertAlign: 1,
		RFonts: {Ascii: "Papyrus"},
	},
	GetText() { return "legacy-direct-formatting"; }
}, {
	mode: global.AscMath.c_oAscLaTeXExportMode.Strict,
	validation: directFormattingValidation,
});
assert.strictEqual(directFormattingOutput, "\\mathbf{x}");
assert.deepStrictEqual(directFormattingValidation.approximatedProperties, [
	"ParaRun.TextPr.RStyle",
	"ParaRun.TextPr.Bold",
	"ParaRun.TextPr.Italic",
]);
assert.deepStrictEqual(directFormattingValidation.droppedProperties, [
	"ParaRun.TextPr.Color",
	"ParaRun.TextPr.Highlight",
	"ParaRun.TextPr.VertAlign",
	"ParaRun.TextPr.RFonts",
]);

const packageFormattingValidation = global.AscMath.CreateLaTeXExportValidation();
const packageFormattingOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "ParaRun"},
	Content: [fakeLeaf("x")],
	Pr: {
		Color: {r: 1, g: 2, b: 3},
		HighLight: {r: 4, g: 5, b: 6},
	},
	GetText() { return "legacy-package-formatting"; }
}, {
	mode: global.AscMath.c_oAscLaTeXExportMode.Strict,
	packageFeatures: {
		color: true,
		highlight: true,
	},
	validation: packageFormattingValidation,
});
assert.strictEqual(packageFormattingOutput, "\\colorbox[RGB]{4,5,6}{\\textcolor[RGB]{1,2,3}{x}}");
assert.deepStrictEqual(packageFormattingValidation.requiredPackages, ["xcolor"]);
assert.deepStrictEqual(packageFormattingValidation.implementedProperties, [
	"ParaRun.TextPr.Color",
	"ParaRun.TextPr.Highlight",
]);
assert.deepStrictEqual(packageFormattingValidation.droppedProperties, []);

const borderBoxEdgesValidation = global.AscMath.CreateLaTeXExportValidation();
const borderBoxEdgesOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "CBorderBox"},
	Pr: {
		hideLeft: true,
		hideRight: true,
		hideTop: false,
		hideBot: false,
	},
	getBase() { return textNode("x".codePointAt(0)); },
	GetText() { return "legacy-border-box-edges"; }
}, {
	mode: global.AscMath.c_oAscLaTeXExportMode.Strict,
	validation: borderBoxEdgesValidation,
});
assert.strictEqual(borderBoxEdgesOutput, "\\underline{\\overline{x}}");
assert.deepStrictEqual(borderBoxEdgesValidation.approximatedProperties, ["CBorderBox.hiddenEdges"]);

const borderBoxCancelValidation = global.AscMath.CreateLaTeXExportValidation();
const borderBoxCancelOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "CBorderBox"},
	Pr: {
		strikeTLBR: true,
	},
	getBase() { return textNode("x".codePointAt(0)); },
	GetText() { return "legacy-border-box-cancel"; }
}, {
	mode: global.AscMath.c_oAscLaTeXExportMode.Strict,
	packageFeatures: {
		cancel: true,
	},
	validation: borderBoxCancelValidation,
});
assert.strictEqual(borderBoxCancelOutput, "\\cancel{\\boxed{x}}");
assert.deepStrictEqual(borderBoxCancelValidation.requiredPackages, ["cancel"]);
assert.deepStrictEqual(borderBoxCancelValidation.implementedProperties, ["CBorderBox.diagonalStrikes"]);

const sansRFontsValidation = global.AscMath.CreateLaTeXExportValidation();
const sansRFontsOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "ParaRun"},
	Content: [fakeLeaf("x")],
	Pr: {
		RFonts: {Ascii: "Arial"},
	},
	GetText() { return "legacy-rfonts-sans"; }
}, {
	mode: global.AscMath.c_oAscLaTeXExportMode.Strict,
	validation: sansRFontsValidation,
});
assert.strictEqual(sansRFontsOutput, "\\mathsf{x}");
assert.deepStrictEqual(sansRFontsValidation.approximatedProperties, ["ParaRun.TextPr.RFonts"]);
assert.deepStrictEqual(sansRFontsValidation.droppedProperties, []);

const monoRFontsValidation = global.AscMath.CreateLaTeXExportValidation();
const monoRFontsOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "ParaRun"},
	Content: [fakeLeaf("x")],
	Pr: {
		RFonts: {Ascii: "Courier New"},
	},
	GetText() { return "legacy-rfonts-mono"; }
}, {
	mode: global.AscMath.c_oAscLaTeXExportMode.Strict,
	validation: monoRFontsValidation,
});
assert.strictEqual(monoRFontsOutput, "\\mathtt{x}");
assert.deepStrictEqual(monoRFontsValidation.approximatedProperties, ["ParaRun.TextPr.RFonts"]);

const serifRFontsValidation = global.AscMath.CreateLaTeXExportValidation();
const serifRFontsOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "ParaRun"},
	Content: [fakeLeaf("x")],
	Pr: {
		RFonts: {Ascii: "Times New Roman"},
	},
	GetText() { return "legacy-rfonts-serif"; }
}, {
	mode: global.AscMath.c_oAscLaTeXExportMode.Strict,
	validation: serifRFontsValidation,
});
assert.strictEqual(serifRFontsOutput, "\\mathrm{x}");
assert.deepStrictEqual(serifRFontsValidation.approximatedProperties, ["ParaRun.TextPr.RFonts"]);

const neutralMathFontValidation = global.AscMath.CreateLaTeXExportValidation();
const neutralMathFontOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "ParaRun"},
	Content: [fakeLeaf("x")],
	Pr: {
		RFonts: {
			Ascii: {Name: "Cambria Math"},
			HAnsi: {Name: "Cambria Math"},
		},
	},
	GetText() { return "legacy-neutral-math-font"; }
}, {
	mode: global.AscMath.c_oAscLaTeXExportMode.Strict,
	validation: neutralMathFontValidation,
});
assert.strictEqual(neutralMathFontOutput, "x");
assert.deepStrictEqual(neutralMathFontValidation.droppedProperties, []);

const literalValidation = global.AscMath.CreateLaTeXExportValidation();
const literalOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "ParaRun"},
	Content: [fakeLeaf("x")],
	MathPrp: {
		lit: true,
		GetCompiled_ScrStyles() {
			return {nor: false, scr: global.TXT_ROMAN, sty: global.STY_ITALIC};
		}
	},
	GetText() { return "legacy-literal"; }
}, {
	mode: global.AscMath.c_oAscLaTeXExportMode.Strict,
	validation: literalValidation,
});
assert.strictEqual(literalOutput, "\\mathrm{x}");
assert.deepStrictEqual(literalValidation.approximatedProperties, ["ParaRun.MathPrp.lit"]);

const radicalValidation = global.AscMath.CreateLaTeXExportValidation();
const radicalHiddenDegreeOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "CRadical"},
	Pr: {degHide: true},
	getDegree() { return textNode("3".codePointAt(0)); },
	getBase() { return textNode("x".codePointAt(0)); },
	GetText() { return "legacy-radical-hidden-degree"; }
}, {
	mode: global.AscMath.c_oAscLaTeXExportMode.Strict,
	validation: radicalValidation,
});
assert.strictEqual(radicalHiddenDegreeOutput, "\\sqrt{x}");
assert.deepStrictEqual(radicalValidation.approximatedProperties, ["CRadical.degHide"]);

const radicalWithoutSquareConstantOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "CRadical"},
	Pr: {type: 999},
	getDegree() { return textNode("3".codePointAt(0)); },
	getBase() { return textNode("x".codePointAt(0)); },
	GetText() { return "legacy-radical-no-constant"; }
}, {
	mode: global.AscMath.c_oAscLaTeXExportMode.Strict,
});
assert.strictEqual(radicalWithoutSquareConstantOutput, "\\sqrt[3]{x}");

const naryValidation = global.AscMath.CreateLaTeXExportValidation();
const naryHiddenOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "CNary"},
	Pr: {
		chr: "∑".charCodeAt(0),
		subHide: true,
		supHide: false,
		limLoc: global.NARY_UndOvr,
	},
	getLowerIterator() { return textNode("i".codePointAt(0)); },
	getUpperIterator() { return textNode("n".codePointAt(0)); },
	getBase() { return textNode("x".codePointAt(0)); },
	GetText() { return "legacy-nary-hidden"; }
}, {
	mode: global.AscMath.c_oAscLaTeXExportMode.Strict,
	validation: naryValidation,
});
assert.strictEqual(naryHiddenOutput, "\\sum\\limits^{n}x");
assert.deepStrictEqual(naryValidation.approximatedProperties, ["CNary.subHide"]);

const naryGrowValidation = global.AscMath.CreateLaTeXExportValidation();
const naryGrowOutput = global.AscMath.ExportToLaTeX({
	constructor: {name: "CNary"},
	Pr: {
		chr: "∑".charCodeAt(0),
		grow: true,
		limLoc: global.NARY_UndOvr,
	},
	getLowerIterator() { return textNode("i".codePointAt(0)); },
	getUpperIterator() { return textNode("n".codePointAt(0)); },
	getBase() { return textNode("x".codePointAt(0)); },
	GetText() { return "legacy-nary-grow"; }
}, {
	mode: global.AscMath.c_oAscLaTeXExportMode.Strict,
	validation: naryGrowValidation,
});
assert.strictEqual(naryGrowOutput, "\\sum\\limits_{i}^{n}x");
assert.deepStrictEqual(naryGrowValidation.approximatedProperties, ["CNary.grow"]);

console.log("strict export scaffold smoke tests: ok");
