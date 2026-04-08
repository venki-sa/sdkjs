/*
 * (c) Copyright Ascensio System SIA 2010-2024
 *
 * This program is a free software product. You can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License (AGPL)
 * version 3 as published by the Free Software Foundation. In accordance with
 * Section 7(a) of the GNU AGPL its Section 15 shall be amended to the effect
 * that Ascensio System SIA expressly excludes the warranty of non-infringement
 * of any third-party rights.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR  PURPOSE. For
 * details, see the GNU AGPL at: http://www.gnu.org/licenses/agpl-3.0.html
 *
 * You can contact Ascensio System SIA at 20A-6 Ernesta Birznieka-Upish
 * street, Riga, Latvia, EU, LV-1050.
 *
 * The  interactive user interfaces in modified source and object code versions
 * of the Program must display Appropriate Legal Notices, as required under
 * Section 5 of the GNU AGPL version 3.
 *
 * Pursuant to Section 7(b) of the License you must retain the original Product
 * logo when distributing the program. Pursuant to Section 7(e) we decline to
 * grant you any rights under trademark law for use of our trademarks.
 *
 * All the Product's GUI elements, including illustrations and icon sets, as
 * well as technical writing content are licensed under the terms of the
 * Creative Commons Attribution-ShareAlike 4.0 International. See the License
 * terms at http://creativecommons.org/licenses/by-sa/4.0/legalcode
 *
 */

"use strict";

(function (window) {
	const AscMath = window["AscMath"] = window["AscMath"] || {};
	const K = AscMath.LaTeXExportTokenKinds;
	const token = AscMath.CreateLaTeXExportToken;

	function RegisterNode(name, exporter, aliases)
	{
		AscMath.RegisterLaTeXExportNode(name, exporter, aliases || []);
	}

	function PushValidationEntry(collection, value)
	{
		if (!collection || !value || collection.indexOf(value) !== -1)
			return;

		collection.push(value);
	}

	function HasPackageFeature(context, featureName)
	{
		return !!(context
			&& context.packageFeatures
			&& context.packageFeatures[featureName]);
	}

	function RequirePackage(context, packageName)
	{
		if (context && context.validation)
			PushValidationEntry(context.validation.requiredPackages, packageName);
	}

	const NeutralMathFontNames = {
		"cambria math": true,
	};

	function GetRFontName(fontEntry)
	{
		if (!fontEntry)
			return "";

		if (typeof fontEntry === "string")
			return fontEntry;

		if (fontEntry.Name)
			return fontEntry.Name;

		return "";
	}

	function IsNeutralMathFontName(name)
	{
		return !!NeutralMathFontNames[String(name || "").trim().toLowerCase()];
	}

	function HasOnlyNeutralMathFonts(rFonts)
	{
		let keys = ["Ascii", "HAnsi", "CS", "EastAsia"];
		let sawExplicitFont = false;
		let index;
		let name;

		if (!rFonts)
			return false;

		for (index = 0; index < keys.length; index += 1)
		{
			name = GetRFontName(rFonts[keys[index]]);
			if (!name)
				continue;

			sawExplicitFont = true;
			if (!IsNeutralMathFontName(name))
				return false;
		}

		return sawExplicitFont;
	}

	function GetPrimaryRFontName(rFonts)
	{
		let keys = ["Ascii", "HAnsi", "CS", "EastAsia"];
		let index;
		let name;

		if (!rFonts)
			return "";

		for (index = 0; index < keys.length; index += 1)
		{
			name = GetRFontName(rFonts[keys[index]]);
			if (name)
				return name;
		}

		return "";
	}

	function GetRFontWrapperFromName(name)
	{
		let normalized = String(name || "").trim().toLowerCase();

		if (!normalized || IsNeutralMathFontName(normalized))
			return [];

		if (/(courier|consolas|monaco|menlo|source code|code|mono|inconsolata)/.test(normalized))
			return ["\\mathtt"];

		if (/(arial|helvetica|calibri|verdana|tahoma|aptos|sans)/.test(normalized))
			return ["\\mathsf"];

		if (/(times|georgia|garamond|baskerville|palatino|book antiqua|serif|cambria)/.test(normalized))
			return ["\\mathrm"];

		return null;
	}

	function GetRunRFontWrappers(node, context)
	{
		let pr = node && typeof node.Get_CompiledPr === "function"
			? node.Get_CompiledPr(false)
			: (node ? node.Pr : null);
		let fontName;
		let wrappers;

		if (!pr || !pr.RFonts || HasOnlyNeutralMathFonts(pr.RFonts))
			return [];

		fontName = GetPrimaryRFontName(pr.RFonts);
		wrappers = GetRFontWrapperFromName(fontName);
		if (!wrappers)
			return [];

		if (context && context.validation)
			PushValidationEntry(context.validation.approximatedProperties, "ParaRun.TextPr.RFonts");

		return wrappers;
	}

	function GetRunRStyleWrappers(node, context)
	{
		let pr = node && typeof node.Get_CompiledPr === "function"
			? node.Get_CompiledPr(false)
			: (node ? node.Pr : null);
		let styleName = pr && pr.RStyle ? String(pr.RStyle).trim().toLowerCase() : "";

		if (!styleName)
			return [];

		if (/(strong|bold|intense|emphasisbold)/.test(styleName))
		{
			if (context && context.validation)
				PushValidationEntry(context.validation.approximatedProperties, "ParaRun.TextPr.RStyle");
			return ["\\mathbf"];
		}

		if (/(emphasis|italic|quote)/.test(styleName))
		{
			if (context && context.validation)
				PushValidationEntry(context.validation.approximatedProperties, "ParaRun.TextPr.RStyle");
			return ["\\mathit"];
		}

		if (/(code|mono|console|tt)/.test(styleName))
		{
			if (context && context.validation)
				PushValidationEntry(context.validation.approximatedProperties, "ParaRun.TextPr.RStyle");
			return ["\\mathtt"];
		}

		return [];
	}

	function NormalizeColorByte(value)
	{
		let numeric = Number(value);
		if (!isFinite(numeric))
			return null;

		numeric = Math.max(0, Math.min(255, Math.round(numeric)));
		return numeric;
	}

	function ResolveRGBColor(colorValue)
	{
		let r;
		let g;
		let b;
		let match;

		if (!colorValue)
			return null;

		if (typeof colorValue === "string")
		{
			match = colorValue.match(/^#?([0-9a-f]{6})$/i);
			if (match)
			{
				return {
					r: parseInt(match[1].slice(0, 2), 16),
					g: parseInt(match[1].slice(2, 4), 16),
					b: parseInt(match[1].slice(4, 6), 16),
				};
			}
			return null;
		}

		r = NormalizeColorByte(colorValue.r !== undefined ? colorValue.r : colorValue.R);
		g = NormalizeColorByte(colorValue.g !== undefined ? colorValue.g : colorValue.G);
		b = NormalizeColorByte(colorValue.b !== undefined ? colorValue.b : colorValue.B);

		if (r === null || g === null || b === null)
			return null;

		return {r: r, g: g, b: b};
	}

	function GetRunForegroundColor(pr)
	{
		return ResolveRGBColor(pr && (pr.Color || pr.Unifill || pr.TextFill || pr.TextOutline));
	}

	function GetRunHighlightColor(pr)
	{
		if (!pr)
			return null;

		return ResolveRGBColor(pr.HighLight)
			|| ResolveRGBColor(pr.HighlightColor)
			|| ResolveRGBColor(pr.Shd && pr.Shd.Color)
			|| ResolveRGBColor(pr.Shd && pr.Shd.Unifill);
	}

	function WrapCommandWithRawPrefix(command, rawPrefix, tokens)
	{
		let result = [token(K.Command, command)];

		if (rawPrefix)
			result.push(token(K.Raw, rawPrefix));

		return result.concat(WrapGroup(tokens));
	}

	function WrapLeftRight(leftDelimiter, rightDelimiter, tokens)
	{
		return [
			token(K.Command, "\\left"),
			token(K.Raw, NormalizeDelimiterSymbol(leftDelimiter, "left")),
		].concat(tokens, [
			token(K.Command, "\\right"),
			token(K.Raw, NormalizeDelimiterSymbol(rightDelimiter, "right")),
		]);
	}

	function WrapColorTokens(command, rgb, tokens)
	{
		if (!rgb)
			return tokens;

		return WrapCommandWithRawPrefix(command, "[RGB]{" + rgb.r + "," + rgb.g + "," + rgb.b + "}", tokens);
	}

	function ApplyRunPackageFormatting(node, tokens, context)
	{
		let pr = node && typeof node.Get_CompiledPr === "function"
			? node.Get_CompiledPr(false)
			: (node ? node.Pr : null);
		let result = tokens;
		let foreground;
		let highlight;

		if (!pr || !context)
			return result;

		if (HasPackageFeature(context, "color"))
		{
			foreground = GetRunForegroundColor(pr);
			if (foreground)
			{
				RequirePackage(context, "xcolor");
				if (context.validation)
					PushValidationEntry(context.validation.implementedProperties, "ParaRun.TextPr.Color");
				result = WrapColorTokens("\\textcolor", foreground, result);
			}
		}

		if (HasPackageFeature(context, "highlight"))
		{
			highlight = GetRunHighlightColor(pr);
			if (highlight)
			{
				RequirePackage(context, "xcolor");
				if (context.validation)
					PushValidationEntry(context.validation.implementedProperties, "ParaRun.TextPr.Highlight");
				result = WrapColorTokens("\\colorbox", highlight, result);
			}
		}

		return result;
	}

	function ExportLeafString(strValue, context)
	{
		let result = [];
		for (const symbol of strValue)
			result = result.concat(AscMath.ExportSymbolToLaTeXTokens(symbol, context));
		return result;
	}

	function GetDocumentMathSettingsProperties()
	{
		let settings;

		if (typeof Get_WordDocumentDefaultMathSettings !== "function")
			return null;

		settings = Get_WordDocumentDefaultMathSettings();
		if (!settings || typeof settings.GetPr !== "function")
			return null;

		return settings.GetPr();
	}

	function HasDefinedValue(value)
	{
		return value !== null && typeof value !== "undefined";
	}

	function TrackCtrlPrProperty(pr, context, propertyName)
	{
		let rPr;

		if (!context || !context.validation || !pr || typeof pr.GetRPr !== "function")
			return;

		rPr = pr.GetRPr();
		if (!rPr)
			return;

		if (typeof rPr.Is_Empty === "function")
		{
			if (!rPr.Is_Empty())
				PushValidationEntry(context.validation.droppedProperties, propertyName);
			return;
		}

		if (typeof rPr.IsEmpty === "function")
		{
			if (!rPr.IsEmpty())
				PushValidationEntry(context.validation.droppedProperties, propertyName);
			return;
		}

		if (Object.keys(rPr).length > 0)
			PushValidationEntry(context.validation.droppedProperties, propertyName);
	}

	function TrackParaMathProperties(node, context)
	{
		let settingsPr;

		if (!context || !context.validation || !node)
			return;

		if (typeof node.Jc !== "undefined")
			PushValidationEntry(context.validation.droppedProperties, "ParaMath.Jc");

		settingsPr = GetDocumentMathSettingsProperties();
		if (!settingsPr)
			return;

		if (HasDefinedValue(settingsPr.mathFont))
			PushValidationEntry(context.validation.droppedProperties, "MathPr.mathFont");
		if (HasDefinedValue(settingsPr.brkBin))
			PushValidationEntry(context.validation.droppedProperties, "MathPr.brkBin");
		if (HasDefinedValue(settingsPr.brkBinSub))
			PushValidationEntry(context.validation.droppedProperties, "MathPr.brkBinSub");
		if (HasDefinedValue(settingsPr.smallFrac))
			PushValidationEntry(context.validation.droppedProperties, "MathPr.smallFrac");
		if (HasDefinedValue(settingsPr.dispDef))
			PushValidationEntry(context.validation.droppedProperties, "MathPr.dispDef");
		if (HasDefinedValue(settingsPr.lMargin))
			PushValidationEntry(context.validation.droppedProperties, "MathPr.lMargin");
		if (HasDefinedValue(settingsPr.rMargin))
			PushValidationEntry(context.validation.droppedProperties, "MathPr.rMargin");
		if (HasDefinedValue(settingsPr.defJc))
			PushValidationEntry(context.validation.droppedProperties, "MathPr.defJc");
		if (HasDefinedValue(settingsPr.preSp))
			PushValidationEntry(context.validation.droppedProperties, "MathPr.preSp");
		if (HasDefinedValue(settingsPr.postSp))
			PushValidationEntry(context.validation.droppedProperties, "MathPr.postSp");
		if (HasDefinedValue(settingsPr.interSp))
			PushValidationEntry(context.validation.droppedProperties, "MathPr.interSp");
		if (HasDefinedValue(settingsPr.intraSp))
			PushValidationEntry(context.validation.droppedProperties, "MathPr.intraSp");
		if (HasDefinedValue(settingsPr.wrapIndent))
			PushValidationEntry(context.validation.droppedProperties, "MathPr.wrapIndent");
		if (HasDefinedValue(settingsPr.wrapRight))
			PushValidationEntry(context.validation.droppedProperties, "MathPr.wrapRight");
	}

	function ExportParaMath(node, context)
	{
		TrackParaMathProperties(node, context);
		return AscMath.ExportNodeToLaTeXTokens(node.Root, context);
	}

	function TrackMathContentProperties(node, context)
	{
		let argSize = null;

		if (!context || !context.validation || !node)
			return;

		if (typeof node.GetArgSize === "function")
			argSize = node.GetArgSize();
		else if (node.ArgSize && typeof node.ArgSize.GetValue === "function")
			argSize = node.ArgSize.GetValue();
		else if (node.ArgSize && typeof node.ArgSize.value !== "undefined")
			argSize = node.ArgSize.value;

		if (argSize !== null && typeof argSize !== "undefined" && Number(argSize) !== 0)
			PushValidationEntry(context.validation.approximatedProperties, "CMathContent.argSz");
	}

	function ExportMathContent(node, context)
	{
		let result = [];

		TrackMathContentProperties(node, context);

		for (let index = 0; index < node.Content.length; index++)
			result = result.concat(AscMath.ExportNodeToLaTeXTokens(node.Content[index], context));

		return result;
	}

	function GetNodeChildSequence(node)
	{
		let content;
		let result = [];
		let index;

		if (!node)
			return result;

		if (Array.isArray(node.Content))
			return node.Content;

		if (typeof node.GetContent === "function")
		{
			content = node.GetContent();
			if (Array.isArray(content))
				return content;
			if (content && Array.isArray(content.Content))
				return content.Content;
			if (content && typeof content.GetElementsCount === "function" && typeof content.GetElement === "function")
			{
				for (index = 0; index < content.GetElementsCount(); index += 1)
					result.push(content.GetElement(index));
				return result;
			}
		}

		return result;
	}

	function ExportTransparentContainer(node, context)
	{
		let children = GetNodeChildSequence(node);
		let result = [];
		let index;

		for (index = 0; index < children.length; index += 1)
			result = result.concat(AscMath.ExportNodeToLaTeXTokens(children[index], context));

		return result;
	}

	function ExportMathTextNode(node, context)
	{
		if (!node.value || node.value === 11034)
			return [];

		return ExportLeafString(AscMath.GetLaTeXExportCodePointString(node.value), context);
	}

	function ExportMathAmp(node, context)
	{
		if (node && typeof node.IsAlignPoint === "function" && node.IsAlignPoint())
		{
			if (context && context.validation)
				PushValidationEntry(context.validation.implementedProperties, "CMathAmp.alignPoint");
			return [];
		}

		return [token(K.Raw, "&", "math-ampersand")];
	}

	function GetRunMathStyleInfo(node)
	{
		if (node && typeof node.GetCompiled_ScrStyles === "function")
			return node.GetCompiled_ScrStyles();

		if (node && node.MathPrp && typeof node.MathPrp.GetCompiled_ScrStyles === "function")
			return node.MathPrp.GetCompiled_ScrStyles();

		return null;
	}

	function GetRunStyleWrappers(node, context)
	{
		let styleInfo = GetRunMathStyleInfo(node);
		let scr;
		let sty;

		if (node && node.math_autocorrection)
		{
			if (node.math_autocorrection.getIsMathRm && node.math_autocorrection.getIsMathRm())
				return ["\\mathrm"];
			if (node.math_autocorrection.getIsText && node.math_autocorrection.getIsText())
				return ["\\text"];
		}

		if (!styleInfo)
			return [];

		scr = styleInfo.scr;
		sty = styleInfo.sty;

		if (styleInfo.nor === true)
		{
			if (context && context.validation)
				PushValidationEntry(context.validation.approximatedProperties, "ParaRun.MathPrp.nor");
			return ["\\mathrm"];
		}

		if (node && node.MathPrp && node.MathPrp.lit === true)
		{
			if (context && context.validation)
				PushValidationEntry(context.validation.approximatedProperties, "ParaRun.MathPrp.lit");
			return ["\\mathrm"];
		}

		if (node && node.MathPrp && typeof node.MathPrp.aln !== "undefined" && context && context.validation)
			PushValidationEntry(context.validation.approximatedProperties, "ParaRun.MathPrp.aln");
		if (node && node.MathPrp && typeof node.MathPrp.brk !== "undefined" && context && context.validation)
			PushValidationEntry(context.validation.droppedProperties, "ParaRun.MathPrp.brk");

		if (typeof TXT_ROMAN !== "undefined" && scr === TXT_ROMAN)
		{
			if (typeof STY_BOLD !== "undefined" && sty === STY_BOLD)
				return ["\\mathbf"];
			if (typeof STY_BI !== "undefined" && sty === STY_BI)
				return ["\\mathbf", "\\mathit"];
			if (typeof STY_PLAIN !== "undefined" && sty === STY_PLAIN)
				return ["\\mathrm"];
			return [];
		}

		if (typeof TXT_SCRIPT !== "undefined" && scr === TXT_SCRIPT)
		{
			if ((typeof STY_BOLD !== "undefined" && sty === STY_BOLD) || (typeof STY_BI !== "undefined" && sty === STY_BI))
				return ["\\mathbf", "\\mathcal"];
			return ["\\mathcal"];
		}

		if (typeof TXT_FRAKTUR !== "undefined" && scr === TXT_FRAKTUR)
		{
			if ((typeof STY_BOLD !== "undefined" && sty === STY_BOLD) || (typeof STY_BI !== "undefined" && sty === STY_BI))
				return ["\\mathbf", "\\mathfrak"];
			return ["\\mathfrak"];
		}

		if (typeof TXT_DOUBLE_STRUCK !== "undefined" && scr === TXT_DOUBLE_STRUCK)
			return ["\\mathbb"];

		if (typeof TXT_SANS_SERIF !== "undefined" && scr === TXT_SANS_SERIF)
		{
			if (typeof STY_BI !== "undefined" && sty === STY_BI)
				return ["\\mathsf", "\\mathbf", "\\mathit"];
			if (typeof STY_BOLD !== "undefined" && sty === STY_BOLD)
				return ["\\mathsf", "\\mathbf"];
			if (typeof STY_ITALIC !== "undefined" && sty === STY_ITALIC)
				return ["\\mathsf", "\\mathit"];
			return ["\\mathsf"];
		}

		if (typeof TXT_MONOSPACE !== "undefined" && scr === TXT_MONOSPACE)
			return ["\\mathtt"];

		return [];
	}

	function RecordRunTextPropertyFidelity(node, context)
	{
		let pr = node && typeof node.Get_CompiledPr === "function"
			? node.Get_CompiledPr(false)
			: (node ? node.Pr : null);

		if (!pr || !context || !context.validation)
			return;

		if (pr.Bold === true || pr.BoldCS === true)
			PushValidationEntry(context.validation.approximatedProperties, "ParaRun.TextPr.Bold");

		if (pr.Italic === true || pr.ItalicCS === true)
			PushValidationEntry(context.validation.approximatedProperties, "ParaRun.TextPr.Italic");

		if (pr.RStyle && GetRunRStyleWrappers(node, context).length === 0)
			PushValidationEntry(context.validation.droppedProperties, "ParaRun.TextPr.RStyle");

		if ((pr.Color || pr.Unifill || pr.TextFill || pr.TextOutline) && !GetRunForegroundColor(pr))
			PushValidationEntry(context.validation.droppedProperties, "ParaRun.TextPr.Color");
		else if ((pr.Color || pr.Unifill || pr.TextFill || pr.TextOutline) && !HasPackageFeature(context, "color"))
			PushValidationEntry(context.validation.droppedProperties, "ParaRun.TextPr.Color");

		if ((pr.HighLight || pr.HighlightColor || pr.Shd) && !GetRunHighlightColor(pr))
			PushValidationEntry(context.validation.droppedProperties, "ParaRun.TextPr.Highlight");
		else if ((pr.HighLight || pr.HighlightColor || pr.Shd) && !HasPackageFeature(context, "highlight"))
			PushValidationEntry(context.validation.droppedProperties, "ParaRun.TextPr.Highlight");

		if (pr.VertAlign !== undefined && pr.VertAlign !== null)
			PushValidationEntry(context.validation.droppedProperties, "ParaRun.TextPr.VertAlign");

		if (pr.RFonts
			&& !HasOnlyNeutralMathFonts(pr.RFonts)
			&& (pr.RFonts.Ascii || pr.RFonts.HAnsi || pr.RFonts.CS || pr.RFonts.EastAsia)
			&& !GetRFontWrapperFromName(GetPrimaryRFontName(pr.RFonts)))
		{
			PushValidationEntry(context.validation.droppedProperties, "ParaRun.TextPr.RFonts");
		}
	}

	function ExportParaRun(node, context)
	{
		let result = [];
		let wrappers;

		for (let index = 0; index < node.Content.length; index++)
		{
			let current = node.Content[index];

			if (!current)
				continue;

			if (typeof current.GetCodePoint === "function")
			{
				result = result.concat(ExportLeafString(AscMath.GetLaTeXExportCodePointString(current.GetCodePoint()), context));
				continue;
			}

			if (typeof current.GetTextOfElement === "function")
			{
				let text = current.GetTextOfElement().GetText();
				result = result.concat(ExportLeafString(text, context));
				continue;
			}

			result = result.concat(AscMath.GetFallbackNodeLaTeXTokens(current, context));
		}

		wrappers = GetRunStyleWrappers(node, context);
		if (wrappers.length === 0)
			wrappers = GetRunRStyleWrappers(node, context);
		if (wrappers.length === 0)
			wrappers = GetRunRFontWrappers(node, context);
		RecordRunTextPropertyFidelity(node, context);
		if (wrappers.length > 0 && result.length > 0)
			result = ApplyCommandWrappersToEligibleSpans(wrappers, result);

		return ApplyRunPackageFormatting(node, result, context);
	}

	function WrapGroup(tokens)
	{
		return [token(K.GroupOpen, "{")].concat(tokens, [token(K.GroupClose, "}")]);
	}

	function WrapCommandArgument(command, tokens)
	{
		return [token(K.Command, command)].concat(WrapGroup(tokens));
	}

	function IsVisibleToken(currentToken)
	{
		if (!currentToken)
			return false;

		if (currentToken.kind === K.Invisible || currentToken.kind === K.Space)
			return false;

		return currentToken.value !== "";
	}

	function HasVisibleTokens(tokens)
	{
		if (!Array.isArray(tokens))
			return false;

		for (let index = 0; index < tokens.length; index += 1)
		{
			if (IsVisibleToken(tokens[index]))
				return true;
		}

		return false;
	}

	function WrapMathOperatorWithLimits(operatorTokens, limitTokens, isUpperLimit)
	{
		let result = [token(K.Command, "\\mathop")].concat(WrapGroup(operatorTokens));

		if (HasVisibleTokens(limitTokens))
		{
			result.push(token(K.Command, "\\limits"));
			result.push(isUpperLimit ? token(K.SupOpen, "^{") : token(K.SubOpen, "_{"));
			result = result.concat(limitTokens, [token(K.GroupClose, "}")]);
		}

		return result;
	}

	function IsGroupCharacterArgumentCommand(command)
	{
		return command === "\\overparen"
			|| command === "\\underparen"
			|| command === "\\overbrace"
			|| command === "\\underbrace"
			|| command === "\\overline"
			|| command === "\\underline"
			|| command === "\\underbar"
			|| command === "\\overbar"
			|| command === "\\overshell"
			|| command === "\\undershell"
			|| command === "\\overbracket"
			|| command === "\\underbracket";
	}

	function IsStyleEligibleToken(currentToken)
	{
		if (!currentToken)
			return false;

		return currentToken.kind === K.Identifier
			|| currentToken.kind === K.Number
			|| currentToken.kind === K.Text;
	}

	function ApplyCommandWrappers(commands, tokens)
	{
		let result = tokens;
		let index;

		for (index = 0; index < commands.length; index += 1)
			result = WrapCommandArgument(commands[index], result);

		return result;
	}

	function ApplyCommandWrappersToEligibleSpans(commands, tokens)
	{
		let result = [];
		let span = [];
		let index;
		let currentToken;

		function FlushSpan()
		{
			if (span.length === 0)
				return;

			result = result.concat(ApplyCommandWrappers(commands, span));
			span = [];
		}

		for (index = 0; index < tokens.length; index += 1)
		{
			currentToken = tokens[index];
			if (IsStyleEligibleToken(currentToken))
			{
				span.push(currentToken);
				continue;
			}

			FlushSpan();
			result.push(currentToken);
		}

		FlushSpan();
		return result;
	}

	function AppendScriptTokens(result, kind, iterator)
	{
		if (!iterator || iterator.length === 0)
			return result;

		result.push(kind === "sup" ? token(K.SupOpen, "^{") : token(K.SubOpen, "_{"));
		return result.concat(iterator, [token(K.GroupClose, "}")]);
	}

	function ExportFraction(node, context)
	{
		let numerator = AscMath.ExportNodeToLaTeXTokens(node.getNumerator(), context);
		let denominator = AscMath.ExportNodeToLaTeXTokens(node.getDenominator(), context);
		let command = "\\frac";

		TrackCtrlPrProperty(node.Pr, context, "CFraction.ctrlPr");

		if (typeof NO_BAR_FRACTION !== "undefined" && node.Pr.type === NO_BAR_FRACTION)
			command = "\\binom";
		else if (typeof BAR_FRACTION !== "undefined" && node.Pr.type === BAR_FRACTION)
			command = "\\frac";
		else if (typeof SKEWED_FRACTION !== "undefined" && node.Pr.type === SKEWED_FRACTION)
		{
			command = "\\frac";
			if (context && context.validation)
				PushValidationEntry(context.validation.approximatedProperties, "CFraction.skewed");
		}
		else if (typeof LINEAR_FRACTION !== "undefined" && node.Pr.type === LINEAR_FRACTION)
		{
			command = "\\frac";
			if (context && context.validation)
				PushValidationEntry(context.validation.approximatedProperties, "CFraction.linear");
		}

		return [token(K.Command, command)].concat(WrapGroup(numerator), WrapGroup(denominator));
	}

	function ExportDegree(node, context)
	{
		TrackCtrlPrProperty(node.Pr, context, "CDegree.ctrlPr");
		let base = AscMath.ExportNodeToLaTeXTokens(node.getBase(), context);
		let iterator = AscMath.ExportNodeToLaTeXTokens(node.getIterator(), context);
		let scriptOpen = node.Pr.type === 1 ? token(K.SupOpen, "^{") : token(K.SubOpen, "_{");

		return base.concat([scriptOpen], iterator, [token(K.GroupClose, "}")]);
	}

	function ExportDegreeSubSup(node, context)
	{
		TrackCtrlPrProperty(node.Pr, context, "CDegreeSubSup.ctrlPr");
		if (node.Pr && node.Pr.alnScr && context && context.validation)
			PushValidationEntry(context.validation.approximatedProperties, "CDegreeSubSup.alnScr");

		if (node.Pr.type === -1)
		{
			let base = AscMath.ExportNodeToLaTeXTokens(node.getBase(), context);
			let lower = AscMath.ExportNodeToLaTeXTokens(node.getLowerIterator(), context);
			let upper = AscMath.ExportNodeToLaTeXTokens(node.getUpperIterator(), context);
			let result = WrapGroup([]);

			if (HasVisibleTokens(lower))
				result = result.concat([token(K.SubOpen, "_{")], lower, [token(K.GroupClose, "}")]);

			if (HasVisibleTokens(upper))
				result = result.concat([token(K.SupOpen, "^{")], upper, [token(K.GroupClose, "}")]);

			return result.concat(base);
		}

		let base = AscMath.ExportNodeToLaTeXTokens(node.getBase(), context);
		let lower = AscMath.ExportNodeToLaTeXTokens(node.getLowerIterator(), context);
		let upper = AscMath.ExportNodeToLaTeXTokens(node.getUpperIterator(), context);

		return base.concat(
			[token(K.SubOpen, "_{")],
			lower,
			[token(K.GroupClose, "}")],
			[token(K.SupOpen, "^{")],
			upper,
			[token(K.GroupClose, "}")]
		);
	}

	function ExportRadical(node, context)
	{
		TrackCtrlPrProperty(node.Pr, context, "CRadical.ctrlPr");
		let degree = [];
		let base = AscMath.ExportNodeToLaTeXTokens(node.getBase(), context);
		let result = [token(K.Command, "\\sqrt")];
		let isSquareRadical = typeof SQUARE_RADICAL !== "undefined" && node.Pr && node.Pr.type === SQUARE_RADICAL;

		if (!(node.Pr && (node.Pr.degHide || isSquareRadical)))
			degree = AscMath.ExportNodeToLaTeXTokens(node.getDegree(), context);
		else if (context && context.validation)
			PushValidationEntry(context.validation.approximatedProperties, "CRadical.degHide");

		if (degree.length > 0)
			result = result.concat([token(K.Raw, "[")], degree, [token(K.Raw, "]")]);

		return result.concat(WrapGroup(base));
	}

	function NormalizeDelimiterSymbol(symbol, side)
	{
		if (symbol === "{")
			return "\\{";
		if (symbol === "}")
			return "\\}";
		if (symbol === "")
			return ".";

		if (AscMath.MathLiterals)
		{
			if (side === "left"
				&& AscMath.MathLiterals.lBrackets
				&& !AscMath.MathLiterals.lBrackets.IsSimple(symbol))
			{
				return AscMath.MathLiterals.lBrackets.GetLaTeXWordFromSymbol(symbol) || symbol;
			}

			if (side === "right"
				&& AscMath.MathLiterals.rBrackets
				&& !AscMath.MathLiterals.rBrackets.IsSimple(symbol))
			{
				return AscMath.MathLiterals.rBrackets.GetLaTeXWordFromSymbol(symbol) || symbol;
			}
		}

		return symbol;
	}

	function ExportDelimiter(node, context)
	{
		let start = node.Pr.begChr === -1 ? "" : String.fromCharCode((node.begOper.code || node.Pr.begChr) || 40);
		let end = node.Pr.endChr === -1 ? "" : String.fromCharCode((node.endOper.code || node.Pr.endChr) || 41);
		let contentCount = node.getColumnsCount();
		let result = [
			token(K.Command, "\\left"),
			token(K.Raw, NormalizeDelimiterSymbol(start, "left")),
		];

		TrackCtrlPrProperty(node.Pr, context, "CDelimiter.ctrlPr");

		for (let i = 0; i < contentCount; i++)
		{
			result = result.concat(AscMath.ExportNodeToLaTeXTokens(node.Content[i], context));

			if (contentCount > 1 && i < contentCount - 1)
				result.push(token(K.Command, "\\mid"));
		}

		if (context && context.validation && node.Pr)
		{
			if (HasDefinedValue(node.Pr.grow))
				PushValidationEntry(context.validation.approximatedProperties, "CDelimiter.grow");
			if (HasDefinedValue(node.Pr.shp))
				PushValidationEntry(context.validation.approximatedProperties, "CDelimiter.shp");
		}

		result.push(token(K.Command, "\\right"));
		result.push(token(K.Raw, NormalizeDelimiterSymbol(end, "right")));
		return result;
	}

	function ResolveDefaultNaryLimitLocation(node)
	{
		let settingsPr = GetDocumentMathSettingsProperties();
		let chr = node && node.Pr ? node.Pr.chr : undefined;
		let isIntegral = (chr > 0x222A && chr < 0x2231) || chr === null || typeof chr === "undefined";

		if (!settingsPr)
			return null;

		return isIntegral ? settingsPr.intLim : settingsPr.naryLim;
	}

	function ExportLimit(node, context)
	{
		TrackCtrlPrProperty(node.Pr, context, "CLimit.ctrlPr");
		let funcName = AscMath.ExportNodeToLaTeXTokens(node.getFName(), context);
		let iterator = AscMath.ExportNodeToLaTeXTokens(node.getIterator(), context);
		let needsMathOpWrapper = true;
		let index;
		let scriptOpen;

		for (index = 0; index < funcName.length; index += 1)
		{
			if (funcName[index].kind === K.Command)
			{
				needsMathOpWrapper = false;
				break;
			}
		}

		if (needsMathOpWrapper)
			funcName = WrapCommandArgument("\\mathop", funcName);

		scriptOpen = node.Pr && node.Pr.type === LIMIT_UP
			? token(K.SupOpen, "^{")
			: token(K.SubOpen, "_{");

		return funcName.concat([
			token(K.Command, "\\limits"),
			scriptOpen,
		], iterator, [
			token(K.GroupClose, "}"),
		]);
	}

	function ExportMathFunction(node, context)
	{
		TrackCtrlPrProperty(node.Pr, context, "CMathFunc.ctrlPr");
		let funcNameNode = node.getFName();
		let argumentNode = node.getArgument();
		let funcTokens = AscMath.ExportNodeToLaTeXTokens(funcNameNode, context);
		let argumentTokens = AscMath.ExportNodeToLaTeXTokens(argumentNode, context);
		let rawName = "";
		let index;

		if (funcNameNode && typeof funcNameNode.GetTextOfElement === "function")
			rawName = funcNameNode.GetTextOfElement(true).GetText();

		rawName = rawName.split("_")[0].split("^")[0].split("\\below")[0].split("\\above")[0];
		if (rawName
			&& ((AscMath.functionNames && AscMath.functionNames.includes(rawName))
				|| (AscMath.LimitFunctions && AscMath.LimitFunctions.includes(rawName))))
		{
			for (index = 0; index < funcTokens.length; index += 1)
			{
				if (funcTokens[index].kind === K.Identifier || funcTokens[index].kind === K.Text)
				{
					funcTokens = funcTokens.slice(0, index)
						.concat([token(K.Command, "\\" + rawName, "function:" + rawName)])
						.concat(funcTokens.slice(index + rawName.length));
					break;
				}
			}
		}

		return funcTokens.concat(argumentTokens);
	}

	function ExportNary(node, context)
	{
		let command = "\\int";
		let lower = [];
		let upper = [];
		let base = node.getBase ? AscMath.ExportNodeToLaTeXTokens(node.getBase(), context) : [];
		let limLoc = node.Pr ? node.Pr.limLoc : undefined;
		let unicodeSymbol;
		let result;

		TrackCtrlPrProperty(node.Pr, context, "CNary.ctrlPr");

		if (AscMath.MathLiterals
			&& AscMath.MathLiterals.nary
			&& AscMath.MathLiterals.nary.Unicode
			&& typeof node.Pr.chr !== "undefined")
		{
			unicodeSymbol = String.fromCharCode(node.Pr.chr);
			command = AscMath.MathLiterals.nary.Unicode[unicodeSymbol] || command;
		}

		if (!(node.Pr && node.Pr.subHide) && node.getLowerIterator)
			lower = AscMath.ExportNodeToLaTeXTokens(node.getLowerIterator(), context);
		else if (node.Pr && node.Pr.subHide && context && context.validation)
			PushValidationEntry(context.validation.approximatedProperties, "CNary.subHide");

		if (!(node.Pr && node.Pr.supHide) && node.getUpperIterator)
			upper = AscMath.ExportNodeToLaTeXTokens(node.getUpperIterator(), context);
		else if (node.Pr && node.Pr.supHide && context && context.validation)
			PushValidationEntry(context.validation.approximatedProperties, "CNary.supHide");

		if (!HasDefinedValue(limLoc))
		{
			limLoc = ResolveDefaultNaryLimitLocation(node);
			if (HasDefinedValue(limLoc) && context && context.validation)
			{
				if (command === "\\int")
					PushValidationEntry(context.validation.implementedProperties, "MathPr.intLim");
				else
					PushValidationEntry(context.validation.implementedProperties, "MathPr.naryLim");
			}
		}

		result = [token(K.Command, command)];
		if (limLoc === NARY_UndOvr)
			result.push(token(K.Command, "\\limits"));
		else if (limLoc === NARY_SubSup)
			result.push(token(K.Command, "\\nolimits"));

		if (node.Pr && typeof node.Pr.grow !== "undefined" && context && context.validation)
			PushValidationEntry(context.validation.approximatedProperties, "CNary.grow");

		result = AppendScriptTokens(result, "sub", lower);
		result = AppendScriptTokens(result, "sup", upper);
		return result.concat(base);
	}

	function ResolveAccentCommand(node)
	{
		switch (node.Pr.chr)
		{
			case 768: return "\\grave";
			case 769: return "\\acute";
			case 771: return "\\tilde";
			case 773: return "\\bar";
			case 774: return "\\breve";
			case 775: return "\\dot";
			case 776: return "\\ddot";
			case 780: return "\\check";
			case 831: return "\\bar\\bar";
			case 8400: return "\\overleftarrow";
			case 8401: return "\\overrightarrow";
			case 8406: return "\\overleftarrow";
			case 8407: return "\\vec";
			case 8411: return "\\dddot";
			case 8417: return "\\overleftrightarrow";
			case 0:
			default:
				return "\\hat";
		}
	}

	function ExportAccent(node, context)
	{
		TrackCtrlPrProperty(node.Pr, context, "CAccent.ctrlPr");
		let base = AscMath.ExportNodeToLaTeXTokens(node.getBase(), context);
		let command = ResolveAccentCommand(node);

		if (command === "\\bar\\bar")
			return WrapCommandArgument("\\bar", WrapCommandArgument("\\bar", base));

		return WrapCommandArgument(command, base);
	}

	function ExportBorderBox(node, context)
	{
		TrackCtrlPrProperty(node.Pr, context, "CBorderBox.ctrlPr");
		let base = AscMath.ExportNodeToLaTeXTokens(node.getBase(), context);
		let pr = node.Pr || {};
		let result = base;
		let topVisible = !pr.hideTop;
		let botVisible = !pr.hideBot;
		let leftVisible = !pr.hideLeft;
		let rightVisible = !pr.hideRight;
		let hasEdges = topVisible || botVisible || leftVisible || rightVisible;
		let allEdges = topVisible && botVisible && leftVisible && rightVisible;
		let hasAnyStrike = !!(pr.strikeH || pr.strikeV || pr.strikeTLBR || pr.strikeBLTR);
		let canUseCancel = HasPackageFeature(context, "cancel");

		if (allEdges)
		{
			result = WrapCommandArgument("\\boxed", result);
		}
		else if (topVisible && botVisible && !leftVisible && !rightVisible)
		{
			result = WrapCommandArgument("\\underline", WrapCommandArgument("\\overline", result));
			if (context && context.validation)
				PushValidationEntry(context.validation.approximatedProperties, "CBorderBox.hiddenEdges");
		}
		else if (topVisible && !botVisible && !leftVisible && !rightVisible)
		{
			result = WrapCommandArgument("\\overline", result);
			if (context && context.validation)
				PushValidationEntry(context.validation.approximatedProperties, "CBorderBox.hiddenEdges");
		}
		else if (!topVisible && botVisible && !leftVisible && !rightVisible)
		{
			result = WrapCommandArgument("\\underline", result);
			if (context && context.validation)
				PushValidationEntry(context.validation.approximatedProperties, "CBorderBox.hiddenEdges");
		}
		else if (!topVisible && !botVisible && leftVisible && rightVisible)
		{
			result = WrapLeftRight("|", "|", result);
			if (context && context.validation)
				PushValidationEntry(context.validation.approximatedProperties, "CBorderBox.hiddenEdges");
		}
		else if (hasEdges)
		{
			result = WrapCommandArgument("\\boxed", result);
			if (context && context.validation)
				PushValidationEntry(context.validation.approximatedProperties, "CBorderBox.hiddenEdges");
		}

		if (pr.strikeTLBR && pr.strikeBLTR && canUseCancel)
		{
			RequirePackage(context, "cancel");
			result = WrapCommandArgument("\\xcancel", result);
			if (context && context.validation)
				PushValidationEntry(context.validation.implementedProperties, "CBorderBox.diagonalStrikes");
		}
		else if (pr.strikeTLBR && canUseCancel)
		{
			RequirePackage(context, "cancel");
			result = WrapCommandArgument("\\cancel", result);
			if (context && context.validation)
				PushValidationEntry(context.validation.implementedProperties, "CBorderBox.diagonalStrikes");
		}
		else if (pr.strikeBLTR && canUseCancel)
		{
			RequirePackage(context, "cancel");
			result = WrapCommandArgument("\\bcancel", result);
			if (context && context.validation)
				PushValidationEntry(context.validation.implementedProperties, "CBorderBox.diagonalStrikes");
		}
		else if ((pr.strikeTLBR || pr.strikeBLTR) && context && context.validation)
		{
			PushValidationEntry(context.validation.approximatedProperties, "CBorderBox.diagonalStrikes");
		}

		if ((pr.strikeH || pr.strikeV) && context && context.validation)
		{
			PushValidationEntry(context.validation.approximatedProperties, "CBorderBox.orthogonalStrikes");
			PushValidationEntry(context.validation.approximatedProperties, "CBorderBox.strikes");
		}
		else if (hasAnyStrike && context && context.validation && !pr.strikeTLBR && !pr.strikeBLTR)
			PushValidationEntry(context.validation.approximatedProperties, "CBorderBox.strikes");

		return result;
	}

	function ExportBox(node, context)
	{
		let pr = node.Pr || {};

		TrackCtrlPrProperty(pr, context, "CBox.ctrlPr");

		if (context && context.validation)
		{
			if (pr.opEmu)
				PushValidationEntry(context.validation.approximatedProperties, "CBox.opEmu");
			if (pr.noBreak)
				PushValidationEntry(context.validation.approximatedProperties, "CBox.noBreak");
			if (pr.diff)
				PushValidationEntry(context.validation.approximatedProperties, "CBox.diff");
			if (typeof pr.aln !== "undefined")
				PushValidationEntry(context.validation.approximatedProperties, "CBox.aln");
			if (pr.brk)
				PushValidationEntry(context.validation.approximatedProperties, "CBox.brk");
		}

		return WrapGroup(AscMath.ExportNodeToLaTeXTokens(node.getBase(), context));
	}

	function ExportBar(node, context)
	{
		TrackCtrlPrProperty(node.Pr, context, "CBar.ctrlPr");
		return WrapCommandArgument(node.Pr.pos ? "\\underline" : "\\overline", AscMath.ExportNodeToLaTeXTokens(node.getBase(), context));
	}

	function ExportPhantom(node, context)
	{
		let base = AscMath.ExportNodeToLaTeXTokens(node.getBase(), context);
		let command = "\\phantom";
		let pr = node.Pr || {};
		let zeroHeight = !!(pr.zeroAsc || pr.zeroDesc);

		TrackCtrlPrProperty(pr, context, "CPhantom.ctrlPr");

		if (HasDefinedValue(pr.show))
		{
			if (context && context.validation)
				PushValidationEntry(context.validation.implementedProperties, "CPhantom.show");
			if (pr.show)
				return base;
		}

		if (pr.zeroWid && !zeroHeight)
		{
			command = "\\vphantom";
			if (context && context.validation)
				PushValidationEntry(context.validation.implementedProperties, "CPhantom.zeroWid");
		}
		else if (!pr.zeroWid && zeroHeight)
		{
			command = "\\hphantom";
			if (context && context.validation)
			{
				if (pr.zeroAsc && pr.zeroDesc)
					PushValidationEntry(context.validation.implementedProperties, "CPhantom.zeroAscDesc");
				else
					PushValidationEntry(context.validation.approximatedProperties, "CPhantom.partialHeight");
			}
		}
		else if (pr.zeroWid && zeroHeight && context && context.validation)
		{
			PushValidationEntry(context.validation.approximatedProperties, "CPhantom.zeroWidHeight");
		}

		if (pr.transp && context && context.validation)
			PushValidationEntry(context.validation.implementedProperties, "CPhantom.transp");

		return WrapCommandArgument(command, base);
	}

	function ExportMatrixEnvironment(environmentName, rows, context)
	{
		let result = [token(K.Raw, "\\begin{" + environmentName + "}")];
		let rowIndex;
		let columnIndex;

		for (rowIndex = 0; rowIndex < rows.length; rowIndex += 1)
		{
			for (columnIndex = 0; columnIndex < rows[rowIndex].length; columnIndex += 1)
			{
				result = result.concat(AscMath.ExportNodeToLaTeXTokens(rows[rowIndex][columnIndex], context));

				if (columnIndex < rows[rowIndex].length - 1)
					result.push(token(K.Raw, "&"));
			}

			if (rowIndex < rows.length - 1)
				result.push(token(K.Raw, "\\\\"));
		}

		result.push(token(K.Raw, "\\end{" + environmentName + "}"));
		return result;
	}

	function ExportArrayCell(cell, context)
	{
		if (Array.isArray(cell))
			return cell.slice();

		return AscMath.ExportNodeToLaTeXTokens(cell, context);
	}

	function TrimEqArrayTokens(tokens, trimStart, trimEnd)
	{
		let start = 0;
		let end = tokens.length;

		if (trimStart)
		{
			while (start < end && (tokens[start].kind === K.Space || tokens[start].value === "\\ "))
				start += 1;
		}

		if (trimEnd)
		{
			while (end > start && (tokens[end - 1].kind === K.Space || tokens[end - 1].value === "\\ "))
				end -= 1;
		}

		return tokens.slice(start, end);
	}

	function IsEqnoRightSideTokens(tokens)
	{
		let trimmed = TrimEqArrayTokens(tokens, true, true);
		let length = trimmed.length;

		if (length < 2)
			return false;

		if (trimmed[0].kind === K.Command && trimmed[0].value === "\\left")
		{
			return length >= 4
				&& trimmed[1].kind === K.Raw
				&& trimmed[1].value === "("
				&& trimmed[length - 2].kind === K.Command
				&& trimmed[length - 2].value === "\\right"
				&& trimmed[length - 1].kind === K.Raw
				&& trimmed[length - 1].value === ")";
		}

		return trimmed[0].kind === K.Raw
			&& trimmed[0].value === "("
			&& trimmed[length - 1].kind === K.Raw
			&& trimmed[length - 1].value === ")";
	}

	function SplitEqnoTokens(tokens)
	{
		let index;
		let body;
		let eqno;

		for (index = tokens.length - 1; index >= 0; index -= 1)
		{
			if (tokens[index].kind === K.Raw && tokens[index].value === "\\#")
			{
				body = TrimEqArrayTokens(tokens.slice(0, index), true, true);
				eqno = TrimEqArrayTokens(tokens.slice(index + 1), true, true);

				if (body.length > 0 && eqno.length > 0 && IsEqnoRightSideTokens(eqno))
					return {body: body, eqno: eqno};
			}
		}

		return null;
	}

	function GetArrayColumnSpecFromAlignment(alignment)
	{
		if (typeof MCJC_LEFT !== "undefined" && alignment === MCJC_LEFT)
			return "l";
		if (typeof MCJC_RIGHT !== "undefined" && alignment === MCJC_RIGHT)
			return "r";
		return "c";
	}

	function ExportArrayEnvironment(rows, columnSpec, context)
	{
		let result = [token(K.Raw, "\\begin{array}{" + columnSpec + "}")];
		let rowIndex;
		let columnIndex;
		let rowSpacing = context && context.matrixSpacingHeuristics && context.matrixRowSpacingLength
			? context.matrixRowSpacingLength
			: "";

		for (rowIndex = 0; rowIndex < rows.length; rowIndex += 1)
		{
			for (columnIndex = 0; columnIndex < rows[rowIndex].length; columnIndex += 1)
			{
				result = result.concat(ExportArrayCell(rows[rowIndex][columnIndex], context));
				if (columnIndex < rows[rowIndex].length - 1)
					result.push(token(K.Raw, "&"));
			}

			if (rowIndex < rows.length - 1)
				result.push(token(K.Raw, rowSpacing ? "\\\\[" + rowSpacing + "]" : "\\\\"));
		}

		result.push(token(K.Raw, "\\end{array}"));
		return result;
	}

	function ResolveMatrixEnvironment(node)
	{
		let start = node.Pr && node.Pr.begChr !== -1 ? String.fromCharCode(node.Pr.begChr || 40) : "";
		let end = node.Pr && node.Pr.endChr !== -1 ? String.fromCharCode(node.Pr.endChr || 41) : "";

		if (start === "(" && end === ")")
			return "pmatrix";
		if (start === "[" && end === "]")
			return "bmatrix";
		if (start === "{" && end === "}")
			return "Bmatrix";
		if (start === "|" && end === "|")
			return "vmatrix";

		return "matrix";
	}

	function GetMatrixColumnSpec(node, context)
	{
		let spec = "";
		let index;
		let alignment;
		let gap = "";

		if (context && context.matrixSpacingHeuristics && node.Pr && node.Pr.cGp)
			gap = GetApproximateMatrixLength(node.Pr.cGp);
		else if (context && context.matrixSpacingHeuristics && node.Pr && node.Pr.cSp)
			gap = GetApproximateMatrixLength(node.Pr.cSp);

		for (index = 0; index < node.getColsCount(); index += 1)
		{
			alignment = node.Pr && typeof node.Pr.Get_ColumnMcJc === "function"
				? node.Pr.Get_ColumnMcJc(index)
				: undefined;
			spec += GetArrayColumnSpecFromAlignment(alignment);
			if (gap && index < node.getColsCount() - 1)
				spec += "@{\\hspace{" + gap + "}}";
		}

		return spec || "c";
	}

	function GetApproximateMatrixLength(value)
	{
		let numeric = Number(value);
		let pt;

		if (!isFinite(numeric) || numeric <= 0)
			return "";

		pt = Math.round(numeric) / 10;
		if (pt <= 0)
			return "";

		return String(pt).replace(/\.0$/, "") + "pt";
	}

	function IsCenteredColumnSpec(columnSpec)
	{
		return !/[^c]/.test(columnSpec);
	}

	function ExportMatrix(node, context)
	{
		let rows = [];
		let rowIndex;
		let columnIndex;
		let cols = node.getColsCount();
		let columnSpec;
		let environmentName;
		let leftDelimiter;
		let rightDelimiter;
		let useSpacingHeuristics = !!(context
			&& context.matrixSpacingHeuristics
			&& node.Pr
			&& (node.Pr.cGp || node.Pr.cSp || node.Pr.rSp));

		TrackCtrlPrProperty(node.Pr, context, "CMathMatrix.ctrlPr");

		for (rowIndex = 0; rowIndex < node.getRowsCount(); rowIndex += 1)
		{
			rows[rowIndex] = [];
			for (columnIndex = 0; columnIndex < cols; columnIndex += 1)
				rows[rowIndex][columnIndex] = node.getContentElement(rowIndex, columnIndex);
		}

		columnSpec = GetMatrixColumnSpec(node, context);
		environmentName = ResolveMatrixEnvironment(node);

		if (context)
			context.matrixRowSpacingLength = useSpacingHeuristics ? GetApproximateMatrixLength(node.Pr && node.Pr.rSp) : "";

		if (context && context.validation && node.Pr)
		{
			if (HasDefinedValue(node.Pr.cGpRule))
				PushValidationEntry(context.validation.approximatedProperties, "CMathMatrix.cGpRule");
			if (HasDefinedValue(node.Pr.rSpRule))
				PushValidationEntry(context.validation.approximatedProperties, "CMathMatrix.rSpRule");
		}

		if (IsCenteredColumnSpec(columnSpec) && !useSpacingHeuristics)
			return ExportMatrixEnvironment(environmentName, rows, context);

		leftDelimiter = node.Pr && node.Pr.begChr !== -1 ? String.fromCharCode(node.Pr.begChr || 40) : "";
		rightDelimiter = node.Pr && node.Pr.endChr !== -1 ? String.fromCharCode(node.Pr.endChr || 41) : "";

		if (context && context.validation)
		{
			PushValidationEntry(context.validation.approximatedProperties, "CMathMatrix.mcJc");
			if (node.Pr && node.Pr.cGp)
				PushValidationEntry(context.validation.approximatedProperties, "CMathMatrix.cGp");
			if (node.Pr && node.Pr.cSp)
				PushValidationEntry(context.validation.approximatedProperties, "CMathMatrix.cSp");
			if (node.Pr && node.Pr.rSp)
				PushValidationEntry(context.validation.approximatedProperties, "CMathMatrix.rSp");
			if (node.Pr && node.Pr.plcHide)
				PushValidationEntry(context.validation.approximatedProperties, "CMathMatrix.plcHide");
			if (node.Pr && typeof node.Pr.baseJc !== "undefined" && node.Pr.baseJc !== BASEJC_CENTER)
				PushValidationEntry(context.validation.approximatedProperties, "CMathMatrix.baseJc");
		}

		if (useSpacingHeuristics && context && context.validation)
			PushValidationEntry(context.validation.implementedProperties, "CMathMatrix.spacingHeuristics");

		return [
			token(K.Command, "\\left"),
			token(K.Raw, NormalizeDelimiterSymbol(leftDelimiter, "left")),
		].concat(
			ExportArrayEnvironment(rows, columnSpec, context),
			[
				token(K.Command, "\\right"),
				token(K.Raw, NormalizeDelimiterSymbol(rightDelimiter, "right")),
			]
		);
	}

	function ExportEqArray(node, context)
	{
		let rows = [];
		let rowIndex;
		let columnSpec = "c";
		let hasEqno = false;
		let rowTokens;
		let eqnoSplit;

		TrackCtrlPrProperty(node.Pr, context, "CEqArray.ctrlPr");

		for (rowIndex = 0; rowIndex < node.Pr.row; rowIndex += 1)
		{
			rowTokens = AscMath.ExportNodeToLaTeXTokens(node.getElement(rowIndex), context);
			eqnoSplit = SplitEqnoTokens(rowTokens);
			if (eqnoSplit)
			{
				hasEqno = true;
				rows.push([eqnoSplit.body, eqnoSplit.eqno]);
				if (context && context.validation)
					PushValidationEntry(context.validation.implementedProperties, "CEqArray.eqno");
				continue;
			}

			rows.push([rowTokens]);
		}

		if (node.Pr)
		{
			if (typeof BASEJC_TOP !== "undefined" && node.Pr.baseJc === BASEJC_TOP)
				columnSpec = "l";
			else if (typeof BASEJC_BOTTOM !== "undefined" && node.Pr.baseJc === BASEJC_BOTTOM)
				columnSpec = "r";
		}

		if (columnSpec !== "c" && context && context.validation)
			PushValidationEntry(context.validation.approximatedProperties, "CEqArray.baseJc");

		if (context && context.validation && node.Pr)
		{
			if (node.Pr.maxDist)
				PushValidationEntry(context.validation.approximatedProperties, "CEqArray.maxDist");
			if (node.Pr.objDist)
				PushValidationEntry(context.validation.approximatedProperties, "CEqArray.objDist");
			if (HasDefinedValue(node.Pr.rSpRule))
				PushValidationEntry(context.validation.approximatedProperties, "CEqArray.rSpRule");
			if (node.Pr.rSp)
				PushValidationEntry(context.validation.approximatedProperties, "CEqArray.rSp");
		}

		if (hasEqno)
		{
			for (rowIndex = 0; rowIndex < rows.length; rowIndex += 1)
			{
				if (rows[rowIndex].length === 1)
					rows[rowIndex].push([]);
			}
			columnSpec += "@{\\qquad}r";
		}

		return ExportArrayEnvironment(rows, columnSpec, context);
	}

	function ExportGroupCharacter(node, context)
	{
		let codePoint = node.Pr.chr || (node.operator && typeof node.operator.Get_CodeChr === "function" ? node.operator.Get_CodeChr() : 0);
		let symbol = codePoint ? String.fromCodePoint(codePoint) : "";
		let mapped = "";
		let base = AscMath.ExportNodeToLaTeXTokens(node.getBase(), context);
		let isAbove = !!(node.Pr && node.Pr.pos === 1);
		let isHorizontalBracket = !!(AscMath.MathLiterals
			&& AscMath.MathLiterals.hbrack
			&& typeof AscMath.MathLiterals.hbrack.SearchU === "function"
			&& AscMath.MathLiterals.hbrack.SearchU(symbol));

		TrackCtrlPrProperty(node.Pr, context, "CGroupCharacter.ctrlPr");

		if (isHorizontalBracket)
		{
			mapped = symbol && AscMath.SymbolsToLaTeX ? AscMath.SymbolsToLaTeX[symbol] : "";
		}
		else switch (codePoint)
		{
			case 0x23DE:
				mapped = "\\overbrace";
				break;
			case 0x23DF:
				mapped = "\\underbrace";
				break;
			case 0x23DC:
				mapped = isAbove ? "\\overparen" : "\\underparen";
				break;
			case 0x23DD:
				mapped = isAbove ? "\\overparen" : "\\underparen";
				break;
			case 0x23B4:
				mapped = "\\overbracket";
				break;
			case 0x23B5:
				mapped = "\\underbracket";
				break;
			default:
				mapped = symbol && AscMath.SymbolsToLaTeX ? AscMath.SymbolsToLaTeX[symbol] : "";
				break;
		}

		if ((mapped === "\\overparen" || mapped === "\\underparen" || mapped === "\\overbracket" || mapped === "\\underbracket")
			&& context && context.validation)
		{
			RequirePackage(context, "mathtools");
			PushValidationEntry(context.validation.approximatedProperties, "CGroupCharacter.packageCommand");
		}

		if (node.Pr
			&& typeof node.Pr.vertJc !== "undefined"
			&& typeof node.Pr.pos !== "undefined"
			&& node.Pr.vertJc !== node.Pr.pos
			&& context && context.validation)
		{
			PushValidationEntry(context.validation.approximatedProperties, "CGroupCharacter.vertJc");
		}

		isHorizontalBracket = isHorizontalBracket || IsGroupCharacterArgumentCommand(mapped);

		if (/^\\[A-Za-z]+$/.test(mapped))
		{
			if (isHorizontalBracket)
				return WrapCommandArgument(mapped, base);

			return WrapMathOperatorWithLimits([token(K.Command, mapped)], base, isAbove);
		}

		return AscMath.GetFallbackNodeLaTeXTokens(node, context);
	}

	RegisterNode("ParaMath", ExportParaMath, [
		typeof para_Math !== "undefined" ? {type: para_Math} : null,
	]);
	RegisterNode("CMathContent", ExportMathContent, [
		typeof para_Math_Content !== "undefined" ? {type: para_Math_Content} : null,
		typeof AscDFH !== "undefined" && typeof AscDFH.historyitem_type_MathContent !== "undefined" ? {classType: AscDFH.historyitem_type_MathContent} : null,
	]);
	RegisterNode("CMathText", ExportMathTextNode, [
		typeof para_Math_Text !== "undefined" ? {type: para_Math_Text} : null,
	]);
	RegisterNode("CMathAmp", ExportMathAmp, [
		typeof para_Math_Ampersand !== "undefined" ? {type: para_Math_Ampersand} : null,
	]);
	RegisterNode("ParaRun", ExportParaRun, [
		typeof para_Math_Run !== "undefined" ? {type: para_Math_Run} : null,
	]);
	RegisterNode("ParaHyperlink", ExportTransparentContainer);
	RegisterNode("ParaField", ExportTransparentContainer);
	RegisterNode("FldSimple", ExportTransparentContainer);
	RegisterNode("CInlineLevelSdt", ExportTransparentContainer);
	RegisterNode("InlineLevelSdt", ExportTransparentContainer);
	RegisterNode("CBlockLevelSdt", ExportTransparentContainer);
	RegisterNode("BlockLevelSdt", ExportTransparentContainer);
	RegisterNode("CFraction", ExportFraction, [
		typeof MATH_FRACTION !== "undefined" ? {kind: MATH_FRACTION} : null,
		typeof AscDFH !== "undefined" && typeof AscDFH.historyitem_type_frac !== "undefined" ? {classType: AscDFH.historyitem_type_frac} : null,
	]);
	RegisterNode("CDegree", ExportDegree, [
		typeof MATH_DEGREE !== "undefined" ? {kind: MATH_DEGREE} : null,
		typeof AscDFH !== "undefined" && typeof AscDFH.historyitem_type_deg !== "undefined" ? {classType: AscDFH.historyitem_type_deg} : null,
	]);
	RegisterNode("CDegreeSubSup", ExportDegreeSubSup, [
		typeof MATH_DEGREESubSup !== "undefined" ? {kind: MATH_DEGREESubSup} : null,
		typeof AscDFH !== "undefined" && typeof AscDFH.historyitem_type_deg_subsup !== "undefined" ? {classType: AscDFH.historyitem_type_deg_subsup} : null,
	]);
	RegisterNode("CRadical", ExportRadical, [
		typeof MATH_RADICAL !== "undefined" ? {kind: MATH_RADICAL} : null,
		typeof AscDFH !== "undefined" && typeof AscDFH.historyitem_type_rad !== "undefined" ? {classType: AscDFH.historyitem_type_rad} : null,
	]);
	RegisterNode("CDelimiter", ExportDelimiter, [
		typeof MATH_DELIMITER !== "undefined" ? {kind: MATH_DELIMITER} : null,
		typeof AscDFH !== "undefined" && typeof AscDFH.historyitem_type_delimiter !== "undefined" ? {classType: AscDFH.historyitem_type_delimiter} : null,
	]);
	RegisterNode("CLimit", ExportLimit, [
		typeof MATH_LIMIT !== "undefined" ? {kind: MATH_LIMIT} : null,
		typeof AscDFH !== "undefined" && typeof AscDFH.historyitem_type_lim !== "undefined" ? {classType: AscDFH.historyitem_type_lim} : null,
	]);
	RegisterNode("CMathFunc", ExportMathFunction, [
		typeof MATH_FUNCTION !== "undefined" ? {kind: MATH_FUNCTION} : null,
		typeof AscDFH !== "undefined" && typeof AscDFH.historyitem_type_mathFunc !== "undefined" ? {classType: AscDFH.historyitem_type_mathFunc} : null,
	]);
	RegisterNode("CNary", ExportNary, [
		typeof MATH_NARY !== "undefined" ? {kind: MATH_NARY} : null,
		typeof AscDFH !== "undefined" && typeof AscDFH.historyitem_type_nary !== "undefined" ? {classType: AscDFH.historyitem_type_nary} : null,
	]);
	RegisterNode("CAccent", ExportAccent, [
		typeof MATH_ACCENT !== "undefined" ? {kind: MATH_ACCENT} : null,
		typeof AscDFH !== "undefined" && typeof AscDFH.historyitem_type_acc !== "undefined" ? {classType: AscDFH.historyitem_type_acc} : null,
	]);
	RegisterNode("CBorderBox", ExportBorderBox, [
		typeof MATH_BORDER_BOX !== "undefined" ? {kind: MATH_BORDER_BOX} : null,
		typeof AscDFH !== "undefined" && typeof AscDFH.historyitem_type_borderBox !== "undefined" ? {classType: AscDFH.historyitem_type_borderBox} : null,
	]);
	RegisterNode("CBox", ExportBox, [
		typeof MATH_BOX !== "undefined" ? {kind: MATH_BOX} : null,
		typeof AscDFH !== "undefined" && typeof AscDFH.historyitem_type_box !== "undefined" ? {classType: AscDFH.historyitem_type_box} : null,
	]);
	RegisterNode("CBar", ExportBar, [
		typeof MATH_BAR !== "undefined" ? {kind: MATH_BAR} : null,
		typeof AscDFH !== "undefined" && typeof AscDFH.historyitem_type_bar !== "undefined" ? {classType: AscDFH.historyitem_type_bar} : null,
	]);
	RegisterNode("CPhantom", ExportPhantom, [
		typeof MATH_PHANTOM !== "undefined" ? {kind: MATH_PHANTOM} : null,
		typeof AscDFH !== "undefined" && typeof AscDFH.historyitem_type_phant !== "undefined" ? {classType: AscDFH.historyitem_type_phant} : null,
	]);
	RegisterNode("CMathMatrix", ExportMatrix, [
		typeof MATH_MATRIX !== "undefined" ? {kind: MATH_MATRIX} : null,
		typeof AscDFH !== "undefined" && typeof AscDFH.historyitem_type_matrix !== "undefined" ? {classType: AscDFH.historyitem_type_matrix} : null,
	]);
	RegisterNode("CEqArray", ExportEqArray, [
		typeof MATH_EQ_ARRAY !== "undefined" ? {kind: MATH_EQ_ARRAY} : null,
		typeof AscDFH !== "undefined" && typeof AscDFH.historyitem_type_eqArr !== "undefined" ? {classType: AscDFH.historyitem_type_eqArr} : null,
	]);
	RegisterNode("CGroupCharacter", ExportGroupCharacter, [
		typeof MATH_GROUP_CHARACTER !== "undefined" ? {kind: MATH_GROUP_CHARACTER} : null,
		typeof AscDFH !== "undefined" && typeof AscDFH.historyitem_type_groupChr !== "undefined" ? {classType: AscDFH.historyitem_type_groupChr} : null,
	]);
})(window);
