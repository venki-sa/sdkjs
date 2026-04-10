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

	const ForbiddenLegacyCommands = {
		"\\degc": true,
		"\\funcapply": true,
	};
	const GeneratedOmmlCommandAliases = AscMath.OmmlCommandAliases || {};
	const GeneratedOmmlCommandRemoveList = AscMath.OmmlCommandRemoveList || {};
	const GeneratedReferenceSymbols = AscMath.StrictLaTeXReferenceSymbols || {};
	const GeneratedReferenceDenyList = {
		"’": true,
		"ǀ": true,
		"\u0304": true,
		"ẋ": true,
	};

	const ExplicitSymbols = {
		"℃": {kind: "structural"},
		"½": {kind: "structural"},
		"⁡": {kind: "invisible"},
		" ": {kind: "raw", value: "\\ "},
		"\t": {kind: "raw", value: "\\ "},
		"\u00a0": {kind: "raw", value: "\\ "},
		"\u2001": {kind: "raw", value: "\\quad "},
		"\u2005": {kind: "raw", value: "\\;"},
		"\u2008": {kind: "raw", value: "\\ "},
		"\u2009": {kind: "raw", value: "\\,"},
		"（": {kind: "raw", value: "("},
		"）": {kind: "raw", value: ")"},
		"∆": {kind: "command", value: "\\Delta"},
		"·": {kind: "command", value: "\\cdot"},
		// Deliberately prefer math-semantic mu in strict math output.
		// The generated W3C baseline maps MICRO SIGN to \mathrm{\mu}, which is more text-flavored.
		// Context-sensitive unit/text handling should be solved separately rather than changing the global strict default here.
		"µ": {kind: "command", value: "\\mu"},
		// There is no standard \Chi command in portable LaTeX; use the glyph-equivalent identifier.
		"Χ": {kind: "identifier", value: "X"},
		"ℎ": {kind: "identifier", value: "h"},
		"≔": {kind: "raw", value: ":="},
		"，": {kind: "raw", value: ","},
		"{": {kind: "raw", value: "\\{"},
		"}": {kind: "raw", value: "\\}"},
		"#": {kind: "raw", value: "\\#"},
		"%": {kind: "raw", value: "\\%"},
		"&": {kind: "raw", value: "\\&"},
		"_": {kind: "raw", value: "\\_"},
		"−": {kind: "raw", value: "-"},
		"–": {kind: "raw", value: "-"},
		"∕": {kind: "raw", value: "/"},
	};
	const InvalidPlaceholderSymbols = {
		"⬚": true,
		"\uFFFC": true,
	};
	const LegacyCommandOverrides = {
		"\\inc": {kind: "command", value: "\\Delta"},
		"\\funcapply": {kind: "invisible"},
		"\\thicksp": {kind: "raw", value: "\\;"},
		"\\vthicksp": {kind: "raw", value: "\\;"},
		"\\degc": {kind: "structural", symbol: "℃"},
		"\\below": {kind: "command", value: "\\underset"},
		"\\above": {kind: "command", value: "\\overset"},
		"\\hvec": {kind: "command", value: "\\vec"},
	};

	function GetCodePointString(value)
	{
		if (window.AscCommon && AscCommon.encodeSurrogateChar)
			return AscCommon.encodeSurrogateChar(value);

		return String.fromCodePoint(value);
	}

	function ExpandStructuralSymbol(symbol)
	{
		if (symbol === "℃")
		{
			return [
				token(K.Raw, "{}"),
				token(K.Raw, "^{"),
				token(K.Command, "\\circ"),
				token(K.Raw, "}"),
				token(K.Command, "\\mathrm"),
				token(K.GroupOpen, "{"),
				token(K.Identifier, "C"),
				token(K.GroupClose, "}"),
			];
		}

		if (symbol === "½")
		{
			return [
				token(K.Command, "\\frac"),
				token(K.GroupOpen, "{"),
				token(K.Number, "1"),
				token(K.GroupClose, "}"),
				token(K.GroupOpen, "{"),
				token(K.Number, "2"),
				token(K.GroupClose, "}"),
			];
		}

		return [token(K.Raw, symbol)];
	}

	function ExpandLegacyCommand(override)
	{
		if (!override)
			return [];

		if (override.kind === "invisible")
			return [token(K.Invisible, "", "legacy-command")];

		if (override.kind === "structural")
			return ExpandStructuralSymbol(override.symbol);

		if (override.kind === "command")
			return [token(K.Command, override.value, "legacy-command")];

		return [token(K.Raw, override.value, "legacy-command")];
	}

	function ExportAliasSymbol(symbol, source)
	{
		if (/^[A-Za-z]$/.test(symbol))
			return token(K.Identifier, symbol, source);

		if (/^[0-9]$/.test(symbol))
			return token(K.Number, symbol, source);

		if (/^[+\-=*/(),.;:<>[\]|!@~?'"]$/.test(symbol))
			return token(K.Raw, symbol, source);

		return token(K.Raw, symbol, source);
	}

	function TokenizeGeneratedAlias(alias, source)
	{
		let result = [];
		let index = 0;
		let commandMatch;
		let symbol;

		while (index < alias.length)
		{
			if (alias[index] === "\\")
			{
				commandMatch = alias.slice(index).match(/^\\[A-Za-z]+/);
				if (commandMatch)
				{
					result.push(token(K.Command, commandMatch[0], source));
					index += commandMatch[0].length;
					continue;
				}

				if (alias[index + 1])
				{
					result.push(token(K.Raw, alias.slice(index, index + 2), source));
					index += 2;
					continue;
				}
			}

			if (alias[index] === "{")
			{
				result.push(token(K.GroupOpen, "{", source));
				index += 1;
				continue;
			}

			if (alias[index] === "}")
			{
				result.push(token(K.GroupClose, "}", source));
				index += 1;
				continue;
			}

			if (alias[index] === "_" && alias[index + 1] === "{")
			{
				result.push(token(K.SubOpen, "_{", source));
				index += 2;
				continue;
			}

			if (alias[index] === "^" && alias[index + 1] === "{")
			{
				result.push(token(K.SupOpen, "^{", source));
				index += 2;
				continue;
			}

			symbol = Array.from(alias.slice(index))[0];
			result.push(ExportAliasSymbol(symbol, source));
			index += symbol.length;
		}

		return result;
	}

	function ExpandGeneratedLegacyAlias(command, alias)
	{
		if (!alias)
			return [];

		return TokenizeGeneratedAlias(alias, "legacy-command:" + command);
	}

	function ShouldSkipFollowingSpaceForLegacyCommand(command)
	{
		return command === "\\funcapply"
			|| command === "\\thicksp"
			|| command === "\\vthicksp";
	}

	function GetSymbolCodePointLabel(symbol)
	{
		if (!symbol)
			return "";

		const codePoint = symbol.codePointAt(0);
		return "U+" + codePoint.toString(16).toUpperCase();
	}

	function HandleInvalidPlaceholderSymbol(symbol, context)
	{
		if (context && context.validation)
			context.validation.rendererViolations.push("placeholder-symbol:" + GetSymbolCodePointLabel(symbol));

		return [];
	}

	function LookupSymbolMapping(symbol)
	{
		if (!symbol)
			return "";

		if (AscMath.SymbolsToLaTeX && AscMath.SymbolsToLaTeX[symbol])
			return AscMath.SymbolsToLaTeX[symbol];

		if (!GeneratedReferenceDenyList[symbol] && GeneratedReferenceSymbols[symbol])
			return GeneratedReferenceSymbols[symbol];

		return "";
	}

	function GetSymbolToLaTeXMapping(symbol)
	{
		return LookupSymbolMapping(symbol);
	}

	function ExportLegacyCommandToLaTeXTokens(command, context)
	{
		let override;

		if (!command)
			return [];

		override = LegacyCommandOverrides[command];
		if (override)
			return ExpandLegacyCommand(override);

		if (GeneratedOmmlCommandRemoveList[command])
			return [];

		if (GeneratedOmmlCommandAliases[command])
			return ExpandGeneratedLegacyAlias(command, GeneratedOmmlCommandAliases[command]);

		if (ForbiddenLegacyCommands[command])
		{
			if (context && context.validation)
				context.validation.forbiddenAliases.push(command);

			return [];
		}

		return [token(K.Raw, command, "legacy-command")];
	}

	function ExportSymbolToLaTeXTokens(symbol, context)
	{
		if (!symbol)
			return [];

		if (InvalidPlaceholderSymbols[symbol])
			return HandleInvalidPlaceholderSymbol(symbol, context);

		const explicit = ExplicitSymbols[symbol];
		if (explicit)
		{
			if (explicit.kind === "invisible")
				return [token(K.Invisible, "", "symbol:" + symbol)];

			if (explicit.kind === "structural")
				return ExpandStructuralSymbol(symbol);

			if (explicit.kind === "command")
				return [token(K.Command, explicit.value, "symbol:" + symbol)];

			if (explicit.kind === "identifier")
				return [token(K.Identifier, explicit.value, "symbol:" + symbol)];

			return [token(K.Raw, explicit.value, "symbol:" + symbol)];
		}

		if (/^[A-Za-z]$/.test(symbol))
			return [token(K.Identifier, symbol, "symbol:" + symbol)];

		if (/^[0-9]$/.test(symbol))
			return [token(K.Number, symbol, "symbol:" + symbol)];

		const mapped = LookupSymbolMapping(symbol);
		if (mapped)
		{
			if (ForbiddenLegacyCommands[mapped])
			{
				if (context && context.validation)
					context.validation.forbiddenAliases.push(mapped);

				return [];
			}

			if (/^\\[A-Za-z]+$/.test(mapped))
				return [token(K.Command, mapped, "symbol:" + symbol)];

			return TokenizeGeneratedAlias(mapped, "symbol:" + symbol);
		}

		if (/^[+\-=*/(),.;:<>[\]|!@~?'"]$/.test(symbol))
			return [token(K.Raw, symbol, "symbol:" + symbol)];

		if (context && context.validation)
			context.validation.unknownSymbols.push(symbol);

		return [token(K.Raw, symbol, "symbol:" + symbol)];
	}

	AscMath.GetLaTeXExportCodePointString = GetCodePointString;
	AscMath.GetStrictLaTeXSymbolMapping = GetSymbolToLaTeXMapping;
	AscMath.ExportLegacyCommandToLaTeXTokens = ExportLegacyCommandToLaTeXTokens;
	AscMath.ShouldSkipFollowingSpaceForLegacyCommand = ShouldSkipFollowingSpaceForLegacyCommand;
	AscMath.ExportSymbolToLaTeXTokens = ExportSymbolToLaTeXTokens;
})(window);
