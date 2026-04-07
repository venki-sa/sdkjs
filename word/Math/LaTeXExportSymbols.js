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

	const ExplicitSymbols = {
		"℃": {kind: "structural"},
		"⁡": {kind: "invisible"},
		" ": {kind: "raw", value: "\\ "},
		"\t": {kind: "raw", value: "\\ "},
		"{": {kind: "raw", value: "\\{"},
		"}": {kind: "raw", value: "\\}"},
		"#": {kind: "raw", value: "\\#"},
		"%": {kind: "raw", value: "\\%"},
		"&": {kind: "raw", value: "\\&"},
		"_": {kind: "raw", value: "\\_"},
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

		return [token(K.Raw, symbol)];
	}

	function ExportSymbolToLaTeXTokens(symbol, context)
	{
		if (!symbol)
			return [];

		const explicit = ExplicitSymbols[symbol];
		if (explicit)
		{
			if (explicit.kind === "invisible")
				return [token(K.Invisible, "", "symbol:" + symbol)];

			if (explicit.kind === "structural")
				return ExpandStructuralSymbol(symbol);

			return [token(K.Raw, explicit.value, "symbol:" + symbol)];
		}

		if (/^[A-Za-z]$/.test(symbol))
			return [token(K.Identifier, symbol, "symbol:" + symbol)];

		if (/^[0-9]$/.test(symbol))
			return [token(K.Number, symbol, "symbol:" + symbol)];

		const mapped = AscMath.SymbolsToLaTeX && AscMath.SymbolsToLaTeX[symbol];
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

			return [token(K.Raw, mapped, "symbol:" + symbol)];
		}

		if (/^[+\-=*/(),.;:<>[\]|!]$/.test(symbol))
			return [token(K.Raw, symbol, "symbol:" + symbol)];

		if (context && context.validation)
			context.validation.unknownSymbols.push(symbol);

		return [token(K.Raw, symbol, "symbol:" + symbol)];
	}

	AscMath.GetLaTeXExportCodePointString = GetCodePointString;
	AscMath.ExportSymbolToLaTeXTokens = ExportSymbolToLaTeXTokens;
})(window);
