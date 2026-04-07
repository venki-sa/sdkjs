#!/usr/bin/env python3

import argparse
import json
from collections import Counter
from pathlib import Path


TAG_STATUS = {
    "acc": {"status": "implemented", "exporter": "CAccent"},
    "bar": {"status": "implemented", "exporter": "CBar"},
    "borderBox": {"status": "implemented", "exporter": "CBorderBox"},
    "box": {"status": "implemented", "exporter": "CBox"},
    "d": {"status": "implemented", "exporter": "CDelimiter"},
    "eqArr": {"status": "implemented", "exporter": "CEqArray"},
    "f": {"status": "implemented", "exporter": "CFraction"},
    "func": {"status": "implemented", "exporter": "CMathFunc"},
    "nary": {"status": "implemented", "exporter": "CNary"},
    "phant": {"status": "implemented", "exporter": "CPhantom"},
    "rad": {"status": "implemented", "exporter": "CRadical"},
    "sSub": {"status": "implemented", "exporter": "CDegree"},
    "sSubSup": {"status": "implemented", "exporter": "CDegreeSubSup"},
    "sSup": {"status": "implemented", "exporter": "CDegree"},
    "limLow": {"status": "implemented", "exporter": "CLimit"},
    "limUpp": {"status": "implemented", "exporter": "CLimit"},
    "m": {"status": "implemented", "exporter": "CMathMatrix"},
    "groupChr": {"status": "implemented", "exporter": "CGroupCharacter"},
    "mPr": {"status": "metadata", "exporter": None},
    "mr": {"status": "metadata", "exporter": None},
    "mc": {"status": "metadata", "exporter": None},
    "mcs": {"status": "metadata", "exporter": None},
    "mcsPr": {"status": "metadata", "exporter": None},
    "mcJc": {"status": "metadata", "exporter": None},
    "fName": {"status": "metadata", "exporter": None},
    "lim": {"status": "metadata", "exporter": None},
    "maxDist": {"status": "metadata", "exporter": None},
    "schemeClr": {"status": "metadata", "exporter": None},
    "bookmarkStart": {"status": "metadata", "exporter": None},
    "bookmarkEnd": {"status": "metadata", "exporter": None},
    "rPrChange": {"status": "metadata", "exporter": None},
    "cNvGraphicFramePr": {"status": "metadata", "exporter": None},
    "cNvPicPr": {"status": "metadata", "exporter": None},
    "cNvPr": {"status": "metadata", "exporter": None},
    "docPr": {"status": "metadata", "exporter": None},
    "nvPicPr": {"status": "metadata", "exporter": None},
    "spPr": {"status": "metadata", "exporter": None},
}


def classify_tag(tag: str) -> dict:
    if tag in TAG_STATUS:
        return TAG_STATUS[tag]

    if tag.endswith("Pr") or tag in {"ctrlPr", "rPr", "rFonts", "i", "iCs", "bCs", "lang", "nor", "sz", "szCs", "sty", "color", "kern", "sub", "sup", "den", "num", "e", "chr", "begChr", "endChr", "limLoc", "show", "diff", "cs", "vertJc", "caps", "b", "scr", "jc", "supHide", "subHide", "deg", "degHide", "shd", "vertAlign", "noProof", "rStyle", "type", "ligatures", "count"}:
        return {"status": "metadata", "exporter": None}

    if tag in {"oMath", "oMathPara", "r", "t"}:
        return {"status": "leaf", "exporter": None}

    if tag in {"LockedField", "anchorlock", "fill", "lock", "path", "stroke", "wrap", "objDist", "avLst", "blip", "blipFill", "drawing", "effectExtent", "ext", "extent", "fillRect", "graphic", "graphicData", "graphicFrameLocks", "inline", "off", "pic", "prstGeom", "stretch", "xfrm", "vanish"}:
        return {"status": "metadata", "exporter": None}

    return {"status": "unknown", "exporter": None}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Report strict-export coverage against extracted Word OMML tag frequencies.")
    parser.add_argument(
        "--summary",
        help="Path to word-omml-summary.json",
        default=None,
    )
    parser.add_argument(
        "--corpus-jsonl",
        help="Path to word-omml-corpus.jsonl",
        default=None,
    )
    parser.add_argument(
        "--output",
        help="Optional path to write the JSON coverage report",
        default=None,
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if not args.summary and not args.corpus_jsonl:
        raise SystemExit("Provide --summary or --corpus-jsonl")

    tag_counts = Counter()
    summary_path = None
    equation_count = 0
    doc_count = 0

    if args.corpus_jsonl:
        corpus_path = Path(args.corpus_jsonl).expanduser().resolve()
        seen_docs = set()
        with corpus_path.open("r", encoding="utf-8") as stream:
            for line in stream:
                record = json.loads(line)
                equation_count += 1
                seen_docs.add(record["doc_path"])
                for tag in record["tags"]:
                    tag_counts[tag] += 1
        doc_count = len(seen_docs)
        summary_source = str(corpus_path)
    else:
        summary_path = Path(args.summary).expanduser().resolve()
        summary = json.loads(summary_path.read_text(encoding="utf-8"))
        equation_count = summary["equation_count"]
        doc_count = summary["doc_count"]
        for item in summary["top_tags"]:
            tag_counts[item["tag"]] = item["document_occurrences"]
        summary_source = str(summary_path)

    coverage = []
    counts = {"implemented": 0, "missing": 0, "metadata": 0, "leaf": 0, "unknown": 0}
    weighted = {"implemented": 0, "missing": 0, "metadata": 0, "leaf": 0, "unknown": 0}

    for tag, occurrences in tag_counts.most_common():
        classification = classify_tag(tag)
        status = classification["status"]
        counts[status] += 1
        weighted[status] += occurrences
        coverage.append(
            {
                "tag": tag,
                "document_occurrences": occurrences,
                "status": status,
                "exporter": classification["exporter"],
            }
        )

    report = {
        "summary_path": summary_source,
        "equation_count": equation_count,
        "doc_count": doc_count,
        "counts": counts,
        "weighted_occurrences": weighted,
        "coverage": coverage,
        "top_missing": [item for item in coverage if item["status"] == "missing"][:20],
        "top_unknown": [item for item in coverage if item["status"] == "unknown"][:20],
    }

    rendered = json.dumps(report, indent=2)
    if args.output:
        output_path = Path(args.output).expanduser().resolve()
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(rendered + "\n", encoding="utf-8")
        print(f"Wrote coverage report to {output_path}")
    else:
        print(rendered)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
