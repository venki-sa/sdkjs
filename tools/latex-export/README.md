# LaTeX Export Datasets

This directory contains reproducible scripts and manifests for downloading external datasets used to validate the strict LaTeX exporter.

## Local Storage

Datasets are downloaded outside git tracking under:

- `.cache/latex-export-data/`

This path is ignored by `.gitignore`.

## Dataset Families

We currently stage three dataset families:

1. `im2latex-100k`
   Source: Zenodo

2. `latex-formulas`
   Source: Hugging Face dataset `OleehyO/latex-formulas`

3. `arxiv-tex-corpus-full`
   Source: Hugging Face dataset `KiteFishAI/arxiv-tex-corpus-full`

## Why Not Download Everything Unconditionally

Some upstream artifacts are too large to assume local download by default.

In particular:

- `KiteFishAI/arxiv-tex-corpus-full/train.jsonl` is about `78.9G`

The download script therefore supports:

- a default "safe local" profile
- an optional full profile for machines with enough space

## Default Safe Local Profile

The default profile downloads:

- `im2latex-dataset.tar.gz`
- `latex-formulas/raw_formulas/train-00000-of-00001.parquet`
- `arxiv-tex-corpus-full/val.jsonl`

This gives us:

- a small real-world LaTeX formula corpus
- a large raw formula sample
- a substantial arXiv validation split

without pulling the full `78.9G` training corpus.

## Usage

Dry run:

```bash
tools/latex-export/download_datasets.sh --dry-run
```

Default safe local download:

```bash
tools/latex-export/download_datasets.sh
```

Full arXiv train download:

```bash
tools/latex-export/download_datasets.sh --with-arxiv-train
```

## Validation Intent

These datasets are not used to prove "100% support" on their own.

They are used for:

- corpus-based shadow validation
- formula normalization checks
- strict-vs-legacy diff analysis
- regression detection across a wide variety of expressions

True completeness still requires:

- internal node coverage
- internal symbol coverage
- strict invariant tests
- generated conformance fixtures

## Word Corpus Validation

For implementation work, we can validate against real Word corpora directly instead of external LaTeX datasets.

The recursive scanner is:

```bash
tools/latex-export/scan_word_corpus.py \
  /Users/venki/ClaudeCode/s3explorer/backend/clean_seg \
  /Users/venki/ClaudeCode/s3explorer/backend/clean_jmir \
  --output .cache/latex-export-data/word-corpus-manifest.json
```

What it does:

- scans `.docx` and `.doc` files recursively
- counts OMML equations in `word/document.xml` for `.docx`
- records unsupported legacy `.doc` files separately
- writes a JSON manifest we can feed into strict-export audits

To extract the actual OMML equations into a reusable JSONL corpus:

```bash
tools/latex-export/extract_word_omml_corpus.py \
  --manifest .cache/latex-export-data/word-corpus-manifest.json \
  --output-jsonl .cache/latex-export-data/word-omml-corpus.jsonl \
  --output-summary .cache/latex-export-data/word-omml-summary.json
```

This gives us:

- one JSONL record per Word equation
- raw OMML XML snippets for fixture generation
- structure-tag frequency summaries to prioritize exporter coverage

To turn the tag summary into a strict-export coverage report:

```bash
tools/latex-export/report_word_omml_coverage.py \
  --summary .cache/latex-export-data/word-omml-summary.json \
  --output .cache/latex-export-data/word-omml-coverage.json
```

This reports:

- which high-frequency OMML tags are already covered by native strict exporters
- which tags are still missing
- which tags are metadata-only and not direct exporter gaps

To track property-level fidelity on the extracted Word corpus:

```bash
tools/latex-export/report_word_omml_fidelity.py \
  --corpus-jsonl .cache/latex-export-data/word-omml-corpus.jsonl \
  --output .cache/latex-export-data/word-omml-fidelity.json
```

This separates:

- implemented property semantics
- approximated property semantics
- pending fidelity work
- metadata-only visual/document tags
