#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DATA_DIR="${ROOT_DIR}/.cache/latex-export-data"
IM2LATEX_DIR="${DATA_DIR}/im2latex"
LATEX_FORMULAS_DIR="${DATA_DIR}/latex-formulas"
ARXIV_TEX_DIR="${DATA_DIR}/arxiv-tex-corpus-full"

DRY_RUN=0
WITH_ARXIV_TRAIN=0

for arg in "$@"; do
	case "$arg" in
		--dry-run)
			DRY_RUN=1
			;;
		--with-arxiv-train)
			WITH_ARXIV_TRAIN=1
			;;
		*)
			echo "Unknown argument: $arg" >&2
			exit 1
			;;
	esac
done

mkdir -p "$IM2LATEX_DIR" "$LATEX_FORMULAS_DIR" "$ARXIV_TEX_DIR"

run() {
	echo "+ $*"
	if [[ "$DRY_RUN" -eq 0 ]]; then
		"$@"
	fi
}

echo "Root: $ROOT_DIR"
echo "Data dir: $DATA_DIR"

IM2LATEX_URL="https://zenodo.org/records/61680/files/im2latex-dataset.tar.gz"
IM2LATEX_ARCHIVE="${IM2LATEX_DIR}/im2latex-dataset.tar.gz"

if [[ ! -f "$IM2LATEX_ARCHIVE" ]]; then
	run curl -L "$IM2LATEX_URL" -o "$IM2LATEX_ARCHIVE"
else
	echo "Skipping existing $IM2LATEX_ARCHIVE"
fi

run hf download \
	--repo-type dataset \
	OleehyO/latex-formulas \
	raw_formulas/train-00000-of-00001.parquet \
	--local-dir "$LATEX_FORMULAS_DIR"

run hf download \
	--repo-type dataset \
	KiteFishAI/arxiv-tex-corpus-full \
	val.jsonl \
	--local-dir "$ARXIV_TEX_DIR"

if [[ "$WITH_ARXIV_TRAIN" -eq 1 ]]; then
	run hf download \
		--repo-type dataset \
		KiteFishAI/arxiv-tex-corpus-full \
		train.jsonl \
		--local-dir "$ARXIV_TEX_DIR"
else
	echo "Skipping arXiv train split. Use --with-arxiv-train to fetch the 78.9G training file."
fi

echo "Done."
