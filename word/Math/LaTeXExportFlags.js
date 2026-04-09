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

	const LaTeXExportMode = {
		Legacy: "legacy",
		StrictShadow: "strict_shadow",
		Strict: "strict",
	};

	const LaTeXExportFallbackPolicy = {
		Legacy: "legacy",
		Error: "error",
	};

	function ParseBooleanFlag(value, defaultValue)
	{
		if (value === undefined || value === null || value === "")
			return !!defaultValue;

		if (typeof value === "boolean")
			return value;

		value = String(value).trim().toLowerCase();
		if (value === "1" || value === "true" || value === "yes" || value === "on")
			return true;
		if (value === "0" || value === "false" || value === "no" || value === "off")
			return false;

		return !!defaultValue;
	}

	function NormalizeLaTeXExportMode(mode)
	{
		if (!mode)
			return "";

		mode = String(mode).trim().toLowerCase();
		if (mode === LaTeXExportMode.Legacy
			|| mode === LaTeXExportMode.Strict
			|| mode === LaTeXExportMode.StrictShadow)
		{
			return mode;
		}

		return "";
	}

	function NormalizeLaTeXExportFallbackPolicy(policy)
	{
		if (!policy)
			return "";

		policy = String(policy).trim().toLowerCase();
		if (policy === LaTeXExportFallbackPolicy.Legacy
			|| policy === LaTeXExportFallbackPolicy.Error)
		{
			return policy;
		}

		return "";
	}

	function GetGlobalLaTeXExportConfig()
	{
		return window["ONLYOFFICE_LATEX_EXPORT"]
			|| window["ONLYOFFICE_UI_FLAGS"]
			|| null;
	}

	function GetProcessEnvironment()
	{
		return window.process && window.process.env ? window.process.env : null;
	}

	function ResolveOptionalBooleanFlag(value)
	{
		if (value === undefined || value === null || value === "")
			return undefined;

		return ParseBooleanFlag(value, false);
	}

	function GetLaTeXExportEnvironmentConfig()
	{
		let globalConfig = GetGlobalLaTeXExportConfig() || {};
		let env = GetProcessEnvironment() || {};

		return {
			mode: NormalizeLaTeXExportMode(globalConfig.latexExportMode || globalConfig.mode || env.OO_LATEX_EXPORT_MODE),
			fallbackPolicy: NormalizeLaTeXExportFallbackPolicy(globalConfig.latexExportFallbackPolicy || globalConfig.fallbackPolicy || env.OO_LATEX_EXPORT_FALLBACK_POLICY),
			packageFeatures: {
				color: ParseBooleanFlag(globalConfig.latexExportColor || (globalConfig.packageFeatures && globalConfig.packageFeatures.color) || env.OO_LATEX_EXPORT_ENABLE_COLOR, false),
				highlight: ParseBooleanFlag(globalConfig.latexExportHighlight || (globalConfig.packageFeatures && globalConfig.packageFeatures.highlight) || env.OO_LATEX_EXPORT_ENABLE_HIGHLIGHT, false),
				cancel: ParseBooleanFlag(globalConfig.latexExportCancel || (globalConfig.packageFeatures && globalConfig.packageFeatures.cancel) || env.OO_LATEX_EXPORT_ENABLE_CANCEL, false),
			},
			matrixSpacingHeuristics: ParseBooleanFlag(globalConfig.latexExportMatrixSpacing || globalConfig.matrixSpacingHeuristics || env.OO_LATEX_EXPORT_MATRIX_SPACING, false),
			htmlPreferStrict: ResolveOptionalBooleanFlag(globalConfig.latexExportHtmlPreferStrict || globalConfig.htmlPreferStrict || env.OO_LATEX_EXPORT_HTML_PREFER_STRICT),
		};
	}

	function SetLaTeXExportMode(mode)
	{
		if (mode !== LaTeXExportMode.Legacy
			&& mode !== LaTeXExportMode.StrictShadow
			&& mode !== LaTeXExportMode.Strict)
		{
			throw new Error("Unknown LaTeX export mode: " + mode);
		}

		AscMath.defaultLaTeXExportMode = mode;
	}

	function GetLaTeXExportMode()
	{
		return AscMath.defaultLaTeXExportMode || LaTeXExportMode.Strict;
	}

	function SetLaTeXExportFallbackPolicy(policy)
	{
		if (policy !== LaTeXExportFallbackPolicy.Legacy
			&& policy !== LaTeXExportFallbackPolicy.Error)
		{
			throw new Error("Unknown LaTeX export fallback policy: " + policy);
		}

		AscMath.defaultLaTeXExportFallbackPolicy = policy;
	}

	function GetLaTeXExportFallbackPolicy()
	{
		return AscMath.defaultLaTeXExportFallbackPolicy || LaTeXExportFallbackPolicy.Legacy;
	}

	function GetLaTeXExportSettings(options)
	{
		options = options || {};
		let envConfig = GetLaTeXExportEnvironmentConfig();

		return {
			mode: options.mode || envConfig.mode || GetLaTeXExportMode(),
			fallbackPolicy: options.fallbackPolicy || envConfig.fallbackPolicy || GetLaTeXExportFallbackPolicy(),
			packageFeatures: options.packageFeatures || envConfig.packageFeatures || {},
			matrixSpacingHeuristics: options.matrixSpacingHeuristics !== undefined ? !!options.matrixSpacingHeuristics : !!envConfig.matrixSpacingHeuristics,
			htmlPreferStrict: options.htmlPreferStrict !== undefined ? !!options.htmlPreferStrict : (envConfig.htmlPreferStrict !== undefined ? !!envConfig.htmlPreferStrict : true),
		};
	}

	AscMath.c_oAscLaTeXExportMode = LaTeXExportMode;
	AscMath.c_oAscLaTeXExportFallbackPolicy = LaTeXExportFallbackPolicy;
	AscMath.SetLaTeXExportMode = SetLaTeXExportMode;
	AscMath.GetLaTeXExportMode = GetLaTeXExportMode;
	AscMath.SetLaTeXExportFallbackPolicy = SetLaTeXExportFallbackPolicy;
	AscMath.GetLaTeXExportFallbackPolicy = GetLaTeXExportFallbackPolicy;
	AscMath.GetLaTeXExportEnvironmentConfig = GetLaTeXExportEnvironmentConfig;
	AscMath.GetLaTeXExportSettings = GetLaTeXExportSettings;
})(window);
