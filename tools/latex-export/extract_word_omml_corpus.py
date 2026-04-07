#!/usr/bin/env python3

import argparse
import json
import zipfile
from collections import Counter
from pathlib import Path
from xml.etree import ElementTree as ET


WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
MATH_NS = "http://schemas.openxmlformats.org/officeDocument/2006/math"
NS = {"w": WORD_NS, "m": MATH_NS}


def local_name(tag: str) -> str:
    if "}" in tag:
        return tag.rsplit("}", 1)[1]
    return tag


def get_docx_document_xml(path: Path) -> bytes | None:
    try:
        with zipfile.ZipFile(path) as archive:
            if "word/document.xml" not in archive.namelist():
                return None
            return archive.read("word/document.xml")
    except Exception:
        return None


def extract_equations_from_docx(path: Path) -> tuple[list[dict], Counter]:
    xml_bytes = get_docx_document_xml(path)
    if xml_bytes is None:
        return [], Counter()

    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError:
        return [], Counter()

    equations = []
    tag_counter: Counter = Counter()

    for equation_index, element in enumerate(root.iter(), start=0):
        lname = local_name(element.tag)
        if lname not in {"oMath", "oMathPara"}:
            continue

        tags = sorted({local_name(node.tag) for node in element.iter()})
        for tag in tags:
            tag_counter[tag] += 1

        equations.append(
            {
                "doc_path": str(path),
                "equation_index": equation_index,
                "equation_type": lname,
                "tag_count": len(tags),
                "tags": tags,
                "xml": ET.tostring(element, encoding="unicode"),
            }
        )

    return equations, tag_counter


def load_manifest(manifest_path: Path) -> list[Path]:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    doc_paths = []
    for root_entry in manifest["roots"]:
        files = root_entry.get("files", [])
        for file_entry in files:
            if file_entry.get("type") != "docx":
                continue
            if file_entry.get("status") != "ok":
                continue
            if file_entry.get("equation_count", 0) <= 0:
                continue
            doc_paths.append(Path(file_entry["path"]))
    return doc_paths


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract OMML equations from a Word corpus manifest.")
    parser.add_argument(
        "--manifest",
        required=True,
        help="Path to the JSON manifest from scan_word_corpus.py",
    )
    parser.add_argument(
        "--output-jsonl",
        required=True,
        help="Path to write equation records as JSONL",
    )
    parser.add_argument(
        "--output-summary",
        required=True,
        help="Path to write extraction summary JSON",
    )
    parser.add_argument(
        "--limit-docs",
        type=int,
        default=0,
        help="Optional cap on number of documents to extract",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    manifest_path = Path(args.manifest).expanduser().resolve()
    output_jsonl = Path(args.output_jsonl).expanduser().resolve()
    output_summary = Path(args.output_summary).expanduser().resolve()

    doc_paths = load_manifest(manifest_path)
    if args.limit_docs > 0:
        doc_paths = doc_paths[: args.limit_docs]

    output_jsonl.parent.mkdir(parents=True, exist_ok=True)
    output_summary.parent.mkdir(parents=True, exist_ok=True)

    total_equations = 0
    total_docs = 0
    aggregate_tags: Counter = Counter()
    per_doc_counts = []

    with output_jsonl.open("w", encoding="utf-8") as stream:
        for doc_path in doc_paths:
            equations, tag_counter = extract_equations_from_docx(doc_path)
            if not equations:
                continue

            total_docs += 1
            total_equations += len(equations)
            aggregate_tags.update(tag_counter)
            per_doc_counts.append(
                {
                    "path": str(doc_path),
                    "equation_count": len(equations),
                }
            )

            for record in equations:
                stream.write(json.dumps(record, ensure_ascii=False) + "\n")

    summary = {
        "manifest": str(manifest_path),
        "doc_count": total_docs,
        "equation_count": total_equations,
        "top_documents": sorted(per_doc_counts, key=lambda item: item["equation_count"], reverse=True)[:20],
        "top_tags": [
            {"tag": tag, "document_occurrences": count}
            for tag, count in aggregate_tags.most_common(40)
        ],
    }

    output_summary.write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {total_equations} equations from {total_docs} documents")
    print(f"JSONL: {output_jsonl}")
    print(f"Summary: {output_summary}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
