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
	const TokenKinds = AscMath.LaTeXExportTokenKinds;
	const STYLE_WRAPPER_COMMANDS = {
		"\\mathbf": true,
		"\\mathit": true,
		"\\mathrm": true,
		"\\mathsf": true,
		"\\mathtt": true,
		"\\mathbb": true,
		"\\mathcal": true,
		"\\mathfrak": true,
	};
	const NON_STYLEABLE_COMMANDS = {
		"\\left": true,
		"\\right": true,
		"\\middle": true,
		"\\limits": true,
		"\\nolimits": true,
		"\\textcolor": true,
		"\\colorbox": true,
		"\\frac": true,
		"\\binom": true,
		"\\sqrt": true,
		"\\bar": true,
		"\\overline": true,
		"\\hat": true,
		"\\widehat": true,
		"\\vec": true,
		"\\operatorname": true,
		"\\mathop": true,
		"\\begin": true,
		"\\end": true,
	};

	function CreateToken(kind, value, source)
	{
		return AscMath.CreateLaTeXExportToken(kind, value, source);
	}

	function IsStyleWrapperCommand(token)
	{
		return !!(token
			&& token.kind === TokenKinds.Command
			&& STYLE_WRAPPER_COMMANDS[token.value]);
	}

	function IsOpenToken(token)
	{
		return !!(token
			&& (token.kind === TokenKinds.GroupOpen
				|| token.kind === TokenKinds.SubOpen
				|| token.kind === TokenKinds.SupOpen));
	}

	function IsStyleEligibleToken(token)
	{
		return !!(token
			&& (token.kind === TokenKinds.Identifier
				|| token.kind === TokenKinds.Number
				|| token.kind === TokenKinds.Text));
	}

	function IsStyleEligibleStandaloneCommand(token, nextToken)
	{
		return !!(token
			&& token.kind === TokenKinds.Command
			&& !STYLE_WRAPPER_COMMANDS[token.value]
			&& !NON_STYLEABLE_COMMANDS[token.value]
			&& !IsOpenToken(nextToken));
	}

	function WrapTokensWithCommands(commands, tokens)
	{
		let result = tokens;
		let index;

		for (index = 0; index < commands.length; index += 1)
			result = [CreateToken(TokenKinds.Command, commands[index])].concat(
				CreateToken(TokenKinds.GroupOpen, "{"),
				result,
				CreateToken(TokenKinds.GroupClose, "}")
			);

		return result;
	}

	function MergeStyleCommands(currentCommand, activeStyles)
	{
		let merged = [currentCommand];
		let index;

		for (index = 0; index < activeStyles.length; index += 1)
		{
			if (merged.indexOf(activeStyles[index]) === -1)
				merged.push(activeStyles[index]);
		}

		return merged;
	}

	function ParseNormalizedSequence(tokens, startIndex, stopKind, activeStyles)
	{
		let result = [];
		let index = startIndex || 0;
		let currentToken;
		let nested;
		let appliedStyles;

		while (index < tokens.length)
		{
			currentToken = tokens[index];
			if (!currentToken)
			{
				index += 1;
				continue;
			}

			if (stopKind && currentToken.kind === stopKind)
				break;

			if (IsStyleWrapperCommand(currentToken)
				&& tokens[index + 1]
				&& tokens[index + 1].kind === TokenKinds.GroupOpen)
			{
				nested = ParseNormalizedSequence(tokens, index + 2, TokenKinds.GroupClose, MergeStyleCommands(currentToken.value, activeStyles));
				result = result.concat(nested.tokens);
				index = nested.nextIndex + 1;
				continue;
			}

			if (currentToken.kind === TokenKinds.Command
				&& tokens[index + 1]
				&& IsOpenToken(tokens[index + 1]))
			{
				nested = ParseNormalizedSequence(tokens, index + 2, TokenKinds.GroupClose, activeStyles);
				result.push(currentToken, tokens[index + 1]);
				result = result.concat(nested.tokens);
				if (tokens[nested.nextIndex] && tokens[nested.nextIndex].kind === TokenKinds.GroupClose)
				{
					result.push(tokens[nested.nextIndex]);
					index = nested.nextIndex + 1;
				}
				else
				{
					index = nested.nextIndex;
				}
				continue;
			}

			if (IsOpenToken(currentToken))
			{
				nested = ParseNormalizedSequence(tokens, index + 1, TokenKinds.GroupClose, activeStyles);
				result.push(currentToken);
				result = result.concat(nested.tokens);
				if (tokens[nested.nextIndex] && tokens[nested.nextIndex].kind === TokenKinds.GroupClose)
				{
					result.push(tokens[nested.nextIndex]);
					index = nested.nextIndex + 1;
				}
				else
				{
					index = nested.nextIndex;
				}
				continue;
			}

			if ((IsStyleEligibleToken(currentToken) || IsStyleEligibleStandaloneCommand(currentToken, tokens[index + 1]))
				&& activeStyles.length > 0)
			{
				appliedStyles = WrapTokensWithCommands(activeStyles, [currentToken]);
				result = result.concat(appliedStyles);
			}
			else
			{
				result.push(currentToken);
			}

			index += 1;
		}

		return {
			tokens: result,
			nextIndex: index,
		};
	}

	function NormalizeLaTeXExportTokens(tokens, context)
	{
		let normalized;
		let braceBalance = 0;
		let index;

		if (!tokens || tokens.length === 0)
			return [];

		normalized = ParseNormalizedSequence(tokens, 0, null, []).tokens;

		for (index = 0; index < normalized.length; index += 1)
		{
			if (normalized[index].kind === TokenKinds.GroupOpen
				|| normalized[index].kind === TokenKinds.SubOpen
				|| normalized[index].kind === TokenKinds.SupOpen)
			{
				braceBalance += 1;
			}
			else if (normalized[index].kind === TokenKinds.GroupClose)
			{
				braceBalance -= 1;
				if (braceBalance < 0)
				{
					if (context && context.validation)
						context.validation.rendererViolations.push("brace-balance:extra-close");
					braceBalance = 0;
				}
			}
		}

		if (braceBalance > 0 && context && context.validation)
			context.validation.rendererViolations.push("brace-balance:missing-close");

		return normalized;
	}

	function IsBoundarySpaceRequired(prevToken, nextToken)
	{
		let prevIsCommandLike;

		if (!prevToken || !nextToken)
			return false;

		prevIsCommandLike = prevToken.kind === TokenKinds.Command
			|| (prevToken.kind === TokenKinds.Raw && /^\\[A-Za-z]+$/.test(prevToken.value));

		if (prevIsCommandLike)
		{
			return nextToken.kind === TokenKinds.Identifier
				|| nextToken.kind === TokenKinds.Number
				|| nextToken.kind === TokenKinds.Text;
		}

		return false;
	}

	function RenderLaTeXExportTokens(tokens, context)
	{
		let output = "";
		let prevVisibleToken = null;
		let normalizedTokens = NormalizeLaTeXExportTokens(tokens, context);

		for (let index = 0; index < normalizedTokens.length; index++)
		{
			let token = normalizedTokens[index];
			if (!token || token.kind === TokenKinds.Invisible)
				continue;

			if (IsBoundarySpaceRequired(prevVisibleToken, token))
				output += " ";

			output += token.value;

			if (token.kind !== TokenKinds.Space)
				prevVisibleToken = token;
		}

		return output;
	}

	AscMath.IsLaTeXExportBoundarySpaceRequired = IsBoundarySpaceRequired;
	AscMath.NormalizeLaTeXExportTokens = NormalizeLaTeXExportTokens;
	AscMath.RenderLaTeXExportTokens = RenderLaTeXExportTokens;
})(window);
