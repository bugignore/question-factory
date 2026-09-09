// The raw chapters extract_ncert_text.py pulls out of these old NCERT epubs
// are encoded in a legacy Devanagari glyph font (Kruti Dev / DevLys style) —
// readable-looking Latin/symbol soup, not real Unicode Devanagari, because
// the original epubs render Hindi by mapping ASCII bytes to font glyphs
// rather than storing actual Unicode text. This converts every raw chapter
// file in place (ncert-corpus/_raw/**/*.txt) to real Unicode Devanagari
// using @anthro-ai/krutidev-unicode (a JS port of IIIT-Hyderabad's
// kru2uni — https://github.com/ltrc/kru2uni).
//
// Safe to re-run: skips files that already look like real Devanagari
// Unicode (checked via a Devanagari-codepoint density heuristic) so it
// won't double-convert.
//
// Usage:
//   node decode_krutidev.mjs

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import kru2uni from '@anthro-ai/krutidev-unicode';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(__dirname, '..', 'output', 'ncert-corpus', '_raw');

function isAlreadyUnicodeDevanagari(text) {
  const sample = text.slice(0, 2000);
  const letters = sample.replace(/\s/g, '');
  if (!letters.length) return true; // nothing to convert either way
  const devanagariCount = (sample.match(/[ऀ-ॿ]/g) || []).length;
  return devanagariCount / letters.length > 0.15; // already mostly real Devanagari
}

function looksLikelyKrutiDev(text) {
  // Cheap signal: Kruti Dev/DevLys text is ASCII-heavy with the tell-tale
  // "esa", "gSa", "osQ" style tokens; real English prose won't match these.
  return /\besa\b|\bgSa\b|\bosQ\b|\bfd\b/.test(text);
}

function main() {
  let converted = 0, skipped = 0, leftAlone = 0;
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (!entry.endsWith('.txt')) continue;
      const text = readFileSync(p, 'utf8');
      if (isAlreadyUnicodeDevanagari(text)) { skipped++; continue; }
      if (!looksLikelyKrutiDev(text)) { leftAlone++; continue; } // likely genuine English content, don't touch
      const decoded = kru2uni(text);
      writeFileSync(p, decoded);
      converted++;
    }
  };
  walk(RAW_DIR);
  console.log(`Converted ${converted} file(s) from Kruti Dev to Unicode Devanagari.`);
  console.log(`${skipped} file(s) already looked like real Unicode — left unchanged.`);
  console.log(`${leftAlone} file(s) didn't match the Kruti Dev signature (likely genuine English content) — left unchanged.`);
  console.log('Next: re-run organize_ncert_corpus.py to rebuild the by-subject folder + CSV from the corrected text, then node build-index.mjs.');
}

main();
