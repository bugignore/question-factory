// Patches known, VERIFIED-SAFE mismappings left behind by
// @anthro-ai/krutidev-unicode (decode_krutidev.mjs) — that converter gets
// most content right, but has a confirmed, systematic gap rendering the
// syllables के/कु/कू (क + a vowel sign) as the 3-character glyph fragments
// वेफ/वुफ/वूफ instead, EVERYWHERE that syllable occurs — both as a standalone
// word ("वेफ" -> "के") and glued inside compound words ("उनवेफ" -> "उनके",
// "स्वूफल" -> "स्कूल"/school, "करवेफ" -> "करके"). Run this AFTER
// decode_krutidev.mjs and BEFORE organize_ncert_corpus.py.
//
// This was discovered in two passes: first, word-boundary-only replacement
// (43,969 standalone "वेफ" -> "के") looked complete, but a follow-up
// substring scan found 920 more distinct words / 11,718 more occurrences
// still broken — the SAME fragment glued onto other text, which a
// standalone-word match can't catch. Verified safe via direct corpus
// sampling (automation session, 2026-08-31): every sampled occurrence of
// वेफ/वुफ/वूफ was the broken syllable, never a legitimate substring of a real
// word — फ practically never follows व in genuine Devanagari conjuncts.
//
// A separate, confirmed-independent bug: <digit>ण्<digit> -> a decimal
// point / section-number separator like "7.1" rendered as "7ण्1"
// (chained numbering like "2.3.4" needs a lookahead, not a consuming
// second digit, or only the first separator gets fixed).
//
// Deliberately NOT touched: "द्ध" and ";" — despite a suspiciously matched
// frequency (~15,000 each, suggesting a broken bracket pair), "द्ध" is also
// a common LEGITIMATE Devanagari conjunct (युद्ध/war, शुद्ध/pure, बुद्ध/Buddha)
// — blind-replacing it risks corrupting real words. Left for a future,
// more careful pass with real evidence on which occurrences are which.
//
// Usage:
//   node fix_text_artifacts.mjs

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(__dirname, '..', 'output', 'ncert-corpus', '_raw');

// Plain substring replacement, deliberately NOT anchored to word
// boundaries — the whole point is catching this fragment whether it's a
// standalone word or glued onto other text. (An earlier word-boundary-only
// version using \b also failed for an unrelated reason: JS regex only
// treats [A-Za-z0-9_] as "word characters," so \b never fires around
// Devanagari text at all.)
const WORD_FIXES = [
  [/वूफ/g, 'कू'],  // longer fragments first so "वूफ" isn't partially eaten by a "वेफ"/"वुफ" rule
  [/वैफ/g, 'कै'],  // same bug, कै vowel sign (e.g. वैफसे -> कैसे/"how"; 695 occurrences, 0 correct)
  [/वेफ/g, 'के'],
  [/वुफ/g, 'कु'],
  // missing halant (virama) collapsing ध्य -> धय — every अधय-prefixed word in
  // the corpus (अधयाय/chapter, अधययन/study, अधयापक/teacher, ...) is this bug;
  // the correct form "अध्याय" etc. has zero occurrences anywhere, so this is
  // a 100%-consistent conversion failure, not an ambiguous substring.
  [/अधय/g, 'अध्य'],
];
// Lookahead (not a consuming second digit) so chained numbering like
// "2ण्3ण्4" (-> "2.3.4") fixes both separators — a consuming pattern only
// catches the first pair, since the shared middle digit gets used up by it.
const DECIMAL_FIX = /(\d)ण्(?=\d)/g;

function fixText(text) {
  let out = text;
  for (const [pattern, replacement] of WORD_FIXES) {
    out = out.replace(pattern, replacement);
  }
  out = out.replace(DECIMAL_FIX, '$1.');
  return out;
}

function main() {
  let filesChanged = 0;
  let totalReplacements = 0;

  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (!entry.endsWith('.txt')) continue;
      const text = readFileSync(p, 'utf8');
      const fixed = fixText(text);
      if (fixed !== text) {
        // count replacements for reporting (cheap: just diff lengths of matches)
        const before = (text.match(/वेफ|वुफ|वूफ|वैफ|अधय/g) || []).length + (text.match(DECIMAL_FIX) || []).length;
        writeFileSync(p, fixed);
        filesChanged++;
        totalReplacements += before;
      }
    }
  };

  if (!statSync(RAW_DIR, { throwIfNoEntry: false })) {
    console.error(`${RAW_DIR} not found — run extract_ncert_text.py + decode_krutidev.mjs first.`);
    process.exit(1);
  }
  walk(RAW_DIR);
  console.log(`Fixed ${totalReplacements} known mismapping(s) across ${filesChanged} file(s).`);
  console.log('Next: node organize_ncert_corpus.py to rebuild by-subject/ + CSV, then node build-index.mjs.');
}

main();
