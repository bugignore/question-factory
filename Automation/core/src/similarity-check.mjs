#!/usr/bin/env node
// Lightweight, local content-differentiation check: compares a newly
// published article's prose against recently published ones using
// normalized 5-gram Jaccard similarity. No embeddings, no external API —
// this is a cheap local heuristic for a human editor ("this reads like
// article X"), not a prediction of how any search engine would treat the
// content. Warning-only: the result is informational (see
// Automation/content-memory/README.md) and must never block or reject a
// publish.
//
// Usage: node similarity-check.mjs <new-bundle.json> <published-dir> [limit=30]
// Prints one JSON line: { newSlug, comparedAgainst, closest: [{slug, similarity}] }

import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function stripTags(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function ngramSet(text, n = 5) {
  const words = text.split(' ').filter(Boolean);
  const set = new Set();
  for (let i = 0; i + n <= words.length; i++) set.add(words.slice(i, i + n).join(' '));
  return set;
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  const [small, big] = a.size < b.size ? [a, b] : [b, a];
  for (const g of small) if (big.has(g)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * @param {string} newBodyHtml
 * @param {Array<{slug:string, bodyHtml:string}>} candidates
 * @param {number} n n-gram size (default 5)
 * @returns {Array<{slug:string, similarity:number}>} closest 3, highest first
 */
export function findClosestArticles(newBodyHtml, candidates, n = 5) {
  const newSet = ngramSet(stripTags(newBodyHtml), n);
  const scored = candidates
    .map(c => ({ slug: c.slug, similarity: Math.round(jaccard(newSet, ngramSet(stripTags(c.bodyHtml), n)) * 1000) / 1000 }))
    .sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, 3);
}

async function main() {
  const [, , newFile, dir, limitArg] = process.argv;
  if (!newFile || !dir) {
    console.error('Usage: node similarity-check.mjs <new-bundle.json> <published-dir> [limit=30]');
    process.exit(2);
  }
  const limit = Number(limitArg) || 30;
  const newBundle = JSON.parse(await readFile(newFile, 'utf8'));
  const newSlug = path.basename(newFile, '.json');

  let files = [];
  try {
    files = (await readdir(dir)).filter(f => f.endsWith('.json') && f !== 'index.json' && f !== `${newSlug}.json`);
  } catch { /* dir missing — nothing to compare against yet, e.g. the very first published article */ }

  // Most-recently-modified first is a reasonable, cheap proxy for "recently
  // published" without parsing every file just to read wordpress.publishedAt.
  const stats = await Promise.all(files.map(async f => {
    try { const st = await stat(path.join(dir, f)); return { f, mtime: st.mtimeMs }; }
    catch { return { f, mtime: 0 }; }
  }));
  stats.sort((a, b) => b.mtime - a.mtime);
  const recentFiles = stats.slice(0, limit).map(s => s.f);

  const candidates = [];
  for (const f of recentFiles) {
    try {
      const b = JSON.parse(await readFile(path.join(dir, f), 'utf8'));
      if (b && b.bodyHtml) candidates.push({ slug: path.basename(f, '.json'), bodyHtml: b.bodyHtml });
    } catch { /* unreadable or empty file — skip rather than fail the whole check */ }
  }

  const closest = findClosestArticles(newBundle.bodyHtml || '', candidates, 5);
  console.log(JSON.stringify({ newSlug, comparedAgainst: candidates.length, closest }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
