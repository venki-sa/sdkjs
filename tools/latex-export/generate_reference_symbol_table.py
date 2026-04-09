#!/usr/bin/env python3

import ssl
import sys
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path


SOURCE_URL = "https://www.w3.org/Math/characters/unicode.xml"
OUTPUT_PATH = Path(__file__).resolve().parents[2] / "word/Math/LaTeXReferenceSymbols.generated.js"


def fetch_source_xml():
    try:
        with urllib.request.urlopen(SOURCE_URL, timeout=60) as response:
            return response.read()
    except Exception:
        context = ssl._create_unverified_context()
        with urllib.request.urlopen(SOURCE_URL, timeout=60, context=context) as response:
            return response.read()


def normalize_latex(value):
    if not value:
        return ""

    return value.strip()


def collect_reference_symbols(xml_bytes):
    root = ET.fromstring(xml_bytes)
    result = {}

    for character in root.findall(".//character"):
        dec = character.attrib.get("dec", "")
        if not dec.isdigit():
            continue

        codepoint = int(dec)
        if codepoint <= 0x7F:
            continue

        latex = normalize_latex(character.findtext("latex"))
        if not latex:
            continue

        symbol = chr(codepoint)
        result[symbol] = latex

    return dict(sorted(result.items(), key=lambda item: ord(item[0])))


def write_generated_js(symbols):
    lines = [
        "/*",
        " * Generated from W3C unicode.xml for strict LaTeX export baseline coverage.",
        " * Source: https://www.w3.org/Math/characters/unicode.xml",
        " * Do not edit manually; update via tools/latex-export/generate_reference_symbol_table.py",
        " */",
        "",
        "\"use strict\";",
        "",
        "(function (window) {",
        "\tconst AscMath = window[\"AscMath\"] = window[\"AscMath\"] || {};",
        "\tAscMath.StrictLaTeXReferenceSymbolsMeta = {",
        "\t\tsource: \"W3C unicode.xml\",",
        f"\t\tentries: {len(symbols)},",
        "\t};",
        "\tAscMath.StrictLaTeXReferenceSymbols = Object.freeze({",
    ]

    for symbol, latex in symbols.items():
        lines.append(f"\t\t{symbol!r}: {latex!r},")

    lines.extend([
        "\t});",
        "})(window);",
        "",
    ])

    OUTPUT_PATH.write_text("\n".join(lines), encoding="utf-8")


def main():
    xml_bytes = fetch_source_xml()
    symbols = collect_reference_symbols(xml_bytes)
    write_generated_js(symbols)
    print(f"generated {len(symbols)} reference symbols -> {OUTPUT_PATH}")


if __name__ == "__main__":
    sys.exit(main())
