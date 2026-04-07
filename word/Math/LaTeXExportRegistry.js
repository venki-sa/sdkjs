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
	const nodeExporters = {};
	const symbolRegistry = {};
	const K = AscMath.LaTeXExportTokenKinds;
	const token = AscMath.CreateLaTeXExportToken;

	function RegisterLaTeXExportNode(name, exporter)
	{
		nodeExporters[name] = exporter;
	}

	function GetLaTeXExportNode(name)
	{
		return nodeExporters[name];
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
		for (key in nodeExporters)
			delete nodeExporters[key];
		for (key in symbolRegistry)
			delete symbolRegistry[key];
	}

	function GetFallbackNodeLaTeXTokens(node, context)
	{
		let text = "";
		let nodeName = node && node.constructor ? node.constructor.name : "unknown-node";

		if (context && context.validation)
			context.validation.fallbacks.push(nodeName);

		if (node && typeof node.GetTextOfElement === "function")
			text = node.GetTextOfElement(true).GetText();
		else if (node && typeof node.GetText === "function")
			text = node.GetText(true);

		return [token(K.Raw, text, "fallback:" + nodeName)];
	}

	function ExportNodeToLaTeXTokens(node, context)
	{
		const nodeName = node && node.constructor ? node.constructor.name : "";
		const exporter = nodeName ? GetLaTeXExportNode(nodeName) : null;

		if (!exporter)
		{
			if (context && context.validation)
				context.validation.unknownNodes.push(nodeName || "unknown-node");

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
	AscMath.GetFallbackNodeLaTeXTokens = GetFallbackNodeLaTeXTokens;
	AscMath.ExportNodeToLaTeXTokens = ExportNodeToLaTeXTokens;
	AscMath.ExportToLaTeX = ExportToLaTeX;
})(window);
