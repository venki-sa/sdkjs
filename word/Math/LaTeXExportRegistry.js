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
	const nodeExportersByName = {};
	const nodeExportersByType = {};
	const nodeExportersByKind = {};
	const nodeExportersByClassType = {};
	const symbolRegistry = {};
	const K = AscMath.LaTeXExportTokenKinds;
	const token = AscMath.CreateLaTeXExportToken;

	function RegisterLaTeXExportNode(name, exporter, aliases)
	{
		let index;
		let alias;

		nodeExportersByName[name] = exporter;

		if (!aliases || !aliases.length)
			return;

		for (index = 0; index < aliases.length; index += 1)
		{
			alias = aliases[index];
			if (!alias)
				continue;

			if (alias.type !== undefined && alias.type !== null)
				nodeExportersByType[String(alias.type)] = exporter;

			if (alias.kind !== undefined && alias.kind !== null)
				nodeExportersByKind[String(alias.kind)] = exporter;

			if (alias.classType !== undefined && alias.classType !== null)
				nodeExportersByClassType[String(alias.classType)] = exporter;

			if (alias.name)
				nodeExportersByName[alias.name] = exporter;
		}
	}

	function GetLaTeXExportNode(name)
	{
		return nodeExportersByName[name];
	}

	function RegisterLaTeXExportSymbol(symbol, meta)
	{
		symbolRegistry[symbol] = meta;
	}

	function GetLaTeXExportSymbol(symbol)
	{
		return symbolRegistry[symbol];
	}

	function ResetLaTeXExportRegistry()
	{
		let key;
		for (key in nodeExportersByName)
			delete nodeExportersByName[key];
		for (key in nodeExportersByType)
			delete nodeExportersByType[key];
		for (key in nodeExportersByKind)
			delete nodeExportersByKind[key];
		for (key in nodeExportersByClassType)
			delete nodeExportersByClassType[key];
		for (key in symbolRegistry)
			delete symbolRegistry[key];
	}

	function GetNodeIdentity(node)
	{
		if (!node)
			return {name: "unknown-node", key: "unknown-node"};

		if (node.constructor && node.constructor.name && nodeExportersByName[node.constructor.name])
			return {name: node.constructor.name, key: node.constructor.name};

		if (node.Type !== undefined && node.Type !== null && nodeExportersByType[String(node.Type)])
			return {name: "type:" + node.Type, key: "type:" + node.Type};

		if (node.kind !== undefined && node.kind !== null && nodeExportersByKind[String(node.kind)])
			return {name: "kind:" + node.kind, key: "kind:" + node.kind};

		if (node.ClassType !== undefined && node.ClassType !== null && nodeExportersByClassType[String(node.ClassType)])
			return {name: "classType:" + node.ClassType, key: "classType:" + node.ClassType};

		if (node.constructor && node.constructor.name)
			return {name: node.constructor.name, key: node.constructor.name};

		if (node.Type !== undefined && node.Type !== null)
			return {name: "type:" + node.Type, key: "type:" + node.Type};

		if (node.kind !== undefined && node.kind !== null)
			return {name: "kind:" + node.kind, key: "kind:" + node.kind};

		if (node.ClassType !== undefined && node.ClassType !== null)
			return {name: "classType:" + node.ClassType, key: "classType:" + node.ClassType};

		return {name: "unknown-node", key: "unknown-node"};
	}

	function ResolveLaTeXExportNode(node)
	{
		let identity = GetNodeIdentity(node);
		let exporter = null;

		if (node && node.constructor && node.constructor.name)
			exporter = nodeExportersByName[node.constructor.name] || null;

		if (!exporter && node && node.Type !== undefined && node.Type !== null)
			exporter = nodeExportersByType[String(node.Type)] || null;

		if (!exporter && node && node.kind !== undefined && node.kind !== null)
			exporter = nodeExportersByKind[String(node.kind)] || null;

		if (!exporter && node && node.ClassType !== undefined && node.ClassType !== null)
			exporter = nodeExportersByClassType[String(node.ClassType)] || null;

		return {
			exporter: exporter,
			identity: identity,
		};
	}

	function GetFallbackNodeLaTeXTokens(node, context)
	{
		let text = "";
		let nodeIdentity = GetNodeIdentity(node);
		let result = [];
		let commandPattern = /^\\[A-Za-z]+/;
		let index = 0;
		let match;
		let symbol;

		if (context && context.validation)
			context.validation.fallbacks.push(nodeIdentity.name);

		if (node && typeof node.GetTextOfElement === "function")
			text = node.GetTextOfElement(true).GetText();
		else if (node && typeof node.GetText === "function")
			text = node.GetText(true);

		while (index < text.length)
		{
			if (text[index] === "\\")
			{
				match = text.slice(index).match(commandPattern);
				if (match)
				{
					result = result.concat(AscMath.ExportLegacyCommandToLaTeXTokens(match[0], context));
					index += match[0].length;
					if (AscMath.ShouldSkipFollowingSpaceForLegacyCommand(match[0]))
					{
						while (text[index] === " ")
							index += 1;
					}
					continue;
				}
			}

			symbol = Array.from(text.slice(index))[0];
			result = result.concat(AscMath.ExportSymbolToLaTeXTokens(symbol, context));
			index += symbol.length;
		}

		return result.length > 0 ? result : [token(K.Raw, text, "fallback:" + nodeIdentity.name)];
	}

	function ExportNodeToLaTeXTokens(node, context)
	{
		const resolved = ResolveLaTeXExportNode(node);
		const exporter = resolved.exporter;

		if (!exporter)
		{
			if (context && context.validation)
				context.validation.unknownNodes.push(resolved.identity.name || "unknown-node");

			return GetFallbackNodeLaTeXTokens(node, context);
		}

		return exporter(node, context);
	}

	function ExportToLaTeX(node, options)
	{
		const context = AscMath.CreateLaTeXExportContext(options);
		const settings = AscMath.GetLaTeXExportSettings(options);

		if (settings.mode === AscMath.c_oAscLaTeXExportMode.Legacy)
		{
			if (node && typeof node.GetText === "function")
				return node.GetText(true);

			return "";
		}

		return AscMath.RenderLaTeXExportTokens(ExportNodeToLaTeXTokens(node, context), context);
	}

	AscMath.RegisterLaTeXExportNode = RegisterLaTeXExportNode;
	AscMath.GetLaTeXExportNode = GetLaTeXExportNode;
	AscMath.RegisterLaTeXExportSymbol = RegisterLaTeXExportSymbol;
	AscMath.GetLaTeXExportSymbol = GetLaTeXExportSymbol;
	AscMath.ResetLaTeXExportRegistry = ResetLaTeXExportRegistry;
	AscMath.ResolveLaTeXExportNode = ResolveLaTeXExportNode;
	AscMath.GetFallbackNodeLaTeXTokens = GetFallbackNodeLaTeXTokens;
	AscMath.ExportNodeToLaTeXTokens = ExportNodeToLaTeXTokens;
	AscMath.ExportToLaTeX = ExportToLaTeX;
})(window);
