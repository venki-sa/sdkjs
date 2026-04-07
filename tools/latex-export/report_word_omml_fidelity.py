#!/usr/bin/env python3

import argparse
import json
from collections import Counter
from pathlib import Path


FIDELITY_MAP = {
    "scr": {"status": "implemented", "detail": "math alphabet wrappers"},
    "sty": {"status": "implemented", "detail": "math style wrappers"},
    "nor": {"status": "approximated", "detail": "lowered to \\mathrm"},
    "lit": {"status": "approximated", "detail": "lowered to \\mathrm"},
    "degHide": {"status": "implemented", "detail": "hidden radical degree omitted"},
    "supHide": {"status": "implemented", "detail": "hidden superscript omitted"},
    "subHide": {"status": "implemented", "detail": "hidden subscript omitted"},
    "limLoc": {"status": "implemented", "detail": "lowered to \\limits or \\nolimits on n-ary operators"},
    "grow": {"status": "approximated", "detail": "large-operator growth follows LaTeX operator behavior"},
    "mcJc": {"status": "approximated", "detail": "lowered to array column spec"},
    "baseJc": {"status": "approximated", "detail": "lowered to array column justification"},
    "cGp": {"status": "approximated", "detail": "matrix column gap not preserved exactly in LaTeX"},
    "cSp": {"status": "approximated", "detail": "matrix minimum column width not preserved exactly in LaTeX"},
    "rSp": {"status": "approximated", "detail": "matrix row spacing not preserved exactly in LaTeX"},
    "plcHide": {"status": "approximated", "detail": "placeholder hiding approximated by emitted matrix content"},
    "strikeTLBR": {"status": "configurable", "detail": "can be lowered with cancel package output when enabled"},
    "strikeBLTR": {"status": "configurable", "detail": "can be lowered with cancel package output when enabled"},
    "strikeH": {"status": "approximated", "detail": "orthogonal box strike has no direct portable LaTeX equivalent"},
    "strikeV": {"status": "approximated", "detail": "orthogonal box strike has no direct portable LaTeX equivalent"},
    "hideTop": {"status": "approximated", "detail": "simple edge-only border boxes can be lowered to line wrappers"},
    "hideBot": {"status": "approximated", "detail": "simple edge-only border boxes can be lowered to line wrappers"},
    "hideLeft": {"status": "approximated", "detail": "simple edge-only border boxes can be lowered to side delimiters"},
    "hideRight": {"status": "approximated", "detail": "simple edge-only border boxes can be lowered to side delimiters"},
    "transp": {"status": "implemented", "detail": "transparent phantom lowered to phantom form"},
    "zeroWid": {"status": "implemented", "detail": "widthless phantom lowered to \\vphantom"},
    "zeroAsc": {"status": "approximated", "detail": "partial phantom height lowering approximated"},
    "zeroDesc": {"status": "approximated", "detail": "partial phantom depth lowering approximated"},
    "jc": {"status": "metadata", "detail": "paragraph/math justification outside formula LaTeX payload"},
    "b": {"status": "approximated", "detail": "run bold may be lowered through math style wrappers"},
    "i": {"status": "approximated", "detail": "run italic may be lowered through math style wrappers"},
    "rStyle": {"status": "approximated", "detail": "common named Word character styles are heuristically lowered"},
    "color": {"status": "configurable", "detail": "can be lowered with xcolor package output when enabled"},
    "highlight": {"status": "configurable", "detail": "can be lowered with xcolor package output when enabled"},
    "shd": {"status": "pending", "detail": "visual formatting not yet exported to LaTeX"},
    "vertAlign": {"status": "pending", "detail": "Word run vertical formatting not yet lowered"},
    "rFonts": {"status": "approximated", "detail": "obvious font families lowered to semantic LaTeX wrappers; unknown families still dropped"},
    "solidFill": {"status": "metadata", "detail": "drawing formatting"},
    "textFill": {"status": "metadata", "detail": "drawing formatting"},
    "pos": {"status": "implemented", "detail": "bar/group position lowered to top/bottom command form"},
    "type": {"status": "implemented", "detail": "fraction/radical node type lowering"},
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Report fidelity handling for OMML formatting/property tags.")
    parser.add_argument("--corpus-jsonl", required=True, help="Path to word-omml-corpus.jsonl")
    parser.add_argument("--output", default=None, help="Optional JSON output path")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    corpus_path = Path(args.corpus_jsonl).expanduser().resolve()

    counts = Counter()
    for line in corpus_path.open("r", encoding="utf-8"):
        record = json.loads(line)
        for tag in record["tags"]:
            if tag in FIDELITY_MAP:
                counts[tag] += 1

    report = {
        "corpus": str(corpus_path),
        "items": [],
        "totals": {
            "implemented": 0,
            "approximated": 0,
            "pending": 0,
            "metadata": 0,
        },
        "weighted_occurrences": {
            "implemented": 0,
            "approximated": 0,
            "pending": 0,
            "metadata": 0,
        },
    }

    for tag, occurrences in counts.most_common():
        meta = FIDELITY_MAP[tag]
        report["items"].append({
            "tag": tag,
            "occurrences": occurrences,
            "status": meta["status"],
            "detail": meta["detail"],
        })
        report["totals"][meta["status"]] += 1
        report["weighted_occurrences"][meta["status"]] += occurrences

    rendered = json.dumps(report, indent=2)
    if args.output:
        output_path = Path(args.output).expanduser().resolve()
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(rendered + "\n", encoding="utf-8")
        print(f"Wrote fidelity report to {output_path}")
    else:
        print(rendered)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
