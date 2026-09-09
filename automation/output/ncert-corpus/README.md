# NCERT corpus — build-intermediate data (automation-internal)

**The finished, searchable corpus lives at `../../../ncert-knowledge-base/`
(repo root), not here.** This folder only holds the raw/intermediate files
this pipeline produces on the way there — see
`../../../ncert-knowledge-base/README.md` for the corpus itself.

## What's in here (gitignored — never committed)

- `_raw/` — near-verbatim text extracted straight from the source epub/zip
  files, before subject-grouping/cleanup. Copyright-sensitive and large;
  never commit it.
- `ncert_corpus.csv` — the same content as `../../../ncert-knowledge-base/by-subject/`,
  flattened into one spreadsheet. Convenient to open in Excel, but fully
  derived — regenerate any time rather than committing it.

## The full pipeline

```
input/book-library/*.epub, *.zip           (your growing book collection — gitignored, add to it any time)
        │  src/extract_ncert_text.py
        ▼
output/ncert-corpus/_raw/<book>/chNN.txt  (raw text, gitignored — often garbled, see below)
        │  src/decode_krutidev.mjs
        ▼
output/ncert-corpus/_raw/<book>/chNN.txt  (same files, now real Unicode Devanagari)
        │  src/organize_ncert_corpus.py
        ▼
../../ncert-knowledge-base/by-subject/<Subject>/...  (COMMITTED — the canonical corpus, shared)
output/ncert-corpus/ncert_corpus.csv                 (gitignored, convenience export, stays here)
        │  src/build-index.mjs
        ▼
../../ncert-knowledge-base/index.json      (COMMITTED — the BM25 search index, shared)
        │  src/verify_corpus.py
        ▼
        sanity-check report (word counts, Devanagari density, cross-checks)
```

Run the whole chain with one command from `automation/`:

```
node src/rebuild-corpus.mjs
```

## Why the "decode Kruti Dev" step exists

Older NCERT epub/PDF digitizations (like the ones this project's
input/book-library was originally sourced from, upschub.com) often encode
Hindi text in a legacy glyph font (Kruti Dev / DevLys style) rather than real
Unicode — each Latin byte displays as a Devanagari letter only when rendered
in that specific proprietary font. Extracted as plain text it comes out as
unreadable Latin/symbol soup (e.g. `esa` instead of `में`). `decode_krutidev.mjs`
runs every raw chapter through `@anthro-ai/krutidev-unicode` (a JS port of
IIIT-Hyderabad's `kru2uni`) to recover real Devanagari before anything gets
indexed. It auto-detects and skips files that are already proper Unicode, so
it's safe to re-run.

Note: not every legacy font is KrutiDev. A different, unrelated non-Unicode
font (garbled with a different byte→glyph mapping) needs its own decoder —
`decode_krutidev.mjs` will not fix it, and such files should be kept out of
`input/book-library/` until a matching decoder exists for them.

## Adding more books later

1. Drop more `.epub`/`.zip` book files into `../../input/book-library/` by hand.
2. From `automation/`, run `node src/rebuild-corpus.mjs`.
3. Check the `verify_corpus.py` output at the end of that run for any
   flagged files (too short, low Devanagari density, un-converted Kruti Dev
   text) before committing.
4. Commit `../../ncert-knowledge-base/by-subject/` and `../../ncert-knowledge-base/index.json`
   (not anything in this folder — everything here is gitignored working data).

## Verifying corpus quality any time

```
python src/verify_corpus.py
```

Reports, per subject: file count, average word count, and any flagged
chapters — plus cross-checks that `by-subject/` file count, the CSV row
count, and the index's doc count all agree. See
`../../../ncert-knowledge-base/README.md` for how this corpus actually gets
searched at generation time.
