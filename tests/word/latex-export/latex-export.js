$(function () {
	let logicDocument, p1, mathContent;

	function Init()
	{
		logicDocument = AscTest.CreateLogicDocument();
		logicDocument.Start_SilentMode();
		logicDocument.RemoveFromContent(0, logicDocument.GetElementsCount(), false);

		p1 = new AscWord.Paragraph();
		logicDocument.AddToContent(0, p1);

		mathContent = new ParaMath();

		if (p1.Content.length > 0)
			p1.Content.splice(0, 1);

		p1.AddToContent(0, mathContent);
	}

	function ClearMath()
	{
		mathContent.Root.Remove_FromContent(0, mathContent.Root.Content.length);
		mathContent.Root.Correct_Content();
	}

	function AddText(str)
	{
		let iterator = str.getUnicodeIterator();

		while (iterator.isInside())
		{
			mathContent.Add(new AscWord.CRunText(iterator.value()));
			iterator.next();
		}
	}

	function ResetStrictExportState()
	{
		AscMath.SetLaTeXExportMode(AscMath.c_oAscLaTeXExportMode.Legacy);
		AscMath.SetLaTeXExportFallbackPolicy(AscMath.c_oAscLaTeXExportFallbackPolicy.Legacy);
		AscMath.ResetLaTeXExportRegistry();
	}

	Init();

	QUnit.module("LaTeX export flags", {
		beforeEach: function () {
			ResetStrictExportState();
		},
		afterEach: function () {
			ResetStrictExportState();
		}
	});

	QUnit.test("default export mode is legacy", function (assert) {
		assert.strictEqual(AscMath.GetLaTeXExportMode(), AscMath.c_oAscLaTeXExportMode.Legacy);
	});

	QUnit.test("strict export renderer inserts boundary spaces by token kind", function (assert) {
		const K = AscMath.LaTeXExportTokenKinds;
		const token = AscMath.CreateLaTeXExportToken;

		let output = AscMath.RenderLaTeXExportTokens([
			token(K.Command, "\\alpha"),
			token(K.Identifier, "x")
		], AscMath.CreateLaTeXExportContext());
		assert.strictEqual(output, "\\alpha x", "space inserted between command and identifier");

		output = AscMath.RenderLaTeXExportTokens([
			token(K.Command, "\\sqrt"),
			token(K.GroupOpen, "{"),
			token(K.Identifier, "x"),
			token(K.GroupClose, "}")
		], AscMath.CreateLaTeXExportContext());
		assert.strictEqual(output, "\\sqrt{x}", "no extra space before group open");
	});

	QUnit.test("strict export falls back to legacy output until a node exporter exists", function (assert) {
		ClearMath();
		logicDocument.SetMathInputType(1);
		AddText("\\theta");
		mathContent.ConvertView(false, Asc.c_oAscMathInputType.LaTeX);

		AscMath.SetLaTeXExportMode(AscMath.c_oAscLaTeXExportMode.Strict);

		assert.strictEqual(mathContent.GetLaTeXText(), mathContent.GetText(true), "strict path falls back to legacy output");
	});

	QUnit.test("strict export entry point uses registered node exporter", function (assert) {
		const K = AscMath.LaTeXExportTokenKinds;
		const token = AscMath.CreateLaTeXExportToken;

		AscMath.SetLaTeXExportMode(AscMath.c_oAscLaTeXExportMode.Strict);
		AscMath.RegisterLaTeXExportNode("ParaMath", function () {
			return [
				token(K.Command, "\\alpha"),
				token(K.Identifier, "x")
			];
		});

		assert.strictEqual(mathContent.GetLaTeXText(), "\\alpha x");
	});

	QUnit.test("strict symbol overrides remove OMML-only aliases", function (assert) {
		assert.strictEqual(
			AscMath.RenderLaTeXExportTokens(
				AscMath.ExportSymbolToLaTeXTokens("℃", AscMath.CreateLaTeXExportContext()),
				AscMath.CreateLaTeXExportContext()
			),
			"{}^{\\circ}\\mathrm{C}"
		);

		assert.strictEqual(
			AscMath.RenderLaTeXExportTokens(
				AscMath.ExportSymbolToLaTeXTokens("⁡", AscMath.CreateLaTeXExportContext()),
				AscMath.CreateLaTeXExportContext()
			),
			""
		);
	});

	QUnit.test("strict symbol export normalizes common unicode minus and space variants", function (assert) {
		assert.strictEqual(
			AscMath.RenderLaTeXExportTokens(
				AscMath.ExportSymbolToLaTeXTokens("−", AscMath.CreateLaTeXExportContext()),
				AscMath.CreateLaTeXExportContext()
			),
			"-"
		);

		assert.strictEqual(
			AscMath.RenderLaTeXExportTokens(
				AscMath.ExportSymbolToLaTeXTokens("–", AscMath.CreateLaTeXExportContext()),
				AscMath.CreateLaTeXExportContext()
			),
			"-"
		);

		assert.strictEqual(
			AscMath.RenderLaTeXExportTokens(
				AscMath.ExportSymbolToLaTeXTokens("\u2008", AscMath.CreateLaTeXExportContext()),
				AscMath.CreateLaTeXExportContext()
			),
			"\\ "
		);

		assert.strictEqual(
			AscMath.RenderLaTeXExportTokens(
				AscMath.ExportSymbolToLaTeXTokens("\u2009", AscMath.CreateLaTeXExportContext()),
				AscMath.CreateLaTeXExportContext()
			),
			"\\,"
		);

		assert.strictEqual(
			AscMath.RenderLaTeXExportTokens(
				AscMath.ExportSymbolToLaTeXTokens("（", AscMath.CreateLaTeXExportContext()),
				AscMath.CreateLaTeXExportContext()
			),
			"("
		);

		assert.strictEqual(
			AscMath.RenderLaTeXExportTokens(
				AscMath.ExportSymbolToLaTeXTokens("）", AscMath.CreateLaTeXExportContext()),
				AscMath.CreateLaTeXExportContext()
			),
			")"
		);

		assert.strictEqual(
			AscMath.RenderLaTeXExportTokens(
				AscMath.ExportSymbolToLaTeXTokens("·", AscMath.CreateLaTeXExportContext()),
				AscMath.CreateLaTeXExportContext()
			),
			"\\cdot"
		);
	});

	QUnit.test("strict export lowers horizontal group characters as operators with limits", function (assert) {
		AscMath.SetLaTeXExportMode(AscMath.c_oAscLaTeXExportMode.Strict);
		AscMath.RegisterLaTeXExportNode("FakeLeaf", function (node) {
			return [AscMath.CreateLaTeXExportToken(AscMath.LaTeXExportTokenKinds.Identifier, node.value)];
		});

		assert.strictEqual(
			AscMath.ExportToLaTeX({
				constructor: {name: "CGroupCharacter"},
				Pr: {
					chr: "→".codePointAt(0),
					pos: 1
				},
				getBase: function () {
					return {
						constructor: {name: "FakeLeaf"},
						value: "x"
					};
				}
			}, {
				mode: AscMath.c_oAscLaTeXExportMode.Strict
			}),
			"\\mathop{\\to}\\limits^{x}"
		);

		assert.strictEqual(
			AscMath.ExportToLaTeX({
				constructor: {name: "CGroupCharacter"},
				Pr: {
					chr: "⏞".codePointAt(0),
					pos: 1
				},
				getBase: function () {
					return {
						constructor: {name: "FakeLeaf"},
						value: "x"
					};
				}
			}, {
				mode: AscMath.c_oAscLaTeXExportMode.Strict
			}),
			"\\overbrace{x}"
		);
	});

	QUnit.test("strict export lowers prescripts without fallback", function (assert) {
		AscMath.SetLaTeXExportMode(AscMath.c_oAscLaTeXExportMode.Strict);
		AscMath.RegisterLaTeXExportNode("FakeLeaf", function (node) {
			return node.value
				? [AscMath.CreateLaTeXExportToken(AscMath.LaTeXExportTokenKinds.Identifier, node.value)]
				: [];
		});

		assert.strictEqual(
			AscMath.ExportToLaTeX({
				constructor: {name: "CDegreeSubSup"},
				Pr: {
					type: DEGREE_PreSubSup
				},
				getBase: function () {
					return {
						constructor: {name: "FakeLeaf"},
						value: "D"
					};
				},
				getLowerIterator: function () {
					return {
						constructor: {name: "FakeLeaf"},
						value: "q"
					};
				},
				getUpperIterator: function () {
					return {
						constructor: {name: "FakeLeaf"},
						value: ""
					};
				}
			}, {
				mode: AscMath.c_oAscLaTeXExportMode.Strict
			}),
			"{}_{q}D"
		);

		assert.strictEqual(
			AscMath.ExportToLaTeX({
				constructor: {name: "CDegreeSubSup"},
				Pr: {
					type: DEGREE_PreSubSup
				},
				getBase: function () {
					return {
						constructor: {name: "FakeLeaf"},
						value: "K"
					};
				},
				getLowerIterator: function () {
					return {
						constructor: {name: "FakeLeaf"},
						value: ""
					};
				},
				getUpperIterator: function () {
					return {
						constructor: {name: "FakeLeaf"},
						value: "L"
					};
				}
			}, {
				mode: AscMath.c_oAscLaTeXExportMode.Strict
			}),
			"{}^{L}K"
		);
	});

	QUnit.test("strict export records approximated OMML properties for unportable node settings", function (assert) {
		let validation = AscMath.CreateLaTeXExportValidation();
		let options = {
			mode: AscMath.c_oAscLaTeXExportMode.Strict,
			validation: validation
		};

		AscMath.SetLaTeXExportMode(AscMath.c_oAscLaTeXExportMode.Strict);
		AscMath.RegisterLaTeXExportNode("FakeLeaf", function (node) {
			return node.value
				? [AscMath.CreateLaTeXExportToken(AscMath.LaTeXExportTokenKinds.Identifier, node.value)]
				: [];
		});

		AscMath.ExportToLaTeX({
			constructor: {name: "CMathContent"},
			GetArgSize: function () {
				return -1;
			},
			Content: []
		}, options);
		assert.ok(validation.approximatedProperties.includes("CMathContent.argSz"), "argSz surfaced");

		validation = AscMath.CreateLaTeXExportValidation();
		options.validation = validation;
		AscMath.ExportToLaTeX({
			constructor: {name: "CDegreeSubSup"},
			Pr: {
				type: DEGREE_PreSubSup,
				alnScr: true
			},
			getBase: function () {
				return {constructor: {name: "FakeLeaf"}, value: "D"};
			},
			getLowerIterator: function () {
				return {constructor: {name: "FakeLeaf"}, value: "q"};
			},
			getUpperIterator: function () {
				return {constructor: {name: "FakeLeaf"}, value: ""};
			}
		}, options);
		assert.ok(validation.approximatedProperties.includes("CDegreeSubSup.alnScr"), "alnScr surfaced");

		validation = AscMath.CreateLaTeXExportValidation();
		options.validation = validation;
		AscMath.ExportToLaTeX({
			constructor: {name: "CGroupCharacter"},
			Pr: {
				chr: "⏞".codePointAt(0),
				pos: 1,
				vertJc: 0
			},
			getBase: function () {
				return {constructor: {name: "FakeLeaf"}, value: "x"};
			}
		}, options);
		assert.ok(validation.approximatedProperties.includes("CGroupCharacter.vertJc"), "vertJc surfaced");

		validation = AscMath.CreateLaTeXExportValidation();
		options.validation = validation;
		AscMath.ExportToLaTeX({
			constructor: {name: "CEqArray"},
			Pr: {
				row: 1,
				baseJc: BASEJC_CENTER,
				maxDist: 1,
				objDist: 1
			},
			getElement: function () {
				return {constructor: {name: "FakeLeaf"}, value: "x"};
			}
		}, options);
		assert.ok(validation.approximatedProperties.includes("CEqArray.maxDist"), "maxDist surfaced");
		assert.ok(validation.approximatedProperties.includes("CEqArray.objDist"), "objDist surfaced");

		validation = AscMath.CreateLaTeXExportValidation();
		options.validation = validation;
		AscMath.ExportToLaTeX({
			constructor: {name: "CBox"},
			Pr: {
				opEmu: true,
				noBreak: true,
				diff: true,
				brk: {}
			},
			getBase: function () {
				return {constructor: {name: "FakeLeaf"}, value: "x"};
			}
		}, options);
		assert.ok(validation.approximatedProperties.includes("CBox.opEmu"), "opEmu surfaced");
		assert.ok(validation.approximatedProperties.includes("CBox.noBreak"), "noBreak surfaced");
		assert.ok(validation.approximatedProperties.includes("CBox.diff"), "diff surfaced");
		assert.ok(validation.approximatedProperties.includes("CBox.brk"), "brk surfaced");
	});
});
