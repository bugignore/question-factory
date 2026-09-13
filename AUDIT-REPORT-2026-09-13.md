# Audit Report — Content Memory / Editorial Flavour Engine / Prompt Assembler

**Date:** 2026-09-13
**Scope:** Notes Factory, Long Post Factory, Update Factory, Automation pipeline, publish workflows
**Purpose of this document:** every claim below is paired with an exact command you can run yourself against the working tree to verify it. Nothing here is asserted without a reproducible check. Where something was **not** verified (e.g. no live AI generations were run), that is stated explicitly under Limitations, not glossed over.

---

## 1. What changed — file inventory

Run this yourself to see the exact same list:
```
git status --porcelain=v1
```

### Modified (existing files)
| File | Change size | What changed |
|---|---|---|
| `notes-factory/index.html` | +103 / −? lines | Content Memory block + Editorial Flavour Engine wiring + Prompt Assembler wiring |
| `long-post-factory/index.html` | ~223 lines touched | Content Memory block + Flavour Engine wiring + EXAM_PROFILES deduplicated to shared module |
| `update-factory/index.html` | ~211 lines touched | Content Memory block (both content-type paths) + Flavour Engine wiring + EXAM_PROFILES deduplicated |
| `Automation/core/src/prompt-builder.mjs` | −108 net lines | `EXAM_PROFILES`/`getExamProfile` deleted, now imported from `exam-profiles.mjs` |
| `MASTER-PROMPT-ExamNotesPDF_v13.md` | +35/−? lines | New `## EDITORIAL FLAVOUR` section + `{{FLAVOUR_ENGINE_BLOCK}}` placeholder; Publisher Notes closing line updated |
| `.github/workflows/publish-note.yml` | +50 lines | `write_content_memory()` + `write_similarity_note()` functions, called after successful publish |
| `.github/workflows/publish-long-post.yml` | +42 lines | Same two functions, long-post variant |

### New files
| File | Purpose |
|---|---|
| `Automation/core/src/exam-profiles.mjs` | Canonical `EXAM_PROFILES` (single source of truth, was 3 copies) |
| `Automation/core/src/gen-exam-profiles-browser.mjs` | Generator → `shared/exam-profiles.js` |
| `Automation/core/src/flavour-engine.mjs` | 15-flavour library + selection logic |
| `Automation/core/src/gen-flavour-engine-browser.mjs` | Generator → `shared/flavour-engine.js` |
| `Automation/core/src/master-prompt-modules.mjs` | Splits a Master Prompt into addressable `## `-heading modules |
| `Automation/core/src/prompt-assembler.mjs` | Selects/trims modules per run (tool/subject/level) |
| `Automation/core/src/gen-prompt-assembler-browser.mjs` | Generator → `shared/prompt-assembler.js` |
| `Automation/core/src/similarity-check.mjs` | Local 5-gram Jaccard overlap check, CLI + importable |
| `Automation/core/src/backfill-content-memory.mjs` | Derives best-effort Content Memory records for pre-existing published articles |
| `Automation/content-memory/README.md` | Schema + architecture doc |
| `Automation/content-memory/*.json` (39 files) | Backfilled records for existing published notes |
| `shared/exam-profiles.js`, `shared/flavour-engine.js`, `shared/prompt-assembler.js` | Generated browser mirrors (do not hand-edit) |

### Pre-existing, NOT part of this work (flagging so it isn't mistaken for mine)
- `MASTER-PROMPT-LongPost_v1.md` shows 1 modified line (`## LANGUAGE (Hinglish, ≈70% Hindi + 30% English)` → `## LANGUAGE (70% Hindi + 30% English)`) — this was already uncommitted in the working tree before this session touched anything. Verify: `git diff MASTER-PROMPT-LongPost_v1.md` — I made no edits to this file this session.
- `Automation/site-downloader/` (untracked) — present since before this session per the original `git status` snapshot at conversation start.

---

## 2. Verification: JS syntax of all three tools

```bash
for f in notes-factory/index.html long-post-factory/index.html update-factory/index.html; do
  node -e "
    const fs=require('fs');
    const html=fs.readFileSync('$f','utf8');
    const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
    let ok=true;
    scripts.forEach((s,i)=>{ try{ new Function(s); }catch(e){ ok=false; console.log('$f script',i,'ERROR:',e.message); } });
    if(ok) console.log('$f OK ('+scripts.length+' scripts)');
  "
done
```
**Expected output:**
```
notes-factory/index.html OK (3 scripts)
long-post-factory/index.html OK (3 scripts)
update-factory/index.html OK (3 scripts)
```
**What this proves:** every inline `<script>` block parses as valid JS (`new Function()` throws on syntax errors). **What this does NOT prove:** that the code runs correctly at runtime in a real browser with real DOM elements and a real network — see Limitations.

---

## 3. Verification: workflow YAML + embedded bash are valid

```bash
python3 -c "
import yaml
for wf in ['.github/workflows/publish-note.yml','.github/workflows/publish-long-post.yml']:
    d = yaml.safe_load(open(wf, encoding='utf-8'))
    open('_audit_'+wf.split('/')[-1]+'.sh','w',encoding='utf-8').write(d['jobs']['publish']['steps'][-1]['run'])
    print(wf, 'YAML parses OK')
"
for f in _audit_publish-note.yml.sh _audit_publish-long-post.yml.sh; do
  bash -n "$f" && echo "$f: bash syntax OK"
done
rm -f _audit_publish-note.yml.sh _audit_publish-long-post.yml.sh
```
**Expected output:**
```
.github/workflows/publish-note.yml YAML parses OK
.github/workflows/publish-long-post.yml YAML parses OK
_audit_publish-note.yml.sh: bash syntax OK
_audit_publish-long-post.yml.sh: bash syntax OK
```
**What this proves:** the YAML is well-formed and the shell script inside the `run:` block has no syntax errors. **What this does NOT prove:** that a real GitHub Actions run succeeds end-to-end (needs real WordPress secrets and an actual pending file — not exercised here).

---

## 4. Verification: the real EXAM_PROFILES staleness bug is actually fixed

Before this session, `Automation/core/src/prompt-builder.mjs` and `update-factory/index.html` had an **outdated** BPSC TRE profile missing a real correction present only in `long-post-factory/index.html` (no separate CDP/Pedagogy paper at BPSC TRE Primary level).

```bash
node -e "
import('./Automation/core/src/prompt-builder.mjs').then(m => {
  const p = m.buildLongPostPrompt('HCF and LCM','BPSC TRE 4','Maths',70,2026);
  console.log(p.includes('There is no separate CDP/Pedagogy paper') ? 'FIX CONFIRMED in prompt-builder.mjs' : 'STILL STALE');
});
"
node -e "
global.window=global;
const fs=require('fs');
new Function(fs.readFileSync('shared/exam-profiles.js','utf8'))();
const p = window.ExamProfiles.getExamProfile('BPSC TRE 4');
console.log(p.angle.includes('There is no separate CDP/Pedagogy paper') ? 'FIX CONFIRMED in browser mirror' : 'STILL STALE');
"
```
**Expected output:**
```
FIX CONFIRMED in prompt-builder.mjs
FIX CONFIRMED in browser mirror
```
**Cross-check there's now exactly one source:**
```bash
grep -rn "const EXAM_PROFILES = {" Automation/core/src/*.mjs long-post-factory/index.html update-factory/index.html
```
**Expected output:** exactly one match, in `Automation/core/src/exam-profiles.mjs`. `long-post-factory/index.html` and `update-factory/index.html` should show `window.ExamProfiles` destructuring instead — verify with:
```bash
grep -n "window.ExamProfiles" long-post-factory/index.html update-factory/index.html
```

---

## 5. Verification: Editorial Flavour Engine — 15 flavours, sane selection

```bash
node Automation/core/src/gen-flavour-engine-browser.mjs   # regenerate to be sure the mirror is current
node -e "
global.window=global;
const fs=require('fs');
new Function(fs.readFileSync('shared/flavour-engine.js','utf8'))();
console.log('flavour count:', window.FlavourEngine.FLAVOUR_ENGINE.length);
const cases = [
  ['HCF and LCM','Maths','BPSC TRE 4'],
  ['Sandhi aur Samas','Hindi','BPSC TRE'],
  ['Mughal Empire timeline','History','CTET Paper I'],
  ['Photosynthesis process','Science','CTET Paper I'],
];
for(const [topic,subject,exam] of cases){
  const r = window.FlavourEngine.selectFlavour({topic,subject,exam}, []);
  console.log(topic, '->', r.selected.id);
}
"
```
**Expected output:**
```
flavour count: 15
HCF and LCM -> problem-first
Sandhi aur Samas -> classification  (or a similarly plausible grammar-fit flavour — NOT chronology-cause-effect)
Mughal Empire timeline -> chronology-cause-effect
Photosynthesis process -> process-first
```
**What to actually eyeball:** none of these picks should look absurd for the topic (e.g. a History flavour for a grammar topic). If you see an obviously wrong pick, that's a real regression — flag it, don't assume it's fine.

**Repetition-avoidance check:**
```bash
node -e "
global.window=global;
const fs=require('fs');
new Function(fs.readFileSync('shared/flavour-engine.js','utf8'))();
const recent = [{flavour:'problem-first', exam:'BPSC TRE', subject:'Maths'}];
const r = window.FlavourEngine.selectFlavour({topic:'HCF and LCM', subject:'Maths', exam:'BPSC TRE'}, recent);
console.log('with problem-first recently used ->', r.selected.id, '(should differ from problem-first if a comparable alternative exists)');
"
```

---

## 6. Verification: Prompt Assembler — module selection + trimming

```bash
node -e "
global.window=global;
const fs=require('fs');
new Function(fs.readFileSync('shared/flavour-engine.js','utf8'))();
new Function(fs.readFileSync('shared/prompt-assembler.js','utf8'))();
const master = fs.readFileSync('MASTER-PROMPT-ExamNotesPDF_v13.md','utf8')
  .replaceAll('{{REFERENCE_SOURCES_BLOCK}}','')
  .replaceAll('{{TEACHING_LEVEL}}','Primary (Class 1–5)')
  .replaceAll('{{FLAVOUR_ENGINE_BLOCK}}','[flavour block placeholder]');
const levelKey = window.PromptAssembler.levelKeyFromLabel('Primary (Class 1–5)');
const r = window.PromptAssembler.assembleRuntimePrompt(master, { tool:'notes', subject:'Maths', levelKey });
console.log('Full:', master.length, 'chars. Assembled:', r.prompt.length, 'chars.');
// IMPORTANT: scope this check to the STRUCTURE section specifically —
// '**CDP/Pedagogy:**' legitimately still appears elsewhere in the prompt
// (inside QUESTION TYPE DIVERSITY, a different, untrimmed section), so a
// whole-prompt substring check gives a false negative here.
const structureOnly = r.prompt.slice(r.prompt.indexOf('## STRUCTURE'), r.prompt.indexOf('## PREMIUM HINT'));
console.log('STRUCTURE section contains ONLY the Maths bullet (not History/CDP/etc.):',
  structureOnly.includes('**Maths:**') && !structureOnly.includes('**History:**') && !structureOnly.includes('**CDP/Pedagogy:**'));
console.log('STRUCTURE section has no orphaned continuation line (the bug caught and fixed mid-session):',
  !structureOnly.includes('classroom application.'));
console.log('Contains ONLY Primary level bullet (not Senior Secondary):',
  r.prompt.includes('Primary (Class 1–5) exams:') && !r.prompt.includes('Senior Secondary (Class 11–12) rigor'));
"
```
**Expected output:**
```
Full: 24579 chars. Assembled: 23595 chars.
STRUCTURE section contains ONLY the Maths bullet (not History/CDP/etc.): true
STRUCTURE section has no orphaned continuation line (the bug caught and fixed mid-session): true
Contains ONLY Primary level bullet (not Senior Secondary): true
```
**Note on scoping:** an earlier draft of this exact check searched the whole assembled prompt instead of just the STRUCTURE section and produced a false "false" — `**CDP/Pedagogy:**` legitimately survives elsewhere (QUESTION TYPE DIVERSITY, a section this assembler does not trim). That was a bug in the verification script, not in `prompt-assembler.mjs` — caught by actually running this command before publishing this report, which is the entire point of this document. Scope any check like this to the specific section you're testing.
**Honesty note on the ~4% size reduction:** this is smaller than the module-folder diagram might imply, because `MASTER-PROMPT-ExamNotesPDF_v13.md` was already deliberately generic/topic-adaptive by design — it never contained per-exam or off-subject prose blocks to strip out. The two trims implemented (TEACHING LEVEL bullets, STRUCTURE subject bullets) are the entire currently-strippable surface in this file; a bigger reduction would require restructuring v13's actual prose, which was explicitly out of scope for a "smallest safe change."

**Confirm `notes-factory/index.html` actually calls this at runtime (not just that the module exists standing alone):**
```bash
grep -n "window.PromptAssembler" notes-factory/index.html
```
Expected: a `try { if (window.PromptAssembler) { ... assembleRuntimePrompt ... } }` block inside `buildPrompt()`.

---

## 7. Verification: Content Memory — schema, backfill, and the similarity check

**Backfill ran successfully for all 39 real published notes:**
```bash
ls Automation/content-memory/*.json | wc -l    # expect 39
cat Automation/content-memory/bpsc-tre-notes-2026.json   # spot-check one record — should have flavour:null, concepts_taught from real headings, sources from real citations
```

**4 published long-posts could NOT be backfilled — this is a pre-existing data problem, not caused by this work:**
```bash
ls -la published-long-posts/*.json
```
You will see 4 files at exactly **0 bytes**. This predates this session (confirm: these were already untracked/broken before any of today's edits — `git log --follow -- published-long-posts/` if you want the exact commit history). The backfill script correctly skips them with a warning rather than crashing:
```bash
node Automation/core/src/backfill-content-memory.mjs
```
Expected: `39 written, 0 skipped, 4 failed` (or `39 skipped` if already run) with 4 `::warning::` lines naming the empty files.

**Similarity check runs against real data:**
```bash
node Automation/core/src/similarity-check.mjs published-notes/bpsc-tre-notes-2026.json published-notes 30
```
Expected: one line of JSON, `comparedAgainst` around 30-38, `closest` array with 3 entries, `similarity` values well under 0.05 for genuinely different topics (high similarity, e.g. >0.3, on unrelated topics would indicate a real bug in the tokenizer/n-gram logic).

**Confirm the workflows actually call it (not just that the script exists):**
```bash
grep -n "similarity-check.mjs" .github/workflows/publish-note.yml .github/workflows/publish-long-post.yml
```

---

## 8. What I could NOT verify (be aware of this before trusting this report blindly)

1. **No live AI generations were run.** Every check above is structural/static (syntax, string content, deterministic function output). I did not generate an actual article through any of the three tools with a real AI model and inspect the result. If you want real confidence that the assembled runtime prompt still produces good notes, you need to run notes-factory for real, on a live topic, and read the output.
2. **Browser runtime behavior (DOM, real `fetch`, real GitHub API) was only simulated**, not tested in an actual browser. `new Function(script)` proves syntax validity, not that every DOM lookup (`document.getElementById(...)`) succeeds when the real page loads.
3. **`long-post-factory` and `update-factory` are NOT wired to the Prompt Assembler** — only `notes-factory` is. Their Editorial Flavour Engine wiring IS live (verified above), but module-selection/trimming only happens for Notes today.
4. **No GitHub Actions workflow was actually triggered.** YAML/bash syntax is confirmed valid; a real run (with real WordPress secrets, a real pending file, a real git push) was not exercised.
5. **The Variety Engine section was deliberately left untouched/un-compacted** — this was a conscious choice (see prior turn's report), not an oversight, but it means the runtime-prompt-size reduction is smaller than it could theoretically be.

---

## 9. Suggested next steps (not done, flagged for you to prioritize)

- Wire `long-post-factory`/`update-factory` to a subject/level trim rule matching their own STRUCTURE-equivalent prose.
- Generate one real article through `notes-factory` end-to-end and read it, to confirm the assembled prompt still produces the expected quality.
- Investigate the 4 zero-byte `published-long-posts/*.json` files — real data loss, unrelated to this session's work but worth fixing.
- Decide whether to commit `Automation/content-memory/*.json` (39 backfilled records) — they're currently untracked.
