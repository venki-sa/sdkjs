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
				objDist: 1,
				rSpRule: 1,
				rSp: 30
			},
			getElement: function () {
				return {constructor: {name: "FakeLeaf"}, value: "x"};
			}
		}, options);
		assert.ok(validation.approximatedProperties.includes("CEqArray.maxDist"), "maxDist surfaced");
		assert.ok(validation.approximatedProperties.includes("CEqArray.objDist"), "objDist surfaced");
		assert.ok(validation.approximatedProperties.includes("CEqArray.rSpRule"), "rSpRule surfaced");
		assert.ok(validation.approximatedProperties.includes("CEqArray.rSp"), "rSp surfaced");

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
		assert.ok(validation.approximatedProperties.includes("CBox.aln"), "aln surfaced");
		assert.ok(validation.approximatedProperties.includes("CBox.brk"), "brk surfaced");

		validation = AscMath.CreateLaTeXExportValidation();
		options.validation = validation;
		AscMath.ExportToLaTeX({
			constructor: {name: "CDelimiter"},
			Pr: {
				begChr: "(".codePointAt(0),
				endChr: ")".codePointAt(0),
				grow: true,
				shp: 1
			},
			begOper: {code: "(".codePointAt(0)},
			endOper: {code: ")".codePointAt(0)},
			getColumnsCount: function () {
				return 1;
			},
			Content: [{constructor: {name: "FakeLeaf"}, value: "x"}]
		}, options);
		assert.ok(validation.approximatedProperties.includes("CDelimiter.grow"), "delimiter grow surfaced");
		assert.ok(validation.approximatedProperties.includes("CDelimiter.shp"), "delimiter shp surfaced");

		validation = AscMath.CreateLaTeXExportValidation();
		options.validation = validation;
		AscMath.ExportToLaTeX({
			constructor: {name: "CMathMatrix"},
			Pr: {
				cGpRule: 1,
				rSpRule: 2
			},
			getColsCount: function () {
				return 1;
			},
			getRowsCount: function () {
				return 1;
			},
			getContentElement: function () {
				return {constructor: {name: "FakeLeaf"}, value: "x"};
			}
		}, options);
		assert.ok(validation.approximatedProperties.includes("CMathMatrix.cGpRule"), "matrix cGpRule surfaced");
		assert.ok(validation.approximatedProperties.includes("CMathMatrix.rSpRule"), "matrix rSpRule surfaced");

		validation = AscMath.CreateLaTeXExportValidation();
		options.validation = validation;
		AscMath.ExportToLaTeX({
			constructor: {name: "ParaRun"},
			Content: [{GetCodePoint: function () { return "x".codePointAt(0); }}],
			MathPrp: {
				aln: true,
				brk: {alnAt: 1}
			},
			GetText: function () {
				return "x";
			}
		}, options);
		assert.ok(validation.approximatedProperties.includes("ParaRun.MathPrp.aln"), "run aln surfaced");
		assert.ok(validation.droppedProperties.includes("ParaRun.MathPrp.brk"), "run brk surfaced");
	});

	QUnit.test("strict export records paragraph and global math settings that are currently dropped", function (assert) {
		let validation = AscMath.CreateLaTeXExportValidation();
		let options = {
			mode: AscMath.c_oAscLaTeXExportMode.Strict,
			validation: validation
		};
		let previousMathSettingsGetter = window.Get_WordDocumentDefaultMathSettings;

		AscMath.SetLaTeXExportMode(AscMath.c_oAscLaTeXExportMode.Strict);
		AscMath.RegisterLaTeXExportNode("FakeLeaf", function (node) {
			return node.value
				? [AscMath.CreateLaTeXExportToken(AscMath.LaTeXExportTokenKinds.Identifier, node.value)]
				: [];
		});

		window.Get_WordDocumentDefaultMathSettings = function () {
			return {
				GetPr: function () {
					return {
						defJc: 1,
						smallFrac: true,
						wrapRight: true,
						wrapIndent: 25,
						lMargin: 10,
						rMargin: 20
					};
				}
			};
		};

		try
		{
			AscMath.ExportToLaTeX({
				constructor: {name: "ParaMath"},
				Jc: 2,
				Root: {
					constructor: {name: "FakeLeaf"},
					value: "x"
				}
			}, options);
		}
		finally
		{
			window.Get_WordDocumentDefaultMathSettings = previousMathSettingsGetter;
		}

		assert.ok(validation.droppedProperties.includes("ParaMath.Jc"), "paragraph jc surfaced");
		assert.ok(validation.droppedProperties.includes("MathPr.defJc"), "defJc surfaced");
		assert.ok(validation.droppedProperties.includes("MathPr.smallFrac"), "smallFrac surfaced");
		assert.ok(validation.droppedProperties.includes("MathPr.wrapRight"), "wrapRight surfaced");
		assert.ok(validation.droppedProperties.includes("MathPr.wrapIndent"), "wrapIndent surfaced");
		assert.ok(validation.droppedProperties.includes("MathPr.lMargin"), "lMargin surfaced");
		assert.ok(validation.droppedProperties.includes("MathPr.rMargin"), "rMargin surfaced");
	});

	QUnit.test("strict export uses document default n-ary limit placement", function (assert) {
		let previousMathSettingsGetter = window.Get_WordDocumentDefaultMathSettings;
		let integralValidation = AscMath.CreateLaTeXExportValidation();
		let sumValidation = AscMath.CreateLaTeXExportValidation();
		let integralOutput;
		let sumOutput;

		AscMath.SetLaTeXExportMode(AscMath.c_oAscLaTeXExportMode.Strict);
		AscMath.RegisterLaTeXExportNode("FakeLeaf", function (node) {
			return node.value
				? [AscMath.CreateLaTeXExportToken(AscMath.LaTeXExportTokenKinds.Identifier, node.value)]
				: [];
		});
		window.Get_WordDocumentDefaultMathSettings = function () {
			return {
				GetPr: function () {
					return {
						intLim: NARY_UndOvr,
						naryLim: NARY_SubSup
					};
				}
			};
		};

		try
		{
			integralOutput = AscMath.ExportToLaTeX({
				constructor: {name: "CNary"},
				Pr: {chr: "∫".charCodeAt(0)},
				getLowerIterator() { return {constructor: {name: "FakeLeaf"}, value: "0"}; },
				getUpperIterator() { return {constructor: {name: "FakeLeaf"}, value: "1"}; },
				getBase() { return {constructor: {name: "FakeLeaf"}, value: "x"}; }
			}, {
				mode: AscMath.c_oAscLaTeXExportMode.Strict,
				validation: integralValidation
			});

			sumOutput = AscMath.ExportToLaTeX({
				constructor: {name: "CNary"},
				Pr: {chr: "∑".charCodeAt(0)},
				getLowerIterator() { return {constructor: {name: "FakeLeaf"}, value: "i"}; },
				getUpperIterator() { return {constructor: {name: "FakeLeaf"}, value: "n"}; },
				getBase() { return {constructor: {name: "FakeLeaf"}, value: "x"}; }
			}, {
				mode: AscMath.c_oAscLaTeXExportMode.Strict,
				validation: sumValidation
			});
		}
		finally
		{
			window.Get_WordDocumentDefaultMathSettings = previousMathSettingsGetter;
		}

		assert.strictEqual(integralOutput, "\\int\\limits_{0}^{1}x", "integral uses intLim");
		assert.ok(integralValidation.implementedProperties.includes("MathPr.intLim"), "intLim surfaced when applied");
		assert.strictEqual(sumOutput, "\\sum\\nolimits_{i}^{n}x", "non-integral uses naryLim");
		assert.ok(sumValidation.implementedProperties.includes("MathPr.naryLim"), "naryLim surfaced when applied");
	});

	QUnit.test("strict export honors visible phantom content", function (assert) {
		let validation = AscMath.CreateLaTeXExportValidation();

		AscMath.SetLaTeXExportMode(AscMath.c_oAscLaTeXExportMode.Strict);
		AscMath.RegisterLaTeXExportNode("FakeLeaf", function (node) {
			return node.value
				? [AscMath.CreateLaTeXExportToken(AscMath.LaTeXExportTokenKinds.Identifier, node.value)]
				: [];
		});

		assert.strictEqual(
			AscMath.ExportToLaTeX({
				constructor: {name: "CPhantom"},
				Pr: {
					show: true
				},
				getBase: function () {
					return {constructor: {name: "FakeLeaf"}, value: "x"};
				}
			}, {
				mode: AscMath.c_oAscLaTeXExportMode.Strict,
				validation: validation
			}),
			"x"
		);
		assert.ok(validation.implementedProperties.includes("CPhantom.show"), "show surfaced as implemented");
	});

	QUnit.test("strict export classifies non-empty ctrlPr rows explicitly", function (assert) {
		let ctrlPr = {
			Is_Empty: function () {
				return false;
			}
		};
		let emptyCtrlPr = {
			Is_Empty: function () {
				return true;
			}
		};
		let cases;

		AscMath.SetLaTeXExportMode(AscMath.c_oAscLaTeXExportMode.Strict);
		AscMath.RegisterLaTeXExportNode("FakeLeaf", function (node) {
			return node.value
				? [AscMath.CreateLaTeXExportToken(AscMath.LaTeXExportTokenKinds.Identifier, node.value)]
				: [];
		});

		cases = [
			{
				label: "CFraction.ctrlPr",
				node: {
					constructor: {name: "CFraction"},
					Pr: {type: 1, GetRPr: function () { return ctrlPr; }},
					getNumerator: function () { return {constructor: {name: "FakeLeaf"}, value: "a"}; },
					getDenominator: function () { return {constructor: {name: "FakeLeaf"}, value: "b"}; }
				}
			},
			{
				label: "CDegree.ctrlPr",
				node: {
					constructor: {name: "CDegree"},
					Pr: {type: 1, GetRPr: function () { return ctrlPr; }},
					getBase: function () { return {constructor: {name: "FakeLeaf"}, value: "x"}; },
					getIterator: function () { return {constructor: {name: "FakeLeaf"}, value: "2"}; }
				}
			},
			{
				label: "CDegreeSubSup.ctrlPr",
				node: {
					constructor: {name: "CDegreeSubSup"},
					Pr: {type: 1, GetRPr: function () { return ctrlPr; }},
					getBase: function () { return {constructor: {name: "FakeLeaf"}, value: "x"}; },
					getLowerIterator: function () { return {constructor: {name: "FakeLeaf"}, value: "i"}; },
					getUpperIterator: function () { return {constructor: {name: "FakeLeaf"}, value: "n"}; }
				}
			},
			{
				label: "CRadical.ctrlPr",
				node: {
					constructor: {name: "CRadical"},
					Pr: {type: 1, GetRPr: function () { return ctrlPr; }},
					getDegree: function () { return {constructor: {name: "FakeLeaf"}, value: "3"}; },
					getBase: function () { return {constructor: {name: "FakeLeaf"}, value: "x"}; }
				}
			},
			{
				label: "CAccent.ctrlPr",
				node: {
					constructor: {name: "CAccent"},
					Pr: {chr: 769, GetRPr: function () { return ctrlPr; }},
					getBase: function () { return {constructor: {name: "FakeLeaf"}, value: "x"}; }
				}
			},
			{
				label: "CBorderBox.ctrlPr",
				node: {
					constructor: {name: "CBorderBox"},
					Pr: {GetRPr: function () { return ctrlPr; }},
					getBase: function () { return {constructor: {name: "FakeLeaf"}, value: "x"}; }
				}
			},
			{
				label: "CBox.ctrlPr",
				node: {
					constructor: {name: "CBox"},
					Pr: {GetRPr: function () { return ctrlPr; }},
					getBase: function () { return {constructor: {name: "FakeLeaf"}, value: "x"}; }
				}
			},
			{
				label: "CBar.ctrlPr",
				node: {
					constructor: {name: "CBar"},
					Pr: {pos: 0, GetRPr: function () { return ctrlPr; }},
					getBase: function () { return {constructor: {name: "FakeLeaf"}, value: "x"}; }
				}
			},
			{
				label: "CPhantom.ctrlPr",
				node: {
					constructor: {name: "CPhantom"},
					Pr: {GetRPr: function () { return ctrlPr; }},
					getBase: function () { return {constructor: {name: "FakeLeaf"}, value: "x"}; }
				}
			},
			{
				label: "CDelimiter.ctrlPr",
				node: {
					constructor: {name: "CDelimiter"},
					Pr: {
						begChr: "(".codePointAt(0),
						endChr: ")".codePointAt(0),
						GetRPr: function () { return ctrlPr; }
					},
					begOper: {code: "(".codePointAt(0)},
					endOper: {code: ")".codePointAt(0)},
					getColumnsCount: function () { return 1; },
					Content: [{constructor: {name: "FakeLeaf"}, value: "x"}]
				}
			},
			{
				label: "CLimit.ctrlPr",
				node: {
					constructor: {name: "CLimit"},
					Pr: {type: LIMIT_LOW, GetRPr: function () { return ctrlPr; }},
					getFName: function () { return {constructor: {name: "FakeLeaf"}, value: "l"}; },
					getIterator: function () { return {constructor: {name: "FakeLeaf"}, value: "0"}; }
				}
			},
			{
				label: "CMathFunc.ctrlPr",
				node: {
					constructor: {name: "CMathFunc"},
					Pr: {GetRPr: function () { return ctrlPr; }},
					getFName: function () { return {constructor: {name: "FakeLeaf"}, value: "f"}; },
					getArgument: function () { return {constructor: {name: "FakeLeaf"}, value: "x"}; }
				}
			},
			{
				label: "CNary.ctrlPr",
				node: {
					constructor: {name: "CNary"},
					Pr: {chr: "∑".charCodeAt(0), limLoc: NARY_UndOvr, GetRPr: function () { return ctrlPr; }},
					getLowerIterator: function () { return {constructor: {name: "FakeLeaf"}, value: "i"}; },
					getUpperIterator: function () { return {constructor: {name: "FakeLeaf"}, value: "n"}; },
					getBase: function () { return {constructor: {name: "FakeLeaf"}, value: "x"}; }
				}
			},
			{
				label: "CMathMatrix.ctrlPr",
				node: {
					constructor: {name: "CMathMatrix"},
					Pr: {GetRPr: function () { return ctrlPr; }},
					getRowsCount: function () { return 1; },
					getColsCount: function () { return 1; },
					getContentElement: function () { return {constructor: {name: "FakeLeaf"}, value: "x"}; }
				}
			},
			{
				label: "CEqArray.ctrlPr",
				node: {
					constructor: {name: "CEqArray"},
					Pr: {row: 1, GetRPr: function () { return ctrlPr; }},
					getElement: function () { return {constructor: {name: "FakeLeaf"}, value: "x"}; }
				}
			},
			{
				label: "CGroupCharacter.ctrlPr",
				node: {
					constructor: {name: "CGroupCharacter"},
					Pr: {chr: "⏞".codePointAt(0), pos: 1, GetRPr: function () { return ctrlPr; }},
					getBase: function () { return {constructor: {name: "FakeLeaf"}, value: "x"}; }
				}
			}
		];

		cases.forEach(function (testCase) {
			let validation = AscMath.CreateLaTeXExportValidation();

			AscMath.ExportToLaTeX(testCase.node, {
				mode: AscMath.c_oAscLaTeXExportMode.Strict,
				validation: validation
			});
			assert.ok(validation.droppedProperties.includes(testCase.label), testCase.label + " surfaced");
		});

		let emptyValidation = AscMath.CreateLaTeXExportValidation();
		AscMath.ExportToLaTeX({
			constructor: {name: "CAccent"},
			Pr: {chr: 769, GetRPr: function () { return emptyCtrlPr; }},
			getBase: function () { return {constructor: {name: "FakeLeaf"}, value: "x"}; }
		}, {
			mode: AscMath.c_oAscLaTeXExportMode.Strict,
			validation: emptyValidation
		});
		assert.notOk(emptyValidation.droppedProperties.includes("CAccent.ctrlPr"), "empty ctrlPr is ignored");
	});

	QUnit.test("strict export transparently unwraps schema-legal wrapper content", function (assert) {
		AscMath.SetLaTeXExportMode(AscMath.c_oAscLaTeXExportMode.Strict);
		AscMath.RegisterLaTeXExportNode("FakeLeaf", function (node) {
			return node.value
				? [AscMath.CreateLaTeXExportToken(AscMath.LaTeXExportTokenKinds.Identifier, node.value)]
				: [];
		});

		assert.strictEqual(
			AscMath.ExportToLaTeX({
				constructor: {name: "ParaHyperlink"},
				Content: [
					{constructor: {name: "FakeLeaf"}, value: "x"},
					{constructor: {name: "FakeLeaf"}, value: "y"}
				]
			}, {
				mode: AscMath.c_oAscLaTeXExportMode.Strict
			}),
			"xy"
		);

		assert.strictEqual(
			AscMath.ExportToLaTeX({
				constructor: {name: "ParaField"},
				Content: [{constructor: {name: "FakeLeaf"}, value: "f"}]
			}, {
				mode: AscMath.c_oAscLaTeXExportMode.Strict
			}),
			"f"
		);

		assert.strictEqual(
			AscMath.ExportToLaTeX({
				constructor: {name: "CInlineLevelSdt"},
				Content: [{constructor: {name: "FakeLeaf"}, value: "s"}]
			}, {
				mode: AscMath.c_oAscLaTeXExportMode.Strict
			}),
			"s"
		);

		assert.strictEqual(
			AscMath.ExportToLaTeX({
				constructor: {name: "CBlockLevelSdt"},
				GetContent: function () {
					return {
						Content: [{constructor: {name: "FakeLeaf"}, value: "b"}]
					};
				}
			}, {
				mode: AscMath.c_oAscLaTeXExportMode.Strict
			}),
			"b"
		);
	});
});
