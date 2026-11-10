# Instructions for AI coding agents working in this repo

This applies to every AI coding agent: Claude Code, GitHub Copilot, ChatGPT/Codex, and other agents.

## Mandatory session start
1. Read this file and `docs/agent-memory/README.md`.
2. Read `docs/agent-memory/CURRENT_STATE.md` and the latest entries in `docs/agent-memory/WORKLOG.md`.
3. Inspect the current branch, git status, relevant code, and `.github/workflows/` before editing.
4. Treat GitHub (merged PRs, workflow runs) and the code on disk as source of truth; memory files are context, not proof an action succeeded.
5. For anything touching content generation or pipeline architecture, also check `PROJECT-KNOWLEDGE.md` (deep reference — don't duplicate its content into `CURRENT_STATE.md`, just link to the relevant section) and the most recent `MASTER-PROMPT-ExamNotesPDF_v*.md` (highest version number is current; older ones are superseded history).

## Mandatory before ending a session that changed anything durable
1. Update `docs/agent-memory/CURRENT_STATE.md` if active state, risks, blockers, or next steps materially changed.
2. Append a dated entry to `docs/agent-memory/WORKLOG.md`: scope, changed paths, checks run and outcomes, remaining risks. Never rewrite or delete previous entries.
3. Add a decision record in `docs/decisions/` only for a durable choice whose rationale should outlive a single task.

## Safety
- This repo has no CI-enforced context guard (unlike the sibling `website` repo). `.github/workflows/` here (`pub-note.yml`, `pub-lpost.yml`, `pub-quiz.yml`, `ed-refresh.yml`, `sync-taxonomy-snapshots.yml`) are content-publishing/taxonomy-sync automations, not a code-review gate.
- The site is static (GitHub Pages) — no secret may ever be placed in any HTML/JS file served to a browser. WordPress credentials live only as GitHub Actions encrypted secrets.
- This repo has a live cross-repo coupling with `website` (the WordPress site, same workspace, sibling folder): `website`'s `examnotepdf-core.php` fires a `repository_dispatch` into this repo on taxonomy changes; this repo's `sync-taxonomy-snapshots.yml` and PR #32 are the receiving side. Check `website`'s `docs/agent-memory/CURRENT_STATE.md` too when working on taxonomy sync.

## Context map
- `docs/agent-memory/README.md`: context protocol.
- `docs/agent-memory/CURRENT_STATE.md`: concise current snapshot.
- `docs/agent-memory/WORKLOG.md`: append-only history.
- `docs/decisions/`: durable decisions.
- `PROJECT-KNOWLEDGE.md`: deep architectural reference (what/why for every module).
- `AUDIT-REPORT-2026-09-13.md`, `Content-Pipeline-Audit.md`: point-in-time audits — read for history, don't assume current behavior still matches without checking the code.
- `MASTER-PROMPT-ExamNotesPDF_v*.md`: content-generation master prompts, versioned; highest number is current.
