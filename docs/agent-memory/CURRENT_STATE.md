# Current engineering state

_Last reviewed: 2026-11-08 (UTC). Concise snapshot, not an event log. Deep architectural reference lives in `PROJECT-KNOWLEDGE.md` — don't duplicate that content here._

## Project
Content Factory (repo name `question-factory`, GitHub org `bugignore`) generates Hindi/English exam-prep content for examnotespdf.in (CTET, BPSC TRE, DSSSB, UPTET, KVS, NVS and similar teacher-recruitment exams). Three pipelines, each a browser-first tool using a free chat AI (manual paste), two with a more-automated path on top:
- `question-factory/` — MCQ question banks.
- `notes-factory/` — standard exam notes, one-tap GitHub save to `pending-notes/`.
- `long-post-factory/` — 6,000-8,000 word SEO articles; also has `Automation/long-post-runner/run_pipeline.py`, a free DeepSeek-web-chat automation via Playwright (the old Claude/Gemini/OpenAI API-key batch generator described in `PROJECT-KNOWLEDGE.md` §3 is explicitly superseded — don't resurrect it).

Static site on GitHub Pages: https://bugignore.github.io/question-factory/. No secrets ever in browser-served files; WordPress credentials live only in GitHub Actions encrypted secrets.

## Delivery model
- `main` is the primary branch; PRs are used for larger changes (recent: #35, #37, #32 merged).
- No CI-enforced context guard (unlike the sibling `website` repo). `.github/workflows/` here (`pub-note.yml`, `pub-lpost.yml`, `pub-quiz.yml`, `ed-refresh.yml`, `sync-taxonomy-snapshots.yml`) are content-publishing/taxonomy-sync automations, not a code-review gate.
- `sync-taxonomy-snapshots.yml` runs on a daily schedule and keeps this repo's offline exam/subject/course taxonomy snapshot from going stale — confirmed green on every scheduled run through 2026-11-07.

## Active work
- PR #38 (`fix/qf-topic-required`, open since 2026-11-04): requires the Topic field, stops silent fallback to Subject.
- PR #32 (companion to `website`'s PR #51 taxonomy-change webhook): merged 2026-11-02, "Resolve quiz subject tags live, auto-sync taxonomy snapshots." This is the receiving end of `website`'s `examnotepdf-core.php` debounced `repository_dispatch` on exam/subject/course term changes — see `website`'s `docs/agent-memory/CURRENT_STATE.md` for the WordPress-side half, which as of 2026-11-08 is still inert pending a production-only secret (`GH_TAXONOMY_SYNC_TOKEN`).

## Known risks (from existing audit docs — not re-verified in this session)
- `AUDIT-REPORT-2026-09-13.md` and `Content-Pipeline-Audit.md` document prior pipeline issues in depth; read those for history, don't assume current behavior still matches without checking the code.
- The 2026-09-12 CDP → Pedagogy taxonomy merge caused the quiz CSV exporter to mistag rows for hours because this repo's offline taxonomy snapshot had gone stale — PR #32 (above) exists specifically to prevent a repeat of that.
