# Auto Long-Post batch pipeline

Feeds an exam + topic list into `long-post-factory`'s existing pipeline
automatically: an agentic Claude call researches each topic (local NCERT
corpus search + web search), writes the long post, self-checks it, and
drops the same `pending-long-posts/<slug>.json` bundle the manual browser
tool produces — `.github/workflows/publish-long-post.yml` picks it up
unchanged and drafts it to WordPress.

**Runs on your machine only.** The one API key this needs never touches git
or the repo — it's read from your shell's environment for that session only.

## Folder layout

```
automation/
├── src/          all the code — nothing else lives here
├── input/        things you edit/add by hand (book-library/, topics.json)
├── output/       build-intermediate data only (raw extracted text, the CSV
│                 export) — the FINISHED corpus lives in ../ncert-knowledge-base/
├── package.json / package-lock.json / requirements.txt
└── README.md     this file

../ncert-knowledge-base/   (repo root, sibling of automation/ — see its own README)
├── by-subject/   the canonical NCERT corpus text, committed
├── index.json    the BM25 search index built from it, committed
└── retrieve.mjs  the search function other tools import
```

- **`src/`** — every script. Nothing in here writes anywhere except into
  `../output/` (build intermediates) and `../../ncert-knowledge-base/` (the
  finished corpus + index) — nothing here needs you to edit it for day-to-day use.
- **`input/`** — your standing local inputs: `book-library/` (source
  epub/zip books, gitignored) and `topics.json` (the batch list you edit
  before each run).
- **`output/`** — build-intermediate data: `ncert-corpus/_raw/` (raw
  extracted text, gitignored) and `ncert-corpus/ncert_corpus.csv` (a
  convenience export, gitignored). The corpus this pipeline actually feeds
  to other tools is `../ncert-knowledge-base/`, not here — see that folder's
  own README.

## One-time setup

```
cd automation
npm install
```

(Python 3 is also needed for the corpus-building scripts — see
`requirements.txt` for the one dependency, `pip install -r requirements.txt`.)

## NCERT RAG corpus (optional but recommended, fully key-free)

The finished corpus lives in `../ncert-knowledge-base/` (repo root, shared
with any other tool) and is searched locally via BM25 (no embeddings, no API
key — see `../ncert-knowledge-base/README.md` for how it's built and why).
It's already built and committed; you only need to touch this if you're
adding more source books.

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

## Running a note-generation batch

1. Edit `input/topics.json` — list every `{ exam, topic, subject, hindiPercent }`
   you want generated this run. Leave `status` unset/absent on new entries
   (it defaults to being treated as pending); the runner manages `status`,
   `slug`, `error`, `attempts` for you after that.
2. Pick a provider and set its key for this shell session (PowerShell).
   Default is Claude:
   ```
   $env:ANTHROPIC_API_KEY = "sk-ant-..."
   node src/run-batch.mjs
   ```
   To use Gemini instead:
   ```
   $env:AI_PROVIDER = "gemini"
   $env:GEMINI_API_KEY = "AIza..."
   node src/run-batch.mjs
   ```
   To use OpenAI instead:
   ```
   $env:AI_PROVIDER = "openai"
   $env:OPENAI_API_KEY = "sk-..."
   node src/run-batch.mjs
   ```
   The OpenAI provider is pinned to `gpt-4.1`, not `gpt-4o` — testing found
   `gpt-4o` flatly refuses this pipeline's long, multi-thousand-word single-shot
   prompt (a blank "I can't assist with that"), while `gpt-4.1` completes it
   normally. See `src/providers/openai.mjs`.
3. Run it (if not already run above):
   ```
   node src/run-batch.mjs
   ```
   Or via npm: `npm run run-batch` (also `npm run rebuild-corpus`,
   `npm run build-index`).

All three providers write the identical `pending-long-posts/<slug>.json`
bundle shape — same NCERT retrieval, same prompts, same self-check contract.
See `src/providers/claude.mjs`, `src/providers/gemini.mjs`, and
`src/providers/openai.mjs` for the API implementations behind the shared
`runAgenticDraft` / `runSelfCheck` interface.

The runner processes one topic at a time, commits + pushes each result as it
finishes (so `publish-long-post.yml` starts drafting it right away), then
cools down before the next topic. Default cooldown is 120s — override with
`$env:COOLDOWN_SECONDS = "300"` before running.

## Resuming after a crash / Ctrl+C

Just run `node src/run-batch.mjs` again — it only reprocesses topics still
marked `pending` or `failed` in `input/topics.json`. A topic that failed
`MAX_RETRIES` times (default 2) is skipped with a log line instead of
retried forever; fix the underlying issue and reset its `status`/`attempts`
manually to retry it.

## Rotating / changing the API key

Nothing to clean up — just export a different key value (`ANTHROPIC_API_KEY`,
`GEMINI_API_KEY`, or `OPENAI_API_KEY`, matching `AI_PROVIDER`) in your shell
before the next run. It's never written to disk by any script here.

## Tuning the writer

Edit `src/prompts/research-writer-system.md` (persona, grounding rules, tone)
or `src/prompts/self-check.md` (accuracy-audit pass) directly — they're
loaded at runtime, no code change needed. Diff/review them like any other
commit.

## Reporting

See `../reporting/index.html` for a dashboard of what's been published, its
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
| `src/prompt-builder.mjs` / `src/parse-reply.mjs` | No | Ported from `long-post-factory/index.html` — prompt contract + reply parsing |
| `src/prompt-builder-automation.mjs` / `src/build-automation-prompt.mjs` | No | Automation-only prompt variant + a CLI to print it for one topic (debugging) |
| `src/validate-bundle.mjs` | No | CLI: hard-fail-only checks on a raw AI reply piped via stdin |
| `src/generate-long-post.mjs` | **Yes** — provider key | Per-topic agentic generation + self-check |
| `src/run-batch.mjs` | **Yes** — provider key | CLI batch runner over `input/topics.json` |
| `src/providers/claude.mjs` | **Yes** — `ANTHROPIC_API_KEY` | Claude implementation of the agentic loop + self-check |
| `src/providers/gemini.mjs` | **Yes** — `GEMINI_API_KEY` | Gemini implementation of the agentic loop + self-check |
| `src/providers/openai.mjs` | **Yes** — `OPENAI_API_KEY` | OpenAI (`gpt-4.1`) implementation of the agentic loop + self-check |
