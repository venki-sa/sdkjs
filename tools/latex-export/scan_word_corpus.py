#!/usr/bin/env python3

import argparse
import json
import re
import sys
import zipfile
from pathlib import Path


OMATH_RE = re.compile(r"<m:oMath\b")
OMATHPARA_RE = re.compile(r"<m:oMathPara\b")


def scan_docx(path: Path) -> dict:
    try:
        with zipfile.ZipFile(path) as archive:
            if "word/document.xml" not in archive.namelist():
                return {
                    "path": str(path),
                    "type": "docx",
                    "status": "missing_document_xml",
                    "omath_count": 0,
                    "omath_para_count": 0,
                    "equation_count": 0,
                }

            data = archive.read("word/document.xml").decode("utf-8", "ignore")
    except Exception as error:
        return {
            "path": str(path),
            "type": "docx",
            "status": "error",
            "error": str(error),
            "omath_count": 0,
            "omath_para_count": 0,
            "equation_count": 0,
        }

    omath_count = len(OMATH_RE.findall(data))
    omath_para_count = len(OMATHPARA_RE.findall(data))
    equation_count = omath_count + omath_para_count

    return {
        "path": str(path),
        "type": "docx",
        "status": "ok",
        "omath_count": omath_count,
        "omath_para_count": omath_para_count,
        "equation_count": equation_count,
    }


def scan_file(path: Path) -> dict:
    suffix = path.suffix.lower()
    if suffix == ".docx":
        return scan_docx(path)

    return {
        "path": str(path),
        "type": suffix.lstrip(".") or "unknown",
        "status": "unsupported_binary_doc",
        "omath_count": 0,
        "omath_para_count": 0,
        "equation_count": 0,
    }


def summarize_root(root: Path, files: list[dict]) -> dict:
    docx_total = sum(1 for item in files if item["type"] == "docx")
    doc_total = sum(1 for item in files if item["type"] == "doc")
    ok_files = [item for item in files if item["status"] == "ok"]
    omml_files = [item for item in ok_files if item["equation_count"] > 0]

    return {
        "root": str(root),
        "file_count": len(files),
        "docx_count": docx_total,
        "doc_count": doc_total,
        "ok_docx_count": len(ok_files),
        "omml_docx_count": len(omml_files),
        "equation_count": sum(item["equation_count"] for item in ok_files),
        "sample_omml_files": [
            {
                "path": item["path"],
                "equation_count": item["equation_count"],
            }
            for item in sorted(omml_files, key=lambda entry: entry["equation_count"], reverse=True)[:10]
        ],
    }


def scan_root(root: Path) -> dict:
    files = []
    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        if path.suffix.lower() not in {".docx", ".doc"}:
            continue
        files.append(scan_file(path))

    return {
        "summary": summarize_root(root, files),
        "files": files,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Scan Word corpora for OMML-bearing .docx files.")
    parser.add_argument(
        "roots",
        nargs="+",
        help="Directories containing Word corpora",
    )
    parser.add_argument(
        "--output",
        help="Path to write the JSON manifest",
        default=None,
    )
    parser.add_argument(
        "--summary-only",
        action="store_true",
        help="Print only top-level summary to stdout",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    roots = [Path(root).expanduser().resolve() for root in args.roots]

    manifest = {
        "roots": [],
        "totals": {
            "file_count": 0,
            "docx_count": 0,
            "doc_count": 0,
            "ok_docx_count": 0,
            "omml_docx_count": 0,
            "equation_count": 0,
        },
    }

    for root in roots:
        if not root.exists():
            print(f"Missing root: {root}", file=sys.stderr)
            return 1

        result = scan_root(root)
        manifest["roots"].append(result)

        summary = result["summary"]
        for key in manifest["totals"]:
            manifest["totals"][key] += summary[key]

    output = {
        "totals": manifest["totals"],
        "roots": [entry["summary"] if args.summary_only else entry for entry in manifest["roots"]],
    }

    rendered = json.dumps(output, indent=2, sort_keys=True)

    if args.output:
        output_path = Path(args.output).expanduser().resolve()
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(rendered + "\n", encoding="utf-8")
        print(f"Wrote manifest to {output_path}")
    else:
        print(rendered)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
