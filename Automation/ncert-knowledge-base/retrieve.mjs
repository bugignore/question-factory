// Local BM25 search over ncert-index.json (built by build-index.mjs).
// No API key, no network call. Used by generate-long-post.mjs to back the
// search_ncert tool.

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
// tokenize() is the one piece still owned by the build pipeline in
// Automation/core/ — everything else here is pure read/search over the
// finished index sitting right next to this file.
import { tokenize } from '../core/src/build-index.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_PATH = join(__dirname, 'index.json');

const K1 = 1.5;
const B = 0.75;

let cachedIndex = null;
function loadIndex() {
  if (cachedIndex) return cachedIndex;
  if (!existsSync(INDEX_PATH)) { cachedIndex = { docs: [], df: {}, avgDocLen: 0, docCount: 0 }; return cachedIndex; }
  cachedIndex = JSON.parse(readFileSync(INDEX_PATH, 'utf8'));
  return cachedIndex;
}

function bm25Score(queryTerms, doc, df, docCount, avgDocLen) {
  let score = 0;
  for (const term of queryTerms) {
    const tf = doc.termFreq[term];
    if (!tf) continue;
    const docFreq = df[term] || 0;
    if (!docFreq) continue;
    const idf = Math.log(1 + (docCount - docFreq + 0.5) / (docFreq + 0.5));
    const norm = tf * (K1 + 1) / (tf + K1 * (1 - B + B * (doc.docLen / (avgDocLen || 1))));
    score += idf * norm;
  }
  return score;
}

// retrieve(queryText, { subject }, topK) -> [{ id, subject, book, chapter, chapterTitle, text, score }]
// The apiKey / async signature is kept so generate-long-post.mjs's call site
// doesn't need to change if the retrieval backend changes again later.
export async function retrieve(queryText, filter, topK) {
  const index = loadIndex();
  if (!index.docCount) return [];
  const queryTerms = [...new Set(tokenize(queryText))];
  let pool = index.docs;
  if (filter && filter.subject) {
    const wanted = String(filter.subject).toLowerCase();
    const filtered = pool.filter(d => d.subject && d.subject.toLowerCase() === wanted);
    if (filtered.length) pool = filtered;
  }
  const scored = pool
    .map(d => ({ ...d, score: bm25Score(queryTerms, d, index.df, index.docCount, index.avgDocLen) }))
    .filter(d => d.score > 0);
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK || 5).map(({ termFreq, docLen, ...rest }) => rest);
}

export function hasCorpus() {
  return loadIndex().docCount > 0;
}
