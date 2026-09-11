# BPSC TRE 4.0 — Primary Teacher (Class 1–5) — exam pattern & question-type notes

Research notes backing `EXAM_PROFILES['bpsc tre']` in `long-post-factory/index.html`
(see that file's `angle` field, which distills this into prompt-ready text). This is
a hand-maintained knowledge base, not auto-generated — update both files together
if BPSC revises the pattern for a future TRE cycle.

**Sourced:** 2026-09, from BPSC TRE 4.0 syllabus summaries (pw.live, adda247,
testbook.com, careerpower.in — third-party prep-site aggregations of the official
BPSC notification, not the notification PDF itself; treat exact figures below as
reliable but re-verify against the official BPSC notification before citing a
specific number in published content, per this repo's HARD BAN 4/6 honesty rules).

## Paper structure (Primary Teacher, Class 1–5)

| Part | Section | Questions | Marks | Counts to merit? |
|---|---|---|---|---|
| I | Language (English + one of Hindi/Urdu/Bangla) | 30 | 30 | **No — qualifying only** (minimum ~30%) |
| II | General Studies | 120 | 120 | Yes |
| — | **Total** | **150** | **150** | 2 hr 30 min, objective/MCQ |

**Marking:** 1/3 negative marking per wrong answer (deducted from the General
Studies score; Language section is pass/fail only).

**Critical difference from CTET/other TET exams:** there is **no separate
Child Development & Pedagogy (CDP) paper** at the Primary Teacher level in BPSC
TRE. General Studies is purely subject-content based. Do not write CDP-style
"a student in your class does X, what should the teacher do?" scenario questions
for BPSC TRE Primary unless the SUBJECT field is explicitly CDP/Pedagogy — that
question style belongs to CTET/UPTET/DSSSB PRT, not this exam at this level.

## General Studies — subject areas (per the CSV's subject column)

- **Elementary Mathematics** — number system, arithmetic, HCF/LCM, fractions,
  percentage, ratio-proportion, average, profit-loss, time-work-speed,
  mensuration, geometry basics, data handling, elementary algebra.
- **General Science** — living/non-living, plants, animals, human body, food &
  nutrition, matter, force/motion, heat/light/sound, electricity/magnetism,
  water/air/pollution, earth/weather.
- **Social Science / Indian National Movement** — ancient/medieval/modern India,
  1857 revolt, freedom movement milestones.
- **Geography & Environment** — physical geography (continents, oceans),
  India geography (mountains, rivers, plains, climate, agriculture), Bihar
  geography specifically.
- **General Awareness** — Bihar GK (history, culture, festivals, art, notable
  people), Indian Polity (Constitution, fundamental rights/duties, democracy),
  current affairs, awards, sports, government schemes.
- **Mental Ability** — reasoning-style questions (not in the CSV's subject list
  currently, but part of the official General Studies scope — worth a future
  topic if not already covered).

## Observed question-STYLE patterns per subject (general pattern, not a sourced statistic)

These describe *how* BPSC TRE tends to phrase questions at this level, based on
the exam's own General-Studies-not-pedagogy structure and typical Bihar-state
competitive-exam conventions — useful for calibrating practice-question style in
long posts, but must be labeled "Practice Question in Exam Style" per HARD BAN 3,
never presented as a verified PYQ unless an actual sourced past question is used.

- **Hindi (व्याकरण):** rule-identification + apply-the-rule-to-an-example +
  spot-the-correct-usage. Rarely passage-based comprehension at this level;
  mostly grammar-in-isolation (लिंग/वचन/कारक/संधि/समास/मुहावरे-type direct MCQs).
- **English:** parts of speech, tenses, articles/prepositions, error detection,
  synonym/antonym — direct-recall and rule-application, similar register to
  Hindi grammar questions, not literary/comprehension-heavy.
- **Maths:** direct calculation over word problems — a formula or a straight
  numeric computation more often than a multi-step real-world scenario, though
  word problems do appear (age problems, profit-loss, time-work).
- **Science/Social Science:** one-line fact-recall and definition-matching
  (e.g. "which of these is NOT a ___") rather than deep conceptual "why does X
  happen" application questions.
- **Geography:** location/feature association (river-state, mountain-range
  pairing) and single-fact recall, not process-explanation (unlike a CTET EVS
  question which might ask about a water cycle *process*).
- **History/Polity/GK:** direct fact-recall — dates, names, article numbers,
  scheme names — matching-type and straightforward "which of these" questions.

## What this changes in the long-post prompt

`EXAM_PROFILES['bpsc tre'].angle` in `long-post-factory/index.html` now states
the real Part I/Part II structure, the negative-marking convention, and the "no
CDP paper at Primary level" correction directly — so `buildLongPostPrompt()`
tells the AI the accurate paper shape instead of assuming a generic TGT/PGT
subject-wise structure for every BPSC TRE run. The per-subject question-style
notes above are summarized into the same `angle` string as a style guide.

## Open items for this knowledge base

- Verify exact figures against the official BPSC TRE 4.0 notification PDF
  (not yet fetched here — only third-party syllabus-site summaries were used).
- Add TGT/PGT-level paper structure and subject-wise weightage once a TGT/PGT
  topic batch is being run (this note currently covers Primary only, matching
  today's CSV).
- Mental Ability/Reasoning isn't in the current topics CSV's subject list —
  confirm whether it needs its own topic entries.
