#!/usr/bin/env python3

import argparse
import copy
import json
import re
import zipfile
from collections import Counter
from pathlib import Path
from xml.etree import ElementTree as ET


NS = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "m": "http://schemas.openxmlformats.org/officeDocument/2006/math",
}

ET.register_namespace("w", NS["w"])
ET.register_namespace("m", NS["m"])

W = "{%s}" % NS["w"]
M = "{%s}" % NS["m"]

CORE_MATH_TAGS = {
    "acc", "bar", "borderBox", "box", "d", "deg", "den", "e", "eqArr", "f", "fName",
    "func", "groupChr", "lim", "limLow", "limUpp", "m", "nary", "num", "phant", "rad",
    "r", "sSub", "sSubSup", "sSup", "sub", "sup", "t",
}

STRUCTURAL_MATH_TAGS = {
    "acc", "bar", "borderBox", "box", "d", "deg", "den", "e", "eqArr", "f", "fName",
    "func", "groupChr", "lim", "limLow", "limUpp", "m", "nary", "num", "phant", "rad",
    "sSub", "sSubSup", "sSup", "sub", "sup",
}

ANNOTATION_STYLE = {
    "FLAG": {"color": "C00000", "highlight": "yellow"},
    "INVALID": {"color": "C00000", "highlight": "yellow"},
}

FRACTION_TYPE_VALUES = {
    "lin": "CFraction.linear",
    "skw": "CFraction.skewed",
}


def local_name(tag: str) -> str:
    return tag.split("}", 1)[1] if "}" in tag else tag


def qn(prefix: str, name: str) -> str:
    return "{%s}%s" % (NS[prefix], name)


def iter_docx_files(root: Path):
    for path in sorted(root.rglob("*.docx")):
        if path.is_file():
            if "annotated" in path.parts:
                continue
            yield path


def get_attr_value(node: ET.Element, name: str) -> str:
    return (
        node.get(qn("w", name))
        or node.get(qn("m", name))
        or node.get(name)
        or ""
    )


def get_text_content(node: ET.Element) -> str:
    parts = []
    for child in node.iter():
        lname = local_name(child.tag)
        if lname in {"t", "delText", "instrText"} and child.text:
            parts.append(child.text)
    return "".join(parts)


def get_rfont_names(eq_node: ET.Element):
    values = set()
    for rfonts in eq_node.findall(".//w:rFonts", NS):
        for key in ("ascii", "hAnsi", "cs", "eastAsia"):
            value = get_attr_value(rfonts, key)
            if value:
                values.add(value.strip())
    return values


def is_neutral_math_font(name: str) -> bool:
    return name.strip().lower() == "cambria math"


def analyze_equation(eq_node: ET.Element, include_formatting: bool = False):
    reasons = []
    text = get_text_content(eq_node).strip()
    has_structural_content = False
    for child in eq_node.iter():
        lname = local_name(child.tag)
        if lname in STRUCTURAL_MATH_TAGS:
            has_structural_content = True
            break

    if not has_structural_content and not text:
        reasons.append(("INVALID", "empty-or-textless-equation"))

    if include_formatting:
        if eq_node.find(".//m:grow", NS) is not None:
            reasons.append(("FLAG", "CNary.grow"))

        if eq_node.find(".//m:cGp", NS) is not None:
            reasons.append(("FLAG", "CMathMatrix.cGp"))
        if eq_node.find(".//m:cSp", NS) is not None:
            reasons.append(("FLAG", "CMathMatrix.cSp"))
        if eq_node.find(".//m:rSp", NS) is not None:
            reasons.append(("FLAG", "CMathMatrix.rSp"))
        if eq_node.find(".//m:mcJc", NS) is not None:
            reasons.append(("FLAG", "CMathMatrix.mcJc"))
        if eq_node.find(".//m:baseJc", NS) is not None:
            reasons.append(("FLAG", "CMathMatrix.baseJc"))
        if eq_node.find(".//m:plcHide", NS) is not None:
            reasons.append(("FLAG", "CMathMatrix.plcHide"))

        for prop in ("hideTop", "hideBot", "hideLeft", "hideRight"):
            if eq_node.find(".//m:%s" % prop, NS) is not None:
                reasons.append(("FLAG", "CBorderBox.%s" % prop))
        for prop in ("strikeH", "strikeV", "strikeTLBR", "strikeBLTR"):
            if eq_node.find(".//m:%s" % prop, NS) is not None:
                reasons.append(("FLAG", "CBorderBox.%s" % prop))

        if eq_node.find(".//m:zeroWid", NS) is not None:
            reasons.append(("FLAG", "CPhantom.zeroWid"))
        if eq_node.find(".//m:zeroAsc", NS) is not None:
            reasons.append(("FLAG", "CPhantom.zeroAsc"))
        if eq_node.find(".//m:zeroDesc", NS) is not None:
            reasons.append(("FLAG", "CPhantom.zeroDesc"))
        if eq_node.find(".//m:transp", NS) is not None:
            reasons.append(("FLAG", "CPhantom.transp"))

        if eq_node.find(".//w:vertAlign", NS) is not None:
            reasons.append(("FLAG", "ParaRun.TextPr.VertAlign"))
        if eq_node.find(".//w:color", NS) is not None:
            reasons.append(("FLAG", "ParaRun.TextPr.Color"))
        if eq_node.find(".//w:highlight", NS) is not None:
            reasons.append(("FLAG", "ParaRun.TextPr.Highlight"))
        if eq_node.find(".//w:rStyle", NS) is not None:
            reasons.append(("FLAG", "ParaRun.TextPr.RStyle"))

        font_names = sorted(name for name in get_rfont_names(eq_node) if not is_neutral_math_font(name))
        if font_names:
            reasons.append(("FLAG", "ParaRun.TextPr.RFonts[%s]" % ",".join(font_names[:3])))

        for type_node in eq_node.findall(".//m:type", NS):
            value = get_attr_value(type_node, "val")
            if value in FRACTION_TYPE_VALUES:
                reasons.append(("FLAG", FRACTION_TYPE_VALUES[value]))

    if "#" in text and ("(" in text and ")" in text):
        reasons.append(("FLAG", "possible-eqno-marker"))

    deduped = []
    seen = set()
    for level, code in reasons:
        key = (level, code)
        if key in seen:
            continue
        seen.add(key)
        deduped.append({"level": level, "code": code})

    return deduped


def make_annotation_paragraph(eq_infos):
    paragraph = ET.Element(qn("w", "p"))
    ppr = ET.SubElement(paragraph, qn("w", "pPr"))
    spacing = ET.SubElement(ppr, qn("w", "spacing"))
    spacing.set(qn("w", "before"), "0")
    spacing.set(qn("w", "after"), "0")

    for info_index, info in enumerate(eq_infos):
        run = ET.SubElement(paragraph, qn("w", "r"))
        rpr = ET.SubElement(run, qn("w", "rPr"))
        style = ANNOTATION_STYLE[info["level"]]
        color = ET.SubElement(rpr, qn("w", "color"))
        color.set(qn("w", "val"), style["color"])
        highlight = ET.SubElement(rpr, qn("w", "highlight"))
        highlight.set(qn("w", "val"), style["highlight"])
        bold = ET.SubElement(rpr, qn("w", "b"))
        bold.set(qn("w", "val"), "1")

        text = ET.SubElement(run, qn("w", "t"))
        text.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
        text.text = "[OO-%s %s] %s" % (info["level"], info["equation_id"], ", ".join(info["codes"]))

        if info_index < len(eq_infos) - 1:
            br = ET.SubElement(run, qn("w", "br"))
            br.set(qn("w", "type"), "textWrapping")

    return paragraph


def annotate_docx(path: Path, output_path: Path, manifest_stream, include_formatting: bool = False):
    try:
        with zipfile.ZipFile(path, "r") as zin:
            entries = {name: zin.read(name) for name in zin.namelist()}
    except zipfile.BadZipFile:
        return {
            "doc": str(path),
            "status": "invalid-docx-zip",
            "flagged_equations": 0,
        }

    if "word/document.xml" not in entries:
        return {
            "doc": str(path),
            "status": "invalid-docx-package",
            "flagged_equations": 0,
        }

    try:
        root = ET.fromstring(entries["word/document.xml"])
    except ET.ParseError as exc:
        return {
            "doc": str(path),
            "status": "invalid-document-xml",
            "error": str(exc),
            "flagged_equations": 0,
        }

    parent_map = {child: parent for parent in root.iter() for child in parent}
    paragraphs = []
    for paragraph in root.iter(qn("w", "p")):
        eq_nodes = []
        for eq_node in paragraph.findall(".//m:oMath", NS) + paragraph.findall(".//m:oMathPara", NS):
            parent = parent_map.get(eq_node)
            parent_lname = local_name(parent.tag) if parent is not None else ""
            if parent_lname in {"oMath", "oMathPara"}:
                continue
            eq_nodes.append(eq_node)
        if eq_nodes:
            paragraphs.append((paragraph, eq_nodes))

    flagged_by_paragraph = {}
    doc_records = []
    eq_counter = 0

    for paragraph, eq_nodes in paragraphs:
        paragraph_flags = []
        for eq_node in eq_nodes:
            eq_counter += 1
            equation_id = "eq-%04d" % eq_counter
            reasons = analyze_equation(eq_node, include_formatting=include_formatting)
            if not reasons:
                continue

            codes = [item["code"] for item in reasons]
            level = "INVALID" if any(item["level"] == "INVALID" for item in reasons) else "FLAG"
            paragraph_flags.append({
                "equation_id": equation_id,
                "level": level,
                "codes": codes,
            })
            doc_records.append({
                "doc": str(path),
                "equation_id": equation_id,
                "level": level,
                "codes": codes,
                "text_preview": get_text_content(eq_node)[:200],
            })

        if paragraph_flags:
            flagged_by_paragraph[paragraph] = paragraph_flags

    if not flagged_by_paragraph:
        return {
            "doc": str(path),
            "status": "ok",
            "flagged_equations": 0,
        }

    insertions = []
    for paragraph, infos in flagged_by_paragraph.items():
        parent = parent_map.get(paragraph)
        if parent is None:
            continue
        insertions.append((parent, paragraph, make_annotation_paragraph(infos)))

    for parent, paragraph, annotation in reversed(insertions):
        children = list(parent)
        index = children.index(paragraph)
        parent.insert(index + 1, annotation)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    updated_document = ET.tostring(root, encoding="utf-8", xml_declaration=True)

    with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED) as zout:
        for name, data in entries.items():
            if name == "word/document.xml":
                zout.writestr(name, updated_document)
            else:
                zout.writestr(name, data)

    for record in doc_records:
        manifest_stream.write(json.dumps(record, ensure_ascii=False) + "\n")

    return {
        "doc": str(path),
        "status": "annotated",
        "flagged_equations": len(doc_records),
        "output": str(output_path),
    }


def parse_args():
    parser = argparse.ArgumentParser(description="Create annotated copies of DOCX files with flagged/invalid OMML equations.")
    parser.add_argument("input_dir", help="Directory containing .docx files")
    parser.add_argument("--output-dir", default=None, help="Output directory. Defaults to <input_dir>/annotated")
    parser.add_argument("--include-formatting", action="store_true", help="Also flag font/color/highlight/vertAlign formatting issues")
    return parser.parse_args()


def main():
    args = parse_args()
    input_dir = Path(args.input_dir).expanduser().resolve()
    output_dir = Path(args.output_dir).expanduser().resolve() if args.output_dir else input_dir / "annotated"
    output_dir.mkdir(parents=True, exist_ok=True)

    manifest_path = output_dir / "annotation-manifest.jsonl"
    summary_path = output_dir / "annotation-summary.json"

    docs = list(iter_docx_files(input_dir))
    summary = {
        "input_dir": str(input_dir),
        "output_dir": str(output_dir),
        "docx_files": len(docs),
        "annotated_docs": 0,
        "flagged_equations": 0,
        "status_counts": Counter(),
        "top_codes": Counter(),
        "docs": [],
    }

    with manifest_path.open("w", encoding="utf-8") as manifest_stream:
        for docx_path in docs:
            output_path = output_dir / docx_path.relative_to(input_dir)
            result = annotate_docx(docx_path, output_path, manifest_stream, include_formatting=args.include_formatting)
            summary["docs"].append(result)
            summary["status_counts"][result["status"]] += 1
            if result["status"] == "annotated":
                summary["annotated_docs"] += 1
                summary["flagged_equations"] += result["flagged_equations"]

    for line in manifest_path.open("r", encoding="utf-8"):
        record = json.loads(line)
        for code in record["codes"]:
            summary["top_codes"][code] += 1

    summary["status_counts"] = dict(summary["status_counts"])
    summary["top_codes"] = dict(summary["top_codes"].most_common(50))
    summary_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print("Annotated docs:", summary["annotated_docs"])
    print("Flagged equations:", summary["flagged_equations"])
    print("Manifest:", manifest_path)
    print("Summary:", summary_path)


if __name__ == "__main__":
    raise SystemExit(main())
