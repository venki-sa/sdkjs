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

	function ExportParaMath(node, context)
	{
		return AscMath.ExportNodeToLaTeXTokens(node.Root, context);
	}

	function ExportMathContent(node, context)
	{
		let result = [];

		for (let index = 0; index < node.Content.length; index++)
			result = result.concat(AscMath.ExportNodeToLaTeXTokens(node.Content[index], context));

		return result;
	}

	function ExportMathTextNode(node, context)
	{
		if (!node.value || node.value === 11034)
			return [];

		return ExportLeafString(AscMath.GetLaTeXExportCodePointString(node.value), context);
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
			result = ApplyCommandWrappers(wrappers, result);

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

	function ApplyCommandWrappers(commands, tokens)
	{
		let result = tokens;
		let index;

		for (index = 0; index < commands.length; index += 1)
			result = WrapCommandArgument(commands[index], result);

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
		let base = AscMath.ExportNodeToLaTeXTokens(node.getBase(), context);
		let iterator = AscMath.ExportNodeToLaTeXTokens(node.getIterator(), context);
		let scriptOpen = node.Pr.type === 1 ? token(K.SupOpen, "^{") : token(K.SubOpen, "_{");

		return base.concat([scriptOpen], iterator, [token(K.GroupClose, "}")]);
	}

	function ExportDegreeSubSup(node, context)
	{
		if (node.Pr.type === -1)
		{
			if (context && context.validation)
				PushValidationEntry(context.validation.fallbacks, "CDegreeSubSup.type:-1");
			return AscMath.GetFallbackNodeLaTeXTokens(node, context);
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

		for (let i = 0; i < contentCount; i++)
		{
			result = result.concat(AscMath.ExportNodeToLaTeXTokens(node.Content[i], context));

			if (contentCount > 1 && i < contentCount - 1)
				result.push(token(K.Command, "\\mid"));
		}

		result.push(token(K.Command, "\\right"));
		result.push(token(K.Raw, NormalizeDelimiterSymbol(end, "right")));
		return result;
	}

	function ExportLimit(node, context)
	{
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
		let unicodeSymbol;
		let result;

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

		result = [token(K.Command, command)];
		if (node.Pr && node.Pr.limLoc === NARY_UndOvr)
			result.push(token(K.Command, "\\limits"));
		else if (node.Pr && node.Pr.limLoc === NARY_SubSup)
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
		let base = AscMath.ExportNodeToLaTeXTokens(node.getBase(), context);
		let command = ResolveAccentCommand(node);

		if (command === "\\bar\\bar")
			return WrapCommandArgument("\\bar", WrapCommandArgument("\\bar", base));

		return WrapCommandArgument(command, base);
	}

	function ExportBorderBox(node, context)
	{
		if (context && context.validation && node.Pr)
		{
			if (node.Pr.hideTop || node.Pr.hideBot || node.Pr.hideLeft || node.Pr.hideRight)
				PushValidationEntry(context.validation.approximatedProperties, "CBorderBox.hiddenEdges");
			if (node.Pr.strikeH || node.Pr.strikeV || node.Pr.strikeTLBR || node.Pr.strikeBLTR)
				PushValidationEntry(context.validation.approximatedProperties, "CBorderBox.strikes");
		}

		return WrapCommandArgument("\\boxed", AscMath.ExportNodeToLaTeXTokens(node.getBase(), context));
	}

	function ExportBox(node, context)
	{
		return WrapGroup(AscMath.ExportNodeToLaTeXTokens(node.getBase(), context));
	}

	function ExportBar(node, context)
	{
		return WrapCommandArgument(node.Pr.pos ? "\\underline" : "\\overline", AscMath.ExportNodeToLaTeXTokens(node.getBase(), context));
	}

	function ExportPhantom(node, context)
	{
		let base = AscMath.ExportNodeToLaTeXTokens(node.getBase(), context);
		let command = "\\phantom";
		let pr = node.Pr || {};
		let zeroHeight = !!(pr.zeroAsc || pr.zeroDesc);

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
				result = result.concat(AscMath.ExportNodeToLaTeXTokens(rows[rowIndex][columnIndex], context));
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

		for (rowIndex = 0; rowIndex < node.Pr.row; rowIndex += 1)
			rows.push([node.getElement(rowIndex)]);

		if (node.Pr)
		{
			if (typeof BASEJC_TOP !== "undefined" && node.Pr.baseJc === BASEJC_TOP)
				columnSpec = "l";
			else if (typeof BASEJC_BOTTOM !== "undefined" && node.Pr.baseJc === BASEJC_BOTTOM)
				columnSpec = "r";
		}

		if (columnSpec !== "c" && context && context.validation)
			PushValidationEntry(context.validation.approximatedProperties, "CEqArray.baseJc");

		return ExportArrayEnvironment(rows, columnSpec, context);
	}

	function ExportGroupCharacter(node, context)
	{
		let codePoint = node.Pr.chr || (node.operator && typeof node.operator.Get_CodeChr === "function" ? node.operator.Get_CodeChr() : 0);
		let symbol = codePoint ? String.fromCharCode(codePoint) : "";
		let mapped = "";
		let base = AscMath.ExportNodeToLaTeXTokens(node.getBase(), context);
		let isAbove = !!(node.Pr && node.Pr.pos === 1);

		switch (codePoint)
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

		if (/^\\[A-Za-z]+$/.test(mapped))
			return WrapCommandArgument(mapped, base);

		return AscMath.GetFallbackNodeLaTeXTokens(node, context);
	}

	AscMath.RegisterLaTeXExportNode("ParaMath", ExportParaMath);
	AscMath.RegisterLaTeXExportNode("CMathContent", ExportMathContent);
	AscMath.RegisterLaTeXExportNode("CMathText", ExportMathTextNode);
	AscMath.RegisterLaTeXExportNode("ParaRun", ExportParaRun);
	AscMath.RegisterLaTeXExportNode("CFraction", ExportFraction);
	AscMath.RegisterLaTeXExportNode("CDegree", ExportDegree);
	AscMath.RegisterLaTeXExportNode("CDegreeSubSup", ExportDegreeSubSup);
	AscMath.RegisterLaTeXExportNode("CRadical", ExportRadical);
	AscMath.RegisterLaTeXExportNode("CDelimiter", ExportDelimiter);
	AscMath.RegisterLaTeXExportNode("CLimit", ExportLimit);
	AscMath.RegisterLaTeXExportNode("CMathFunc", ExportMathFunction);
	AscMath.RegisterLaTeXExportNode("CNary", ExportNary);
	AscMath.RegisterLaTeXExportNode("CAccent", ExportAccent);
	AscMath.RegisterLaTeXExportNode("CBorderBox", ExportBorderBox);
	AscMath.RegisterLaTeXExportNode("CBox", ExportBox);
	AscMath.RegisterLaTeXExportNode("CBar", ExportBar);
	AscMath.RegisterLaTeXExportNode("CPhantom", ExportPhantom);
	AscMath.RegisterLaTeXExportNode("CMathMatrix", ExportMatrix);
	AscMath.RegisterLaTeXExportNode("CEqArray", ExportEqArray);
	AscMath.RegisterLaTeXExportNode("CGroupCharacter", ExportGroupCharacter);
})(window);
