# ADR 0001: Repository-local persistent agent context

- **Status:** Accepted.
- **Date:** 2026-11-08
- **Decision:** Mirror the `website` repo's agent-context protocol here: `AGENTS.md` as the canonical entry point, `CLAUDE.md` deferring to it, a replaceable `CURRENT_STATE.md` snapshot, an append-only `WORKLOG.md`, and decision records in `docs/decisions/`.
- **Rationale:** This repo's existing docs (`PROJECT-KNOWLEDGE.md`, the `MASTER-PROMPT-*` series, the two audit reports) are deep references, not a "what's true right now" snapshot — several are explicitly marked partially superseded. A concise, actively-maintained current-state file plus an append-only worklog lets an agent (or the user) answer "what is this project and where did we stop" without re-deriving it from a 27KB reference doc each session.
- **Difference from `website`:** No GitHub Actions guard enforcing context updates — this repo's workflows (`pub-note.yml`, `pub-lpost.yml`, `pub-quiz.yml`, `ed-refresh.yml`, `sync-taxonomy-snapshots.yml`) are content-publishing/taxonomy-sync automations, not a code-review gate, so there is no deterministic check to extend.
- **Limitations:** Nothing enforces that an agent actually reads or updates these files. GitHub (PRs, workflow runs) and the code on disk remain the real source of truth if memory ever disagrees with them.
