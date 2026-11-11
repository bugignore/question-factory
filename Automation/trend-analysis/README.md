# Trend-analysis documents

One Markdown file per **subject**, named by its slug (lowercase, spaces/`&`
collapsed to `-` — see `slugifySubject()` in `shared/topic-bank-sources.js`):

- `pedagogy.md`
- `mathematics.md`
- `evs.md`
- `ctet-english.md`
- `hindi.md`

(plus one per any other subject you add a topic bank for, e.g. `science.md`,
`history.md`, `geography.md`, `general-awareness.md`, `computer-science.md`...)

question-factory's "Build & copy prompt" step fetches the file matching
whichever subject is picked and folds its content into the generation
prompt as **hidden guidance** — DeepSeek/ChatGPT sees it as instructions,
never as a question to ask about or quote back. If the file is missing or
empty, generation proceeds exactly as before (this is optional per subject).

Write whatever helps DeepSeek pick better topics/questions for that
subject — previous-year frequency by topic, which question types recur,
common examiner traps, recent syllabus emphasis shifts, etc. Free-form
Markdown; there's no required structure.
