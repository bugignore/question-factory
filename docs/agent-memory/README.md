# Persistent engineering context protocol

## Purpose
Keep context useful across agents and sessions without turning it into a transcript. GitHub (merged PRs, workflow runs) and the code on disk are the source of truth; memory files summarize context and point to evidence. Adapted from the same protocol used in the sibling `website` repo, minus its CI enforcement (this repo has no PR-gated code-review workflow — its GitHub Actions are content-publishing automations).

## Required read sequence
1. `AGENTS.md` (repo rules and safety boundaries).
2. This file.
3. `CURRENT_STATE.md`.
4. Latest entries in `WORKLOG.md` (read further back as needed).
5. Relevant records in `../decisions/`, `PROJECT-KNOWLEDGE.md`, and the current `MASTER-PROMPT-ExamNotesPDF_v*.md` for the change.

If current state conflicts with code or GitHub facts, verify against those, then correct the state directly (no PR gate here — edit and commit, or open a PR if the change is large enough to want review).

## Required write sequence before ending a session that changed anything durable
- Update `CURRENT_STATE.md` when durable active state, risks, blockers, or next steps changed.
- Append a new dated section to `WORKLOG.md`; never edit, reorder, or remove previous entries.
- Include scope, changed paths, checks with exact outcomes, evidence (PR/run links) and open risks.
- Add a decision record only for a durable choice whose rationale should outlive a single task.

## Append-only worklog contract
Every entry must have a date (ISO 8601, timezone clear), PR/commit if known, summary and changed paths, checks and outcomes (or "not run"), and remaining risks/next step.

Never silently rewrite history. Correct an earlier incorrect claim by adding a new correction entry linking to evidence.

## Safety
- No CI gate enforces this (unlike `website`) — it's discipline only.
- `PROJECT-KNOWLEDGE.md` is the deep reference and is explicitly allowed to go stale in places (it already flags its own §3 as superseded) — `CURRENT_STATE.md` is the thing to trust for "what's true right now."
