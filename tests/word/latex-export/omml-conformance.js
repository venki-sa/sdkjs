$(function () {
	function ResetStrictState()
	{
		AscMath.SetLaTeXExportMode(AscMath.c_oAscLaTeXExportMode.Legacy);
		AscMath.SetLaTeXExportFallbackPolicy(AscMath.c_oAscLaTeXExportFallbackPolicy.Legacy);
		AscMath.ResetLaTeXExportRegistry();
	}

	QUnit.module("OMML Conformance", {
		beforeEach: function () {
			ResetStrictState();
		},
		afterEach: function () {
			ResetStrictState();
		}
	});

	QUnit.test("document default limit placement is honored for valid n-ary OMML", function (assert) {
		let previousMathSettingsGetter = window.Get_WordDocumentDefaultMathSettings;
		let integralValidation = AscMath.CreateLaTeXExportValidation();
		let sumValidation = AscMath.CreateLaTeXExportValidation();
		let K = AscMath.LaTeXExportTokenKinds;

		AscMath.SetLaTeXExportMode(AscMath.c_oAscLaTeXExportMode.Strict);
		AscMath.RegisterLaTeXExportNode("FakeLeaf", function (node) {
			return node.value ? [AscMath.CreateLaTeXExportToken(K.Identifier, node.value)] : [];
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
			assert.strictEqual(
				AscMath.ExportToLaTeX({
					constructor: {name: "CNary"},
					Pr: {chr: "∫".charCodeAt(0)},
					getLowerIterator: function () { return {constructor: {name: "FakeLeaf"}, value: "0"}; },
					getUpperIterator: function () { return {constructor: {name: "FakeLeaf"}, value: "1"}; },
					getBase: function () { return {constructor: {name: "FakeLeaf"}, value: "x"}; }
				}, {
					mode: AscMath.c_oAscLaTeXExportMode.Strict,
					validation: integralValidation
				}),
				"\\int\\limits_{0}^{1}x"
			);

			assert.strictEqual(
				AscMath.ExportToLaTeX({
					constructor: {name: "CNary"},
					Pr: {chr: "∑".charCodeAt(0)},
					getLowerIterator: function () { return {constructor: {name: "FakeLeaf"}, value: "i"}; },
					getUpperIterator: function () { return {constructor: {name: "FakeLeaf"}, value: "n"}; },
					getBase: function () { return {constructor: {name: "FakeLeaf"}, value: "x"}; }
				}, {
					mode: AscMath.c_oAscLaTeXExportMode.Strict,
					validation: sumValidation
				}),
				"\\sum\\nolimits_{i}^{n}x"
			);
		}
		finally
		{
			window.Get_WordDocumentDefaultMathSettings = previousMathSettingsGetter;
		}

		assert.ok(integralValidation.implementedProperties.includes("MathPr.intLim"), "integral default surfaced");
		assert.ok(sumValidation.implementedProperties.includes("MathPr.naryLim"), "n-ary default surfaced");
	});

	QUnit.test("schema-legal wrappers are transparent to strict math export", function (assert) {
		let K = AscMath.LaTeXExportTokenKinds;

		AscMath.SetLaTeXExportMode(AscMath.c_oAscLaTeXExportMode.Strict);
		AscMath.RegisterLaTeXExportNode("FakeLeaf", function (node) {
			return node.value ? [AscMath.CreateLaTeXExportToken(K.Identifier, node.value)] : [];
		});

		assert.strictEqual(
			AscMath.ExportToLaTeX({
				constructor: {name: "ParaHyperlink"},
				Content: [{constructor: {name: "FakeLeaf"}, value: "x"}]
			}, {
				mode: AscMath.c_oAscLaTeXExportMode.Strict
			}),
			"x"
		);

		assert.strictEqual(
			AscMath.ExportToLaTeX({
				constructor: {name: "FldSimple"},
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
	});
});
