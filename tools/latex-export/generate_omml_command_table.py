#!/usr/bin/env python3
"""
Generate OMML command → LaTeX mapping table.

Joins two existing data sources:
  1. mathContent.js:  OMML command name → Unicode code point
     e.g., ['\\inc', 0x2206]
  2. LaTeXReferenceSymbols.generated.js + ExplicitSymbols:  Unicode char → LaTeX
     e.g., '∆' → '\\Delta'

Output: OmmlCommandAliases.generated.js
  A lookup table: OMML command string → {latex, unicode, action}

This eliminates the root cause of OMML pass-through bugs:
  ExportLeafString receives "\inc" → looks up OmmlCommandAliases["\\inc"]
  → gets {latex: "\\Delta", ...} → emits proper K.Command token.
"""

import json
import re
import sys
from pathlib import Path

SDKJS_ROOT = Path(__file__).resolve().parents[2]
MATH_CONTENT_PATH = SDKJS_ROOT / "word/Math/mathContent.js"
REFERENCE_SYMBOLS_PATH = SDKJS_ROOT / "word/Math/LaTeXReferenceSymbols.generated.js"
EXPORT_SYMBOLS_PATH = SDKJS_ROOT / "word/Math/LaTeXExportSymbols.js"
OUTPUT_PATH = SDKJS_ROOT / "word/Math/OmmlCommandAliases.generated.js"

# Commands that are structural (accents, over/under scripts, delimiters)
# and cannot be mapped to a simple LaTeX equivalent without context.
STRUCTURAL_COMMANDS = {
    "\\above", "\\below",  # over/under scripts — need \overset/\underset with args
    "\\begin", "\\end",    # delimiter pairs
    "\\open", "\\close",   # delimiter pairs
    "\\matrix",            # matrix environment
    "\\eqarray",           # equation array
    "\\rect",              # rectangle/box
    "\\asmash", "\\dsmash", "\\hsmash",  # smash variants
    "\\phantom", "\\hphantom", "\\vphantom",  # phantoms (already valid LaTeX)
    "\\root",              # nth root
    "\\naryand",           # alignment separator
    "\\cases",             # cases environment
    "\\pmatrix",           # parenthesized matrix
    "\\Vmatrix",           # double-bar matrix
    "\\overbracket",       # over bracket (U+23B4)
    "\\underbracket",      # under bracket (U+23B5)
    "\\overparen",         # over parenthesis (U+23DC)
    "\\underparen",        # under parenthesis (U+23DD)
    "\\overshell",         # over shell accent (U+23E0)
    "\\smash",             # smash (already valid LaTeX)
    "\\middle",            # middle delimiter (already valid LaTeX)
}

# Commands that are already renderer-portable and should remain unchanged.
# Do not alias these just because unicode.xml suggests an alternate spelling.
PORTABLE_LATEX_COMMANDS = {
    "\\bigsqcup",
    "\\clubsuit",
}

# Commands that should be silently removed (invisible operators, marks)
REMOVE_COMMANDS = {
    "\\funcapply",   # invisible function application U+2061
    "\\itimes",      # invisible times U+2062
    "\\imark",       # OMML insertion mark
    "\\jmark",       # OMML junction mark
    "\\of",          # OMML function-of separator
    "\\zerosp",      # zero-width space
    "\\zwsp",        # zero-width space variant
    "\\zwnj",        # zero-width non-joiner U+200C
}

# Commands that ARE valid standard LaTeX (no mapping needed)
VALID_LATEX_COMMANDS = {
    # Greek letters
    "\\alpha", "\\beta", "\\gamma", "\\delta", "\\epsilon", "\\varepsilon",
    "\\zeta", "\\eta", "\\theta", "\\vartheta", "\\iota", "\\kappa",
    "\\lambda", "\\mu", "\\nu", "\\xi", "\\pi", "\\varpi", "\\rho",
    "\\varrho", "\\sigma", "\\varsigma", "\\tau", "\\upsilon", "\\phi",
    "\\varphi", "\\chi", "\\psi", "\\omega",
    "\\Gamma", "\\Delta", "\\Theta", "\\Lambda", "\\Xi", "\\Pi",
    "\\Sigma", "\\Upsilon", "\\Phi", "\\Psi", "\\Omega",
    # Binary operators
    "\\pm", "\\mp", "\\times", "\\div", "\\cdot", "\\ast", "\\star",
    "\\circ", "\\bullet", "\\oplus", "\\ominus", "\\otimes",
    "\\cap", "\\cup", "\\vee", "\\wedge", "\\setminus",
    # Relations
    "\\le", "\\leq", "\\ge", "\\geq", "\\equiv", "\\prec", "\\succ",
    "\\sim", "\\simeq", "\\ll", "\\gg", "\\subset", "\\supset",
    "\\subseteq", "\\supseteq", "\\in", "\\ni", "\\notin",
    "\\approx", "\\cong", "\\neq", "\\ne", "\\propto", "\\perp",
    "\\mid", "\\parallel",
    # Arrows
    "\\leftarrow", "\\rightarrow", "\\leftrightarrow",
    "\\Leftarrow", "\\Rightarrow", "\\Leftrightarrow",
    "\\uparrow", "\\downarrow", "\\mapsto",
    "\\nearrow", "\\searrow", "\\swarrow", "\\nwarrow",
    # Big operators
    "\\sum", "\\prod", "\\coprod", "\\int", "\\oint", "\\iint", "\\iiint",
    "\\iiiint",
    "\\bigcap", "\\bigcup", "\\bigodot", "\\bigoplus", "\\bigotimes",
    # Misc symbols
    "\\infty", "\\partial", "\\nabla", "\\forall", "\\exists",
    "\\emptyset", "\\neg", "\\angle", "\\triangle",
    "\\heartsuit", "\\frown",
    # Functions
    "\\sin", "\\cos", "\\tan", "\\cot", "\\sec", "\\csc",
    "\\arcsin", "\\arccos", "\\arctan",
    "\\sinh", "\\cosh", "\\tanh", "\\coth",
    "\\log", "\\ln", "\\exp", "\\lim", "\\sup", "\\inf",
    "\\max", "\\min", "\\det", "\\dim", "\\ker", "\\hom",
    "\\arg", "\\deg", "\\gcd", "\\Pr", "\\mod",
    # Accents
    "\\hat", "\\check", "\\tilde", "\\acute", "\\grave",
    "\\dot", "\\ddot", "\\breve", "\\bar", "\\vec",
    "\\overline", "\\underline", "\\widehat", "\\widetilde",
    "\\overbrace", "\\underbrace", "\\overset", "\\underset",
    # Structures
    "\\frac", "\\dfrac", "\\binom", "\\sqrt",
    "\\left", "\\right",
    # Font commands
    "\\mathrm", "\\mathit", "\\mathbf", "\\mathsf", "\\mathbb",
    "\\mathcal", "\\mathfrak", "\\boldsymbol",
    "\\text", "\\operatorname",
    # Spacing
    "\\quad", "\\qquad",
    # Dots
    "\\ldots", "\\cdots", "\\vdots", "\\ddots",
    # Misc
    "\\aleph", "\\wp", "\\Re", "\\Im", "\\ell",
    "\\hbar", "\\imath", "\\jmath",
    "\\dagger", "\\ddagger",
    "\\prime",
    # Delimiters
    "\\langle", "\\rangle", "\\lfloor", "\\rfloor", "\\lceil", "\\rceil",
    "\\vert", "\\|",
    "\\to",
    "\\not", "\\top", "\\bot",
    "\\therefore", "\\because",
    "\\phantom", "\\hphantom", "\\vphantom",
    "\\displaystyle", "\\textstyle",
    "\\cancel", "\\bcancel", "\\xcancel",
    "\\boxed", "\\smash",
    "\\color", "\\textcolor",
}

# Manual overrides for OMML commands where the Unicode lookup gives a suboptimal result
MANUAL_OVERRIDES = {
    # Uppercase Greek letters without standard portable LaTeX commands
    "\\Alpha": "A",
    "\\Beta": "B",
    "\\Epsilon": "E",
    "\\Eta": "H",
    "\\Iota": "I",
    "\\Kappa": "K",
    "\\Rho": "P",
    "\\Tau": "T",
    "\\Zeta": "Z",

    # Symbols where Unicode lookup gives suboptimal or missing result
    "\\inc": "\\Delta",          # U+2206 INCREMENT → \Delta (more standard)
    "\\degc": "{}^{\\circ}\\mathrm{C}",  # degree Celsius
    "\\degf": "{}^{\\circ}\\mathrm{F}",  # degree Fahrenheit

    # Spacing commands
    "\\thicksp": "\\;",          # thick space
    "\\thinsp": "\\,",           # thin space
    "\\medsp": "\\:",            # medium space
    "\\emsp": "\\quad",          # em space
    "\\ensp": "\\enspace",       # en space
    "\\hairsp": "\\,",           # hair space
    "\\nbhyph": "\\text{-}",    # non-breaking hyphen

    # Accent commands
    "\\hvec": "\\overleftharpoon",   # harpoon vector accent (U+20D0 combining)
    "\\tvec": "\\vec",               # vector accent
    "\\lvec": "\\overleftarrow",     # left vector accent
    "\\lhvec": "\\overleftharpoon",  # left harpoon vector (U+20D0)
    "\\rhvec": "\\overrightarrow",   # right harpoon vector (U+20D1)
    "\\Bar": "\\overline",           # double bar accent (U+033F combining)
    "\\Ubar": "\\underline",         # double underbar (U+0333 combining)
    "\\ubar": "\\underline",         # underbar (U+0332 combining)
    "\\underbar": "\\underline",     # underbar block char (U+2581)
    "\\overbar": "\\bar",            # accent semantics, not text macron

    # Delimiters
    "\\norm": "\\|",             # norm delimiter
    "\\lbbrack": "\\llbracket",  # double left bracket
    "\\rbbrack": "\\rrbracket",  # double right bracket
    "\\Bra": "\\langle",        # Dirac bra
    "\\Ket": "\\rangle",        # Dirac ket
    "\\bra": "\\langle",        # Dirac bra (U+27E8)
    "\\ket": "\\rangle",        # Dirac ket (U+27E9)
    "\\Rangle": "\\rangle\\!\\rangle",  # double right angle bracket (U+27EB)
    "\\Rbrack": "\\rrbracket",  # double right bracket (U+27E7)
    "\\lbrack": "[",             # left bracket (U+005B)
    "\\rbrack": "]",             # right bracket (U+005D)
    "\\vbar": "|",               # vertical bar (U+2502)

    # Double-struck math constants (italic math identifiers)
    "\\Dd": "\\mathrm{D}",      # double-struck italic capital D (U+2145)
    "\\dd": "\\mathrm{d}",      # double-struck italic small d (U+2146)
    "\\ee": "\\mathrm{e}",      # double-struck italic small e (U+2147)
    "\\ii": "\\mathrm{i}",      # double-struck italic small i (U+2148)
    "\\jj": "\\mathrm{j}",      # double-struck italic small j (U+2149)

    # Primes
    "\\pprime": "''",            # double prime (U+2033)
    "\\ppprime": "'''",          # triple prime (U+2034)
    "\\pppprime": "''''",        # quadruple prime (U+2057)

    # Division/fraction
    "\\over": "/",               # fraction slash (U+002F)
    "\\ldiv": "/",               # long division slash (U+2215)
    "\\ldivide": "/",            # long division slash (U+2215)
    "\\sdiv": "/",               # solidus fraction (U+2044)
    "\\sdivide": "/",            # solidus fraction (U+2044)
    "\\ratio": ":",              # ratio (U+2236)

    # Miscellaneous
    "\\cbrt": "\\sqrt[3]",       # cube root (U+221B)
    "\\qdrt": "\\sqrt[4]",      # fourth root (U+221C)
    "\\defeq": "\\triangleq",   # defined-as equal (U+225D)
    "\\bet": "\\beth",          # beth (U+2136)
    "\\degree": "{}^{\\circ}",  # portable degree sign in math
}


def parse_mathcontent_mappings():
    """Extract OMML command → Unicode code point from mathContent.js."""
    text = MATH_CONTENT_PATH.read_text(encoding="utf-8")

    # Match patterns like: ['\\inc', 0x2206]
    pattern = re.compile(r"\['(\\\\[a-zA-Z]+)',\s*0x([0-9A-Fa-f]+)\]")
    mappings = {}

    for match in pattern.finditer(text):
        cmd = match.group(1).replace("\\\\", "\\")  # \\inc → \inc
        codepoint = int(match.group(2), 16)
        mappings[cmd] = codepoint

    return mappings


def parse_reference_symbols():
    """Extract Unicode char → LaTeX from LaTeXReferenceSymbols.generated.js."""
    text = REFERENCE_SYMBOLS_PATH.read_text(encoding="utf-8")

    # Match patterns like: '∆': '\\Delta',
    pattern = re.compile(r"'([^']+)':\s*'([^']+)'")
    mappings = {}

    for match in pattern.finditer(text):
        symbol = match.group(1)
        latex = match.group(2)
        # Unescape JS string escapes to Python runtime values
        # JS source '\\Alpha' (regex captures \\Alpha) → Python runtime \Alpha
        symbol = symbol.replace("\\\\", "\\")
        latex = latex.replace("\\\\", "\\")
        if "\\x" in symbol or "\\u" in symbol:
            try:
                symbol = symbol.encode().decode("unicode_escape")
            except (UnicodeDecodeError, ValueError):
                pass
        mappings[symbol] = latex

    return mappings


def parse_explicit_symbols():
    """Extract ExplicitSymbols from LaTeXExportSymbols.js."""
    text = EXPORT_SYMBOLS_PATH.read_text(encoding="utf-8")

    # Find ExplicitSymbols block
    mappings = {}
    in_block = False
    for line in text.split("\n"):
        if "ExplicitSymbols" in line and "{" in line:
            in_block = True
            continue
        if in_block and line.strip().startswith("};"):
            break
        if in_block:
            # Match: "∆": {kind: "command", value: "\\Delta"},
            m = re.search(r'"([^"]+)":\s*\{.*?value:\s*"([^"]+)"', line)
            if m:
                mappings[m.group(1)] = m.group(2)

    return mappings


def build_alias_table():
    """Join OMML commands → Unicode → LaTeX and produce the alias table."""
    omml_to_unicode = parse_mathcontent_mappings()
    unicode_to_latex = parse_reference_symbols()
    explicit_symbols = parse_explicit_symbols()

    # Merge explicit symbols into unicode_to_latex (explicit takes precedence)
    for sym, latex in explicit_symbols.items():
        unicode_to_latex[sym] = latex

    aliases = {}
    unmapped = []
    stats = {
        "total_omml": len(omml_to_unicode),
        "valid_latex": 0,
        "mapped_via_unicode": 0,
        "manual_override": 0,
        "structural_skip": 0,
        "remove": 0,
        "unmapped": 0,
    }

    for cmd, codepoint in sorted(omml_to_unicode.items()):
        # Skip commands that are already valid LaTeX
        if cmd in VALID_LATEX_COMMANDS:
            stats["valid_latex"] += 1
            continue

        if cmd in PORTABLE_LATEX_COMMANDS:
            stats["valid_latex"] += 1
            continue

        # Skip structural commands (need context-aware handling)
        if cmd in STRUCTURAL_COMMANDS:
            stats["structural_skip"] += 1
            continue

        # Commands to silently remove
        if cmd in REMOVE_COMMANDS:
            aliases[cmd] = {
                "action": "remove",
                "unicode": f"U+{codepoint:04X}",
                "desc": "remove (invisible/structural)",
            }
            stats["remove"] += 1
            continue

        # Manual overrides take priority
        if cmd in MANUAL_OVERRIDES:
            aliases[cmd] = {
                "action": "replace",
                "latex": MANUAL_OVERRIDES[cmd],
                "unicode": f"U+{codepoint:04X}",
            }
            stats["manual_override"] += 1
            continue

        # Try Unicode lookup
        char = chr(codepoint)
        latex = unicode_to_latex.get(char, "")

        if latex:
            aliases[cmd] = {
                "action": "replace",
                "latex": latex,
                "unicode": f"U+{codepoint:04X}",
            }
            stats["mapped_via_unicode"] += 1
        else:
            unmapped.append((cmd, codepoint, char))
            stats["unmapped"] += 1

    return aliases, unmapped, stats


def js_string_literal(s):
    """Convert a Python runtime string to a JS string literal.

    All values are stored as Python runtime strings (single backslash = one \\).
    This function escapes them for JS source: \\ → \\\\, ' → \\'.
    """
    escaped = s.replace("\\", "\\\\").replace("'", "\\'")
    return f"'{escaped}'"


def write_generated_js(aliases):
    """Write the OmmlCommandAliases.generated.js file."""
    replace_entries = {k: v for k, v in aliases.items() if v["action"] == "replace"}
    remove_entries = {k: v for k, v in aliases.items() if v["action"] == "remove"}

    lines = [
        "/*",
        " * Generated OMML command → LaTeX alias table.",
        " * Source: mathContent.js (OMML→Unicode) joined with LaTeXReferenceSymbols (Unicode→LaTeX).",
        " * Do not edit manually; update via tools/latex-export/generate_omml_command_table.py",
        " */",
        "",
        "\"use strict\";",
        "",
        "(function (window) {",
        "\tconst AscMath = window[\"AscMath\"] = window[\"AscMath\"] || {};",
        f"\tAscMath.OmmlCommandAliasesMeta = {{",
        f"\t\treplaceEntries: {len(replace_entries)},",
        f"\t\tremoveEntries: {len(remove_entries)},",
        f"\t\ttotalEntries: {len(aliases)},",
        "\t};",
        "",
        "\t// OMML commands that map to standard LaTeX equivalents",
        "\tAscMath.OmmlCommandAliases = Object.freeze({",
    ]

    for cmd in sorted(replace_entries.keys()):
        entry = replace_entries[cmd]
        lines.append(f"\t\t{js_string_literal(cmd)}: {js_string_literal(entry['latex'])},  // {entry['unicode']}")

    lines.extend([
        "\t});",
        "",
        "\t// OMML commands that should be silently removed (invisible operators, marks)",
        "\tAscMath.OmmlCommandRemoveList = Object.freeze({",
    ])

    for cmd in sorted(remove_entries.keys()):
        entry = remove_entries[cmd]
        lines.append(f"\t\t{js_string_literal(cmd)}: true,  // {entry['unicode']} {entry.get('desc', '')}")

    lines.extend([
        "\t});",
        "})(window);",
        "",
    ])

    OUTPUT_PATH.write_text("\n".join(lines), encoding="utf-8")


def main():
    aliases, unmapped, stats = build_alias_table()

    print(f"OMML Command Alias Table Generator")
    print(f"{'='*50}")
    print(f"Total OMML commands:     {stats['total_omml']}")
    print(f"Already valid LaTeX:     {stats['valid_latex']}")
    print(f"Mapped via Unicode:      {stats['mapped_via_unicode']}")
    print(f"Manual overrides:        {stats['manual_override']}")
    print(f"Structural (context):    {stats['structural_skip']}")
    print(f"Remove (invisible):      {stats['remove']}")
    print(f"Unclassified:            {stats['unmapped']}")
    print()

    if unmapped:
        print(f"Unmapped commands ({len(unmapped)}):")
        for cmd, cp, char in unmapped:
            print(f"  {cmd:20s}  U+{cp:04X}  {char!r}")

    write_generated_js(aliases)
    print(f"\nGenerated {len(aliases)} aliases → {OUTPUT_PATH}")


if __name__ == "__main__":
    sys.exit(main())
