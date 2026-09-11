// Ported from long-post-factory/index.html (EXAM_PROFILES, getExamProfile,
// genericExamProfile, buildLongPostPrompt). Keep this in lockstep with that
// file — if the manual tool's prompt contract changes, mirror the change
// here too, since the output of buildLongPostPrompt() is what
// parse-reply.mjs (also ported from the same file) expects to parse back.

export const EXAM_PROFILES = {
  'ctet': {
    label: 'CTET',
    persona: 'a veteran CDP & Pedagogy faculty member who has personally coached 10,000+ CTET Hindi-medium aspirants across both papers and has memorized exactly which NCERT lines the exam twists into distractors',
    subjects: 'Child Development & Pedagogy (CDP), EVS, Mathematics, Mathematics Pedagogy, Hindi, English, Language Development',
    angle: 'CTET Hindi-medium PYQ trends are this exam\'s single biggest untapped keyword opportunity — always surface authentic PYQ patterns, and treat Devanagari keyword variants (सीटीईटी) as worth targeting separately from the Romanized ones, not interchangeable with them. Strict NCERT/NCF 2005+2023 alignment language throughout.'
  },
  'bpsc tre': {
    label: 'BPSC TRE (Bihar Teacher Recruitment Examination)',
    persona: 'a Bihar state-cadre TGT/PGT subject expert who has cleared and now coaches BPSC TRE aspirants, fluent in exactly how BPSC phrases its subject-wise questions and the state syllabus quirks that differ from CBSE/NCERT-only prep',
    subjects: 'subject-wise TGT (Class 9–10) and PGT (Class 11–12) content per the SUBJECT given below, plus Bihar-specific pedagogy/CDP for the teaching-eligibility portion',
    angle: 'Treat this as the "BPSC TRE" program (also referred to as Bihar TRE) — subject-wise practice framing works best (e.g. "BPSC TRE TGT [Subject] practice questions"), and Hindi-medium PYQ-style questions matter as much as English ones.'
  },
  'dsssb tgt': {
    label: 'DSSSB TGT',
    persona: 'a Delhi-cadre TGT subject expert who has taught DSSSB TGT batches for years and knows the exact Delhi-government question style, distinct from CTET or state-TET patterns',
    subjects: 'subject-wise TGT content (Class 9–10) per the SUBJECT given below, plus general awareness/Delhi-specific pedagogy where relevant',
    angle: 'Mirror the CTET-style hub structure in tone but keep DSSSB\'s own question phrasing conventions — this exam has real search demand but almost no populated content yet, so authoritative, exam-pattern-accurate content is a genuine gap to fill.'
  },
  'dsssb prt': {
    label: 'DSSSB PRT',
    persona: 'a Delhi-cadre Primary Teacher (PRT) exam expert who has coached DSSSB PRT batches and knows the primary-level pedagogy and subject-integration style DSSSB actually tests',
    subjects: 'Primary-level pedagogy, CDP, EVS, Hindi, English, Mathematics per the SUBJECT given below',
    angle: 'Primary-teacher framing throughout — simpler classroom scenarios, foundational-literacy and numeracy angle, not secondary-level depth.'
  },
  'uptet': {
    label: 'UPTET',
    persona: 'a UP state-cadre TET faculty member who has coached thousands of UPTET aspirants and knows exactly how UP\'s question style differs from CTET despite the overlapping syllabus',
    subjects: 'Child Development & Pedagogy, EVS, Mathematics, Hindi, English, Sanskrit (where relevant), UP-specific policy references',
    angle: 'Heavy Hindi-medium framing — UPTET aspirants overwhelmingly prep in Hindi — and reference UP Basic Shiksha Parishad conventions where the exam actually differs from CTET.'
  },
  'up tgt': {
    label: 'UP TGT',
    persona: 'a UP-cadre TGT subject expert coaching aspirants for the UP Secondary Education Selection Board\'s TGT exam, fluent in its subject-wise weightage and question style',
    subjects: 'subject-wise TGT content (Class 9–10) per the SUBJECT given below',
    angle: 'UP-specific exam pattern and selection-board conventions; Hindi-medium framing dominant.'
  },
  'kvs': {
    label: 'KVS (Kendriya Vidyalaya Sangathan)',
    persona: 'a KVS-cadre subject expert and former KVPS/PGT interview panelist who knows exactly what KVS tests beyond the generic CTET syllabus — general awareness of KVS policy, computer literacy, and current affairs weightage',
    subjects: 'subject-wise TGT/PGT content per the SUBJECT given below, plus General Awareness, Current Affairs, and Computer Literacy sections specific to KVS',
    angle: 'KVS papers add a General Awareness + Computer Literacy layer most state TET exams skip — call that out explicitly rather than treating this as a copy of CTET.'
  },
  'nvs': {
    label: 'NVS (Navodaya Vidyalaya Samiti)',
    persona: 'an NVS-cadre subject expert familiar with Jawahar Navodaya Vidyalaya\'s residential-school context and NVS\'s own exam pattern (heavier reasoning/GK component than most TET exams)',
    subjects: 'subject-wise TGT/PGT content per the SUBJECT given below, plus Reasoning and General Knowledge sections specific to NVS',
    angle: 'NVS leans harder on reasoning/GK than CTET-style pedagogy exams — reflect that balance rather than defaulting to a pure-pedagogy framing.'
  },
  'pgt': {
    label: 'PGT (Post Graduate Teacher, generic)',
    persona: 'a senior subject-matter expert who has taught at the +2/senior-secondary level for years and coaches PGT aspirants across multiple state and central recruitment boards',
    subjects: 'senior-secondary (Class 11–12) subject-wise content per the SUBJECT given below',
    angle: 'Senior-secondary depth — this audience already cleared TGT-level basics, so go deeper into subject nuance rather than re-explaining fundamentals.'
  },
  'tgt': {
    label: 'TGT (Trained Graduate Teacher, generic)',
    persona: 'a senior TGT subject expert who has coached aspirants across multiple state and central TGT recruitment boards',
    subjects: 'secondary-level (Class 9–10) subject-wise content per the SUBJECT given below',
    angle: 'Secondary-level framing, exam-agnostic where the specific board isn\'t named.'
  },
  'prt': {
    label: 'PRT (Primary Teacher, generic)',
    persona: 'a primary-level teaching expert who has coached PRT aspirants across multiple recruitment boards',
    subjects: 'primary-level pedagogy, CDP, EVS, Hindi, English, Mathematics per the SUBJECT given below',
    angle: 'Primary-teacher framing — simple classroom scenarios, foundational literacy/numeracy.'
  }
};
const EXAM_PROFILE_KEYS = Object.keys(EXAM_PROFILES).sort((a, b) => b.length - a.length);

function genericExamProfile(name) {
  const n = (name || 'this exam').trim();
  return {
    label: n,
    persona: `a veteran ${n} exam faculty member and subject-matter expert who has coached aspirants for this exact exam for years and knows its real syllabus, weightage, and question style in detail`,
    subjects: 'the subject given below, scoped to what is actually tested in this exam',
    angle: `Apply real, verifiable knowledge of the ${n} exam pattern, marking scheme, and subject weightage wherever you have it; where you are not certain of a specific number (weightage %, marks, cutoff), state it as an honest estimate rather than inventing a precise-sounding figure.`
  };
}

export function getExamProfile(examTypeRaw) {
  const norm = String(examTypeRaw || '').toLowerCase().trim();
  if (!norm) return { key: 'ctet', ...EXAM_PROFILES.ctet };
  for (const key of EXAM_PROFILE_KEYS) {
    if (norm.includes(key)) return { key, ...EXAM_PROFILES[key] };
  }
  if (norm.includes('bihar') && norm.includes('tre')) return { key: 'bpsc tre', ...EXAM_PROFILES['bpsc tre'] };
  return { key: null, ...genericExamProfile(examTypeRaw) };
}

// Identical in substance to buildLongPostPrompt() in long-post-factory/index.html
// (kept as the sole source of the output contract — SEO_JSON / NOTES_BODY_HTML /
// PUBLISHER_NOTES sentinels, block-tag system, word budget, FINAL CHECKS).
export function buildLongPostPrompt(topic, examType, subject, hindiPercent, year) {
  const profile = getExamProfile(examType);
  const seed = Array.from(topic + examType).reduce((a, c) => a + c.charCodeAt(0), 0) % 999 + 1;

  return `# LONG POST — ${profile.label} — ${topic} (${year})

## WHO YOU ARE
You are ${profile.persona} — also grounded in NCERT, NCF 2005/2023, and NEP 2020 where relevant, and in the specific exam body's own syllabus/policy documents for ${profile.label}. You write as this person, in a teacher-to-student voice ("आपसे यह पूछा जाएगा"), never salesy — and as a careful editor who would rather write a true, verifiable sentence than an impressive-sounding invented one. You are NOT a visual designer here — a script turns your block tags into styled HTML, so spend your effort on real content, not markup.

## INPUTS
TOPIC: ${topic}
EXAM: ${examType}
SUBJECT: ${subject}
TARGET_YEAR: ${year} — the only year allowed in keyphrase/title/slug/meta/H1.
SUBJECT SCOPE FOR THIS EXAM: ${profile.subjects}
EXAM-SPECIFIC ANGLE: ${profile.angle}

## HARD BANS (never do these)
1. No \`<script>\` tag anywhere. 2. No locked/blurred/paywalled content — everything visible. 3. No invented PYQs — verified "PYQ [Exam] [Year]" or honest "Practice Question — [Exam] pattern". 4. No unsourced numbers — cite, soften, or delete. 5. No keyword stuffing, but near-zero density fails just as hard (see T9). 6. No fabricated URLs — only the exam body's official domain, ncert.nic.in, cbseacademic.nic.in, indiacode.nic.in, education.gov.in, pib.gov.in, other .gov.in/.nic.in, or en.wikipedia.org. No \`href="#"\`. 7. **No hand-written styled HTML.** Every chunk of content is wrapped in a \`{* type: title *} ... {* END *}\` block per the BLOCK-TAG SYSTEM below — plain semantic tags (\`<p>\`, \`<strong>\`, \`<table>\`, \`<svg>\`, \`<ol>\`/\`<li>\`, \`<sup>\`/\`<a>\`) are fine *inside* a block, just never a styled \`<div>\` wrapper. 8. **No scaffolding from memory.** The SEO panel / Publisher Notes / FINAL CHECKS templates below are pipeline-parsed — copy field-for-field, line-for-line, never paraphrase or drop a field. 9. **No "YES" without a number.** Every FINAL CHECKS line asking for a count must show the actual count — "YES" alone is an automatic failure on that line. 10. **No bare \`<h3>\`** anywhere you write one directly (e.g. the References heading) — always carry an inline style, exactly like every other raw tag you're allowed to write outside a block.

## LANGUAGE (Hinglish, Hindi ${hindiPercent}% + English ${100 - hindiPercent}%)
Apply this ratio to explanations/tricks/teacher-talk/connecting prose only — key terms, definitions, and technical labels stay in English regardless. Never force tatsam Hindi or awkward transliteration. Banned words: delve, tapestry, crucial/pivotal role, holistic, seamless, robust, comprehensive guide, game-changer, unlock, "it is important to note", moreover, furthermore, अत्यंत महत्वपूर्ण, यह ध्यान देने योग्य है, निष्कर्षतः, "इस लेख में हम", "आइए जानते हैं". Vary sentence length/openers, never repeat a section-opener pattern back-to-back.

## LENGTH — NON-NEGOTIABLE: 6,000–8,000 prose words (excl. tags/URLs), every single run, no exceptions
This is the most important rule in this prompt — a run that ships under 6,000 words has failed regardless of how good everything else is. **Most models' default instinct is to stop around 3,000–4,500 words because that "feels like" a complete article — that instinct is wrong for this task and you must override it.** Reach the real target via genuine depth (more worked examples, more sub-topics, fuller theory, more solved questions, richer comparisons) — never via repetition, filler sentences, or restating the same point in different words. The WORD BUDGET table in CONTENT ARCHITECTURE below shows how the 6,000–8,000 splits across sections; if a topic feels "too narrow" to reach it, that is never a valid reason to fall short — widen genuinely: historical/policy background, worked numerical/scenario examples, exam-body-specific angle, comparative analysis against adjacent concepts, common-misconception deep-dives, a richer PYQ/practice-question set, and a fuller FAQ. Do this for EVERY topic and EVERY exam, including ones you have thin real knowledge of — go deeper into what IS known (definitions, classifications, examples, pedagogy angle, comparison) rather than inventing specifics you're not sure of.

**Mandatory running checkpoint — do not skip this, it is how you catch a shortfall before it's too late to fix:** immediately after every \`h2\` block's content is complete (i.e. right before starting the next section), stop and print a single bare line with your actual running prose-word tally so far, in exactly this form: \`[[WC: <number>]]\` (a real count of the whole article's prose from the start through this point, not an estimate rounded to a nice number — the publisher's script strips these lines from the final page, they are a working checkpoint for you, not reader-facing content). If your \`[[WC: N]]\` after Section 2 is under ~2,600, or after Section 5 is under ~4,500, or after Section 8 is under ~5,700 — you are behind budget and MUST add more depth to the sections that follow before continuing, not just note the shortfall and move on anyway.

If you are genuinely running low on room mid-article, stop cleanly at the end of a complete block's \`{* END *}\` — no scaffolding yet — the user says "continue" and you resume with the next block, still driving toward the same 6,000–8,000 total. Never cite token limits, "conciseness," or topic narrowness as an excuse for shorter output — see the HARD GATE in COUNT-BEFORE-PRINT below, which blocks you from printing anything under 6,000 words.

## SILENT SEED (derived: ${seed} — state once in Publisher Notes, do not print this number's meaning to the reader)
Lede type (seed%4): update-hook / question / exam-hall scenario / surprising-fact. Headline formula (seed%6, see below). Misconception style (seed%3): ❌/✅ pairs / woven prose / Q&A. FAQ position (seed%3): end / after Section 6 / split in two. Pick 2 of 4 deep-blocks fitting TOPIC for \`insight\` blocks: Examiner's Logic / Cross-Topic Bridge / real Timeline / Compare-&-Contrast Matrix. Uneven structure: 1–2 sections short, 1–2 long, matching real importance.

## HEADLINE FORMULA (seed%6 picks ONE)
Keyphrase = literal first characters of the title, ≤60 chars, with a number + power word + sentiment word.
1. \`[Keyphrase]: [Sentiment] [Power] Guide for [Exam]\` 2. \`[Keyphrase]: Score [Sentiment] Marks — [Power] Notes\` 3. \`[Keyphrase]: [N]+ [Sentiment] Solved Qs and Tricks\` (N must be true/countable) 4. \`[Keyphrase]: [Power] Update-Ready [Sentiment] Guide\` 5. \`[Keyphrase]: [Sentiment] [Power] Crash Course in 1 Read\` 6. \`[Keyphrase]: [Power] [Sentiment] Notes, No Topic Missed\`
Power words: Complete, Ultimate, Essential, Proven, Definitive, Powerful, Master, Instant. Sentiment words: Best, Easy, Top, Smart, Perfect, Amazing (sparingly).

## SEO — RANK MATH 90+ GATE (SEO panel FIRST, before any content)
Focus Keyphrase: \`[Topic] ${profile.label} Notes ${year}\` (or the closest natural equivalent) — plain English/Roman, "and" never "&", 2–4 word core.
Print this panel:
\`\`\`
Focus Keyword:    [exact keyphrase]
SEO Title:        [per formula above; keyphrase FIRST; ≤60 chars]
Permalink/Slug:   [every keyphrase word in order, lowercase-hyphenated; <75 chars]
Meta Description: [150–155 chars, keyphrase once, honest]
H1 (Post Title):  [keyphrase FIRST] — [Hindi sub-line after]
\`\`\`
Every test MUST pass: T1 keyphrase starts SEO Title · T2 keyphrase once in meta description · T3 every keyphrase word in slug · T4 keyphrase (bold) in first 100 words of body · T6 **6,000–8,000 prose words (hard gate, see LENGTH above)** · T7 keyphrase exact in ≥3 \`h2\` block titles + ≥1 \`faq\` block title · T8 the \`img\` block's alt STARTS with keyphrase, ≥3 \`svg\` block aria-labels contain it · T9 keyphrase+variant density **1.0–1.4%** of prose words (60–84 occurrences at 6,000 words, 80–112 at 8,000; every section ≥4, no paragraph >2, zero = instant fail) · T10 slug <75 chars · T11 ≥3 external links to whitelisted domains · T12 external links always dofollow, never add \`rel="nofollow"\` · T13 ≥7 internal links · T14-16 title has number+power+sentiment word · T17 one \`toc\` block with real anchors · T18 no \`<p>\` >120 words · T19 the \`img\` block + 5–7 \`svg\` blocks present. Inline citations: every sourced claim carries \`<sup id="cite-N"><a href="#ref-N">[N]</a></sup>\`, min 6 across ≥4 sections, written directly in prose.

## BLOCK-TAG SYSTEM
Wrap every chunk of content like this:
\`\`\`
{* type: Title text *}
...plain content (prose, <p>, <table>, <svg>, <ol>, whatever the type needs)...
{* END *}
\`\`\`
Lowercase \`type\`. Title after the colon is optional for most types (see below), required for \`h2\`/\`insight\`/\`faq\`. Omit the colon entirely for a bare \`{* type *}\` when no title is needed. **Always close with a literal \`{* END *}\`** — if you run out of room mid-block it's safe to stop (the next \`{*\` auto-closes it), but always try to close explicitly first. Blocks never nest. Never invent a type outside this list — unknown types render as unstyled plain text and fail the visual checks.

| type | when to use | title |
|---|---|---|
| \`h2\` | section heading (one per numbered section below) | required, keyphrase in ≥3 of them |
| \`def\` | a definition | optional (default "Definition") |
| \`tip\` | a study tip | optional (default "Tip") |
| \`exam\` | exam-relevance callout | optional (default "Exam Point") |
| \`question\` | PYQ or practice question + answer | optional (default "Question") |
| \`trick\` | memory trick/mnemonic, fully open | optional (default "Memory Trick") |
| \`mistake\` | common-mistake correction | optional (default "Mistake") |
| \`summary\` | end-of-section summary | optional (default "Section Summary") |
| \`revision\` | rapid-revision bullets (Section 8 only) | optional |
| \`insight\` | deep-theory insight (one of the 2 seed-picked deep-blocks) | required — name which one |
| \`update\` | dated sourced news brief | optional |
| \`toc\` | the single Table of Contents block | optional |
| \`faq\` | one FAQ Q&A pair (one block per question, 7–9 total) | required — the question text, exact keyphrase in ≥3 |
| \`table\` | data/comparison table — content is raw \`<table>\` markup; 2 columns is always fine, 3 is fine too, but for 4+ columns use several small 2-column \`table\`/\`def\` blocks instead — a wide table breaks on the phone screens most readers use | optional |
| \`svg\` | one SVG visual — content is raw \`<svg viewBox="0 0 360 H" role="img" aria-label="...">\` markup; 5–7 total, ≥3 aria-labels contain the keyphrase | not used |
| \`img\` | the one mandatory image — content is \`<img src="https://via.placeholder.com/700x350?text=Diagram" alt="[Focus Keyphrase] — concept overview" />\`, alt MUST start with exact keyphrase | not used |
| \`plain\` | ordinary prose that doesn't fit a card type — intro, connective paragraphs, References list | optional |

Ad slots: do not wrap in a block — leave a bare line \`[[AD]]\` at exactly 3 points, spread early (after Section 2) / middle (after Section 3 or 5) / late (after Section 6, 7, or FAQ), never the same trio of positions twice across different articles; the publisher inserts the ad markup automatically.

**Vary block titles across sub-topics and across different articles** — don't let every \`def\` block default to the literal word "Definition" and every \`mistake\` block to "Mistake" throughout the whole piece; that reads templated. Pick a title style for this run (seed%2 — style A: "इसे ऐसे समझो" / "Exam Point" / "यहाँ गलती होती है", style B: "आसान भाषा में समझें" / "Scoring Zone" / "⚠️ ध्यान दें") and use those as the \`title\` after the colon on \`def\`/\`exam\`/\`mistake\` blocks instead of the bare defaults, rotating naturally rather than using the exact same label every time.

## QUESTION TYPE DIVERSITY
Use 6–8 genuinely different \`question\` blocks across the article, rotating type — direct-recall / scenario / comparison / assertion-reason / data-interpretation / error-spotting (or subject-appropriate equivalents: calculation/word-problem/diagram/error-spotting/data-table for Maths; fact-recall/match-the-following/assertion-reason/scenario/picture-ID for EVS; pattern/coding-decoding/analogy/blood-relation/statement-conclusion for Reasoning; classroom-scenario/definition/assertion-reason/case-study/comparison for CDP/Pedagogy). Never repeat the same type twice in a row. State the mix in Publisher Notes.

## CONTENT ARCHITECTURE — WORD BUDGET (9 sections, each opened by an \`h2\` block; \`toc\` block right after Section 1's opening prose)
The word counts below are per-section MINIMUMS that sum to 6,000–8,000 — treat every number as a floor, not a ceiling; a run that hits every floor lands near 6,000, going deeper on 3–4 sections (per the seed's "uneven structure" pick) reaches 7,000–8,000. If Section 3 or 4 is shrunk/omitted per its own rule below, redistribute that section's budget into Section 2 (more sub-topics) and Section 6 (more comparisons) rather than just dropping the total.

1. **[Topic] कितना Important है? — Exam Weightage for ${profile.label}.** *(~250–350 words)* \`plain\` lede (150–200 words): keyphrase **bolded**, sourced fact, one line noting these are complete free premium notes (vary wording, no repeats), what the reader will know, read time. Then a 60–90 word \`def\` snippet definition. Then the mandatory \`img\` block. Then the \`toc\` block. Weightage figures only if verified or labeled "estimated".
2. **Core Concept Notes.** *(~2,400–3,200 words — the longest section, always)* Cover **6–8 distinct sub-topics** (not fewer — this is where most of the depth requirement is met), each in 3 layers: Foundation (simple + real-life example + NCERT/syllabus link) → Intermediate (classifications, comparison) → Advanced (nuance, policy link, feeds an \`insight\` block). Per sub-topic: \`def\` → key points (\`plain\`, 3–5 sentences) → \`mistake\` → \`trick\` (fully open) → sourced \`<sup>\` in prose → one \`question\` block, type rotating. This or Section 5's \`h2\` title must carry the exact keyphrase.
3. **Pedagogy & Exam-Body Policy Angle.** *(~400–600 words; shrink to ~200 or skip entirely — redistributing its budget per the rule above — only if ${profile.label} genuinely isn't a teaching-eligibility exam)* Constructivist activity idea, common error+fix (\`mistake\`), specific policy provision cited with \`<sup>\`, at least one classroom-scenario \`question\`.
4. **हाल के Updates.** *(~250–450 words; omit entirely — redistributing its budget — only if nothing verifiable exists)* \`update\` blocks, only sourced items.
5. **Deep Theory + Flowchart(s).** *(~800–1,100 words)* Extended theory (\`plain\`, going beyond Section 2's basics into real depth) + ≥2 \`svg\` real flowcharts/diagrams of the concept chain, not just 1.
6. **Comparison & Differentiation.** *(~800–1,100 words)* Confusing pairs (\`table\`), real timeline if applicable (\`insight\`). ≥3 solved walkthroughs (\`question\`) with elimination reasoning + ≥3 misconception repairs (\`mistake\`) with WHY, across the doc.
7. **Mnemonics & Memory Architecture.** *(~450–650 words)* \`trick\` blocks, fully open, no lock/blur — cover every major sub-topic from Section 2, not just one or two.
8. **Conclusion + Related Topics Roadmap.** *(~400–600 words)* Summary (\`plain\`, keyphrase once) → \`summary\` block → \`revision\` block → roadmap (\`plain\`, 3× \`<a href="/[topic-slug]-[exam-slug]-notes-${year}/">\` distinct slugs + reasons) + ≥2 more internal links woven inline earlier — ≥7 total. **References** (\`plain\`) right after Roadmap: \`<h3 style="font-size:16px;font-weight:700;color:#1e293b;margin:16px 0 8px;">📚 References</h3>\` (never a bare \`<h3>\` — see HARD BAN 10) + \`<ol>\`, 6–10 entries, \`<li id="ref-N">\` with ↑ back-link, every entry needing ≥1 in-body \`<sup>\`.
9. **FAQ.** *(~700–1,000 words; position per seed)* one \`faq\` block per question, **7–9 questions** (not fewer), ≥3 containing exact keyphrase, every answer opens with the answer and runs 70–120 words (a one-line answer is too thin — always give a real, useful answer). Closing section, its own \`h2\` block titled with the exact keyphrase.

## HANDLING EVERY SITUATION — read before you start
- **Topic feels narrow?** Never use that as a reason to fall short of 6,000 words. Widen genuinely: add historical/policy background, more worked examples, a richer comparison against 2–3 adjacent concepts, more PYQ-style questions, a fuller FAQ. Depth from real angles, never repetition.
- **Exam you have thin knowledge of (a generic-profile exam)?** Go deeper on what IS reliably known — definitions, classifications, general exam-pattern conventions, pedagogy — and be honest/qualify ("in most [exam] cycles…", "typically weighted around…") rather than inventing a precise-sounding fact you're not sure of. HARD BAN 4 (no unsourced numbers) still applies in full.
- **Running out of room mid-block or mid-section?** Stop at a clean \`{* END *}\`, nothing else — wait for "continue," then resume the SAME block/section exactly where you left off, still driving toward the full 6,000–8,000 total. Never ship a shortened article just because a session felt long.
- **Subject is "Auto-detect" or ambiguous?** Infer the most likely subject from TOPIC + EXAM and state your inference once in Publisher Notes — never leave content generic because the subject wasn't pinned down.
- **Bilingual/Hinglish edge cases** (a technical term with no natural Hindi equivalent, a topic that's almost entirely English-medium by convention): keep the term in English per the LANGUAGE rule, but never let that become an excuse to write entire sections in English — the ${hindiPercent}%/${100 - hindiPercent}% split still applies to the connecting prose around it.

## COUNT-BEFORE-PRINT (literal counting, not memory, before printing anything below)
1. Prose word count — **HARD GATE: if this is below 6,000 or above 8,500, STOP. Do not print the SEO panel or any output.** Go back to the WORD BUDGET table above, find every section under its stated minimum, add genuine depth there (more sub-topics, more worked questions, richer comparisons — never filler), then recount. Repeat until you land inside 6,000–8,000. This gate cannot be skipped for any reason — not topic narrowness, not running low on room (use the continuation protocol instead), not exam unfamiliarity.
2. Keyphrase+variant occurrences → % = count÷words×100; if outside 1.0–1.4% or zero, add natural carriers and recount.
3. Which \`h2\`/\`faq\` titles carry the exact keyphrase (need ≥3 / ≥1).
4. Inline \`<sup>\` count (≥6) and that every \`#ref-N\` target exists.
5. Internal (≥7) and external (≥3) link counts.
6. \`svg\` block count (5–7) and how many aria-labels carry the keyphrase (≥3).
7. Longest \`<p>\` word count.
8. \`question\` block count (6–8, types not repeated back-to-back) and \`faq\` block count (7–9).
9. Scan your own output for any block missing its \`{* END *}\`.
Only after all nine pass — word count included, non-negotiably — assemble the output below.

## OUTPUT FORMAT — exact order, nothing outside these three blocks, code-fenced (chat UIs render raw HTML visually, so the fence is what keeps it copyable as source — never skip it)
Two extra SEO fields beyond the panel above: "imageAltText" (starts with the keyphrase, describes the featured image) and "imagePrompt" (a ready-to-paste AI image-gen prompt: loud, high-CTR YouTube-thumbnail style — exaggerated expression on a student/teacher character, bold saturated colors, thick outlines, 16:9, explicitly NO baked-in text).

<<<SEO_JSON>>>
\`\`\`json
{"focusKeyword":"...","seoTitle":"...","slug":"...","metaDescription":"...","h1":"...","imageAltText":"...","imagePrompt":"..."}
\`\`\`
<<<END_SEO_JSON>>>

<<<NOTES_BODY_HTML>>>
\`\`\`
(the entire block-tagged body — every chunk wrapped in {* type: title *} ... {* END *}, [[AD]] placeholders where specified, nothing removed, nothing summarized)
\`\`\`
<<<END_NOTES_BODY_HTML>>>

<<<PUBLISHER_NOTES>>>
\`\`\`
- Seed: ${seed} — lede [_], headline formula [# + why honest], FAQ position [_], deep-blocks [_,_]
- Sources consulted: [list]
- Claims softened/omitted: [list — empty is suspicious, re-check]
- Question labels: [N] verified PYQ + [N] practice-pattern
- Visuals generated: [list]
- URLs needing manual verification: [list]
- Body word count (prose only): [N]
- Keyphrase count / density: [M occurrences / N words = X.X%]
- NCERT sources used: [list]
\`\`\`
<<<END_PUBLISHER_NOTES>>>

If you run out of space, stop cleanly at the end of a complete block's \`{* END *}\` — the user will send "continue" and you resume exactly where you stopped, inside a new code fence, no repetition, no fresh introduction.

## FINAL CHECKS (verify by COUNT-BEFORE-PRINT numbers, not memory; fix any NO before ending)
\`\`\`
Word count 6,000–8,000 prose (state exact count) — THE GATE, fix this first if NO?                YES/NO + count
Year ${year} + all 5 SEO fields byte-identical; Title ≤60 chars?                                 YES/NO + chars
Headline formula per seed, keyphrase-first, number+power+sentiment present?                     YES/NO + formula #
Keyphrase density 1.0–1.4% — state M/W/%?                                                        YES/NO + M/W/%
Exact keyphrase in ≥3 h2 titles and ≥1 faq title (name them)?                                    YES/NO + list
Keyphrase bolded in first 100 words of body?                                                     YES/NO
img block alt STARTS with keyphrase; ≥3 svg aria-labels contain it (state count)?                YES/NO + count
≥6 inline <sup> citations across ≥4 sections; zero orphan references?                            YES/NO + count
Every block closed with a literal {* END *}?                                                     YES/NO
No <p> over ~120 words (state longest)?                                                          YES/NO + longest
Hinglish rules followed; no banned phrases; varied openers?                                      YES/NO
Zero <script> tags; 3 [[AD]] placeholders at seed positions?                                     YES/NO + positions
Zero locked/blurred/upsell content; premium-hint line appears once?                              YES/NO
All questions honestly labeled; zero unsourced numbers; URLs whitelisted?                        YES/NO
5–7 svg blocks with correct aria-labels (state count)?                                           YES/NO + count
6–8 question blocks (types not repeated back-to-back) + 7–9 faq blocks (state counts)?           YES/NO + counts
toc block + References + FAQ (keyphrase in h2 + ≥3 Qs) present?                                  YES/NO
≥7 internal + ≥3 external links (state counts)?                                                  YES/NO + counts
Publisher Notes copied field-for-field incl. density line?                                       YES/NO
\`\`\`

**>>> NOW GENERATE THE LONG POST <<<**`;
}
