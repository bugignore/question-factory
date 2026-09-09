// One command to rebuild the whole NCERT RAG corpus from scratch — run this
// whenever you drop more .epub/.zip books into ../input/book-library/.
//
// Chains, in order:
//   1. extract_ncert_text.py     — unzip epubs, pull raw chapter text
//   2. decode_krutidev.mjs       — fix legacy Kruti Dev font encoding -> real Unicode
//   3. fix_text_artifacts.mjs    — patch verified converter mismappings (वेफ->के etc.)
//   4. organize_ncert_corpus.py  — clean + group by subject, strip TOC noise, write the CSV
//   5. build-index.mjs           — build the BM25 search index (no API key)
//   6. verify_corpus.py          — sanity-check word counts / Devanagari density
//
// No API keys involved anywhere in this chain. Safe to re-run any time —
// every step only adds/overwrites deterministically from the previous one.
//
// Usage:
//   node rebuild-corpus.mjs

import { execFileSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function findPython() {
  for (const cmd of ['python', 'python3']) {
    try {
      execFileSync(cmd, ['--version'], { stdio: 'ignore' });
      return cmd;
    } catch (e) { /* try next */ }
  }
  throw new Error('No "python" or "python3" found on PATH — needed for extract_ncert_text.py / organize_ncert_corpus.py / verify_corpus.py.');
}

function run(label, cmd, args) {
  console.log(`\n=== ${label} ===`);
  execFileSync(cmd, args, { cwd: __dirname, stdio: 'inherit', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
}

function main() {
  const python = findPython();

  run('1/6 Extract raw chapter text from book-library/', python, ['extract_ncert_text.py']);
  run('2/6 Decode legacy Kruti Dev font encoding to Unicode', 'node', ['decode_krutidev.mjs']);
  run('3/6 Patch verified converter mismappings', 'node', ['fix_text_artifacts.mjs']);
  run('4/6 Organize by subject + write CSV', python, ['organize_ncert_corpus.py']);
  run('5/6 Build the BM25 search index', 'node', ['build-index.mjs']);
  run('6/6 Verify corpus quality', python, ['verify_corpus.py']);

  console.log('\nCorpus rebuild complete. Review the verify_corpus.py output above for any flagged files.');
  console.log('Commit ncert-knowledge-base/by-subject/ and ncert-knowledge-base/index.json when you\'re happy with it.');
}

main();
