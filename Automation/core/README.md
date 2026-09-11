# Automation/core/ — NCERT corpus build + shared pipeline scripts

This folder is **not** a standalone pipeline you run directly — it's shared
infrastructure used by two other things:

1. **`../ncert-knowledge-base/`** is built and maintained by the corpus
   scripts here (extraction → Kruti-Dev decode → organize → BM25 index).
2. **`../long-post-runner/run_pipeline.py`** (Python, browser-automation —
   drives DeepSeek's free web chat via a real signed-in Chrome profile, no
   API key) shells out to `src/build-automation-prompt.mjs` and
   `src/validate-bundle.mjs` for the one piece that has to match the manual
   browser tools *exactly*: prompt building and reply parsing/validation.
   See `../long-post-runner/README.md` for that pipeline's own docs — this
   file only covers what lives here.

There used to be a second, API-key-based batch generator here
(`generate-long-post.mjs` / `run-batch.mjs` / `providers/*.mjs`, calling
Claude/Gemini/OpenAI directly). It's been removed — `long-post-runner`'s
browser-driven approach is the one actually in production (free, no
per-article API cost), and keeping two separate generation pipelines side by
side was more confusing than useful.

## Folder layout

```
Automation/                  (repo root)
├── core/                     this folder — shared code, not a runner itself
│   ├── src/                   all the code — nothing else lives here
│   ├── input/                  things you edit/add by hand (book-library/, topics.json — see below)
│   ├── output/                 build-intermediate data only (raw extracted text, the CSV
│   │                           export) — the FINISHED corpus lives in ../ncert-knowledge-base/
│   └── package.json / package-lock.json / requirements.txt
├── ncert-knowledge-base/      (sibling of core/ — see its own README)
│   ├── by-subject/             the canonical NCERT corpus text, committed
│   ├── index.json              the BM25 search index built from it, committed
│   └── retrieve.mjs            the search function other tools import
└── long-post-runner/          (sibling of core/ — see its own README)
    └── run_pipeline.py          the actual browser-driven batch orchestrator
```

- **`src/`** — every script. Nothing in here writes anywhere except into
  `../output/` (build intermediates) and `../../ncert-knowledge-base/` (the
  finished corpus + index) — nothing here needs you to edit it for day-to-day use.
- **`input/`** — your standing local inputs: `book-library/` (source
  epub/zip books, gitignored). `topics.json` is a leftover from the removed
  batch runner — `long-post-runner` reads its topic list from its own CSV
  instead (see that folder's README).
- **`output/`** — build-intermediate data: `ncert-corpus/_raw/` (raw
  extracted text, gitignored) and `ncert-corpus/ncert_corpus.csv` (a
  convenience export, gitignored). The corpus this pipeline actually feeds
  to other tools is `../ncert-knowledge-base/`, not here — see that folder's
  own README.

## One-time setup

```
cd Automation/core
npm install
```

(Python 3 is also needed for the corpus-building scripts — see
`requirements.txt` for the one dependency, `pip install -r requirements.txt`.)

## NCERT RAG corpus (optional but recommended, fully key-free)

The finished corpus lives in `../ncert-knowledge-base/` (sibling folder,
shared with any other tool) and is searched locally via BM25 (no embeddings,
no API key — see `../ncert-knowledge-base/README.md` for how it's built and
why). It's already built and committed; you only need to touch this if
you're adding more source books.

**To grow the knowledge base over time**: drop more `.epub`/`.zip` book files
into `input/book-library/` by hand (gitignored — this is your standing local
input folder, add to it whenever you want), then re-run the whole pipeline in
one command:

```
node src/rebuild-corpus.mjs
```

That single command chains extraction → Kruti-Dev-to-Unicode decoding →
subject-organizing → BM25 index build → a quality-verification report. See
`../ncert-knowledge-base/README.md` for the full pipeline diagram and what
each step does.

## Running an actual generation batch

There's no runner in this folder anymore — see
**`../long-post-runner/README.md`** and run `python run_pipeline.py` from
there. This folder just supplies the corpus and the shared prompt/parse/
validate scripts it calls into.

## Reporting

See `../../reporting/index.html` for a dashboard of what's been published, its
status, and per-post NCERT-citation / self-check signal.

## File map

| File | Needs a key? | Purpose |
|---|---|---|
| `src/extract_ncert_text.py` | No | Unzips books from `input/book-library/`, pulls raw chapter text into `output/ncert-corpus/_raw/` |
| `src/decode_krutidev.mjs` | No | Fixes legacy Kruti Dev font encoding → real Unicode |
| `src/fix_text_artifacts.mjs` | No | Patches a handful of verified converter mismappings |
| `src/organize_ncert_corpus.py` | No | Cleans + groups chapters by subject, writes them to `../ncert-knowledge-base/by-subject/` + the CSV |
| `src/build-index.mjs` | No | Builds the local BM25 search index, writes it to `../ncert-knowledge-base/index.json` |
| `../ncert-knowledge-base/retrieve.mjs` | No | Queries the index (used as the `search_ncert` tool) — lives in the shared knowledge-base folder, not here |
| `src/verify_corpus.py` | No | Sanity-checks corpus completeness/quality |
| `src/rebuild-corpus.mjs` | No | Runs all of the scripts above in order |
| `src/prompt-builder.mjs` / `src/parse-reply.mjs` | No | Ported from `long-post-factory/index.html` — prompt contract + reply parsing. Called by `long-post-runner/run_pipeline.py` via the two scripts below. |
| `src/prompt-builder-automation.mjs` / `src/build-automation-prompt.mjs` | No | Automation-only prompt variant + a CLI `long-post-runner/run_pipeline.py` calls to build each prompt |
| `src/validate-bundle.mjs` | No | CLI: hard-fail-only checks on a raw AI reply piped via stdin — `long-post-runner/run_pipeline.py` calls this to parse + validate each scraped reply |
