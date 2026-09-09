// Builds a local, key-free BM25 search index over ncert-corpus/ncert_corpus.csv
// (produced by organize_ncert_corpus.py) and writes ncert-index.json.
// No API key, no network call — pure local term-frequency indexing.
//
// Run this once after organize_ncert_corpus.py, and again whenever the CSV
// changes:
//
//   node build-index.mjs

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_PATH = join(__dirname, '..', 'output', 'ncert-corpus', 'ncert_corpus.csv');
// The index is a finished, searchable artifact — it lives in the shared
// ncert-knowledge-base/ folder (repo root), not buried in automation/output/,
// so any tool (not just this pipeline) can find and read it.
const INDEX_PATH = join(__dirname, '..', '..', 'ncert-knowledge-base', 'index.json');

// Minimal CSV parser: our fields never contain embedded newlines-in-quotes
// edge cases beyond the standard "quoted, with ""escaped"" quotes" form.
function parseCsv(text) {
  const rows = [];
  let i = 0, field = '', row = [], inQuotes = false;
  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { pushField(); rows.push(row); row = []; };
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { pushField(); i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { pushRow(); i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) pushRow();
  const header = rows.shift();
  return rows.filter(r => r.length === header.length).map(r => Object.fromEntries(header.map((h, idx) => [h, r[idx]])));
}

export function tokenize(text) {
  // \p{M} (combining marks) must stay alongside \p{L} — Devanagari vowel
  // signs (matras like ो/ि/ा) are category Mark, not Letter, so without it
  // this regex silently strips every matra and shreds Hindi words into bare
  // consonants (कोशिका -> क श क) instead of leaving them intact.
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1);
}

function main() {
  if (!existsSync(CSV_PATH)) {
    console.error(`${CSV_PATH} not found — run organize_ncert_corpus.py first.`);
    writeFileSync(INDEX_PATH, JSON.stringify({ docs: [], df: {}, avgDocLen: 0 }));
    return;
  }
  const csvText = readFileSync(CSV_PATH, 'utf8');
  const rows = parseCsv(csvText);

  const docs = [];
  const df = {}; // document frequency per term
  let totalLen = 0;

  rows.forEach((row, idx) => {
    const tokens = tokenize(row.text);
    const termFreq = {};
    for (const t of tokens) termFreq[t] = (termFreq[t] || 0) + 1;
    for (const t of Object.keys(termFreq)) df[t] = (df[t] || 0) + 1;
    totalLen += tokens.length;
    docs.push({
      id: `${row.subject}__${row.book}__ch${row.chapter}`,
      subject: row.subject,
      book: row.book,
      chapter: row.chapter,
      chapterTitle: row.title,
      text: row.text,
      termFreq,
      docLen: tokens.length
    });
  });

  const avgDocLen = docs.length ? totalLen / docs.length : 0;
  writeFileSync(INDEX_PATH, JSON.stringify({ docs, df, avgDocLen, docCount: docs.length }));
  console.log(`Indexed ${docs.length} chapter(s), ${Object.keys(df).length} unique term(s) -> ${INDEX_PATH}`);
}

// Only run when executed directly (`node build-index.mjs`) — retrieve.mjs
// imports this file just for tokenize() and must not trigger a full rebuild.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
