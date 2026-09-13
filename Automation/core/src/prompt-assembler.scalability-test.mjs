// SCALABILITY TEST — proves the assembler's generic metadata-driven module
// selection genuinely excludes irrelevant modules, using a synthetic Master
// Prompt built specifically to exercise that (see prompt-assembler.mjs's
// header on why the REAL MASTER-PROMPT-ExamNotesPDF_v13.md can't demonstrate
// this today: it deliberately has no separate per-exam/per-subject prose
// blocks to exclude — see AUDIT-REPORT-2026-09-13.md Section 6/8). This test
// is not about the real file; it's about proving the MECHANISM works when
// given a Master Prompt that actually has CORE/MATHS/HISTORY/CDP/PRIMARY/
// SECONDARY/NOTES/LONG_POST/UPDATE/SEO/FLAVOUR_X-shaped modules, per the
// explicit "Master Prompt Scalability Test" requirement.
//
// Run: node Automation/core/src/prompt-assembler.scalability-test.mjs

import { assembleRuntimePrompt, formatDiagnostic } from './prompt-assembler.mjs';

const SYNTHETIC_MASTER = `# SYNTHETIC MASTER PROMPT — scalability test fixture

## CORE
<!-- module: id=CORE -->
Every generation shares this: honesty rules, source whitelist, roles. This module has no
subject/exam/level/tool constraint, so it is selected for every request.

## MATHS
<!-- module: id=MATHS subject=maths,math depends_on=CORE -->
Maths-specific depth: worked examples, formula reasoning, error analysis.

## HISTORY
<!-- module: id=HISTORY subject=history depends_on=CORE -->
History-specific depth: chronology, cause/effect, turning points.

## CDP
<!-- module: id=CDP subject=cdp,pedagogy depends_on=CORE -->
CDP-specific depth: classroom scenarios, learner behaviour, theory-to-practice.

## LANGUAGE
<!-- module: id=LANGUAGE subject=language,hindi,english depends_on=CORE -->
Language-specific depth: rule, contrast, usage, exception.

## SCIENCE
<!-- module: id=SCIENCE subject=science,evs depends_on=CORE -->
Science-specific depth: process, mechanism, classification, observation.

## PRIMARY
<!-- module: id=PRIMARY level=primary depends_on=CORE -->
Primary-level teaching register: 6-10-year-olds, concrete examples, foundational literacy.

## SECONDARY
<!-- module: id=SECONDARY level=upper_primary_secondary,senior_secondary_pgt depends_on=CORE -->
Secondary/senior-secondary teaching register: adolescent examples, deeper subject nuance.

## SEO_FOUNDATION
<!-- module: id=SEO_FOUNDATION depends_on=CORE -->
H1, SEO title, focus keyphrase, slug, meta description — foundation, never a template.

## WORKED_EXAMPLE_FLAVOUR
<!-- module: id=WORKED_EXAMPLE_FLAVOUR tool=notes,long-post -->
Flavour: learn through solving. flow: problem > worked-solution > reasoning > variation.

## MISCONCEPTION_FIRST_FLAVOUR
<!-- module: id=MISCONCEPTION_FIRST_FLAVOUR tool=notes,long-post -->
Flavour: correct the most likely misunderstanding before teaching the rule.

## NOTES_CONTRACT
<!-- module: id=NOTES_CONTRACT tool=notes -->
Notes-only output contract: hand-written inline-styled HTML, card grammar, sentinels.

## LONG_POST_CONTRACT
<!-- module: id=LONG_POST_CONTRACT tool=long-post -->
Long-post-only output contract: Markdown, fenced block types, YAML frontmatter.

## UPDATE_CONTRACT
<!-- module: id=UPDATE_CONTRACT tool=update -->
Update-only output contract: patch semantics, approved-flags-only framing.
`;

function assertIncludes(ids, wantedId, label) {
  if (!ids.includes(wantedId)) throw new Error(`FAIL (${label}): expected ${wantedId} to be SELECTED, it was not. Selected: ${ids.join(', ')}`);
}
function assertExcludes(selectedIds, excludedIds, wantedId, label) {
  if (selectedIds.includes(wantedId)) throw new Error(`FAIL (${label}): expected ${wantedId} to be EXCLUDED, it was SELECTED.`);
  if (!excludedIds.includes(wantedId)) throw new Error(`FAIL (${label}): expected ${wantedId} to appear in excludedModuleIds, it did not (selected=${selectedIds.join(',')}, excluded=${excludedIds.join(',')})`);
}

function runCase(label, ctx, mustInclude, mustExclude) {
  const r = assembleRuntimePrompt(SYNTHETIC_MASTER, ctx);
  for (const id of mustInclude) assertIncludes(r.selectedModuleIds, id, label);
  for (const id of mustExclude) assertExcludes(r.selectedModuleIds, r.excludedModuleIds, id, label);
  console.log(`PASS: ${label}`);
  console.log(formatDiagnostic(r).split('\n').map(l => '    ' + l).join('\n'));
  return r;
}

let failures = 0;
function safeRun(...args) {
  try { runCase(...args); }
  catch (e) { failures++; console.log(e.message); }
}

safeRun(
  'Maths + Primary + Notes',
  { tool: 'notes', subject: 'Maths', levelKey: 'primary' },
  ['CORE', 'MATHS', 'PRIMARY', 'SEO_FOUNDATION', 'NOTES_CONTRACT'],
  ['HISTORY', 'CDP', 'LANGUAGE', 'SCIENCE', 'SECONDARY', 'LONG_POST_CONTRACT', 'UPDATE_CONTRACT']
);

safeRun(
  'CDP + Senior Secondary + Long Post',
  { tool: 'long-post', subject: 'CDP', levelKey: 'senior_secondary_pgt' },
  ['CORE', 'CDP', 'SECONDARY', 'SEO_FOUNDATION', 'LONG_POST_CONTRACT'],
  ['MATHS', 'HISTORY', 'LANGUAGE', 'SCIENCE', 'PRIMARY', 'NOTES_CONTRACT', 'UPDATE_CONTRACT']
);

safeRun(
  'History + Upper Primary/Secondary + Update',
  { tool: 'update', subject: 'History', levelKey: 'upper_primary_secondary' },
  ['CORE', 'HISTORY', 'SECONDARY', 'SEO_FOUNDATION', 'UPDATE_CONTRACT'],
  ['MATHS', 'CDP', 'LANGUAGE', 'SCIENCE', 'PRIMARY', 'NOTES_CONTRACT', 'LONG_POST_CONTRACT']
);

safeRun(
  'Language + Primary + Notes',
  { tool: 'notes', subject: 'Hindi', levelKey: 'primary' },
  ['CORE', 'LANGUAGE', 'PRIMARY', 'SEO_FOUNDATION', 'NOTES_CONTRACT'],
  ['MATHS', 'HISTORY', 'CDP', 'SCIENCE', 'SECONDARY', 'LONG_POST_CONTRACT', 'UPDATE_CONTRACT']
);

safeRun(
  'Science + Senior Secondary + Notes',
  { tool: 'notes', subject: 'Science', levelKey: 'senior_secondary_pgt' },
  ['CORE', 'SCIENCE', 'SECONDARY', 'SEO_FOUNDATION', 'NOTES_CONTRACT'],
  ['MATHS', 'HISTORY', 'CDP', 'LANGUAGE', 'PRIMARY', 'LONG_POST_CONTRACT', 'UPDATE_CONTRACT']
);

// Dependency resolution check: WORKED_EXAMPLE_FLAVOUR/MISCONCEPTION_FIRST_FLAVOUR
// are tool-scoped, not subject-scoped, so both should be excluded for
// tool:'update' even though CORE (their implicit foundation) is selected.
safeRun(
  'Flavour modules excluded for the wrong tool',
  { tool: 'update', subject: 'Maths', levelKey: 'primary' },
  ['CORE', 'MATHS', 'PRIMARY', 'UPDATE_CONTRACT'],
  ['WORKED_EXAMPLE_FLAVOUR', 'MISCONCEPTION_FIRST_FLAVOUR', 'NOTES_CONTRACT', 'LONG_POST_CONTRACT']
);

console.log(failures === 0 ? '\nALL SCALABILITY TESTS PASSED' : `\n${failures} SCALABILITY TEST(S) FAILED`);
process.exitCode = failures === 0 ? 0 : 1;
