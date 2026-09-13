#!/usr/bin/env node
// Backfills Automation/content-memory/ for articles published before that
// system existed (see Automation/content-memory/README.md for the schema).
// Never overwrites a live/model-reported record — only fills in records that
// don't exist yet, or that were themselves produced by a previous backfill
// run (only when --force is passed).
//
// These records are lower-confidence than a model-reported one: derived
// purely from the published HTML (H2 headings, inline citations), with no
// visibility into misconceptions/examples/pedagogical strategy actually used
// — hence "derived": true, and empty arrays where nothing could be inferred.
//
// Usage: node Automation/core/src/backfill-content-memory.mjs [--force]

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const MEMORY_DIR = path.join(REPO_ROOT, 'Automation', 'content-memory');

const SOURCES = [
  { dir: 'published-notes', type: 'note' },
  { dir: 'published-long-posts', type: 'long-post' },
];

const WHITELIST_DOMAINS = [
  'ncert.nic.in', 'cbseacademic.nic.in', 'indiacode.nic.in',
  'education.gov.in', 'pib.gov.in', 'gov.in', 'nic.in', 'en.wikipedia.org',
];

function stripTags(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Article shape: the sequence of <h2 id="..."> headings, lowercase-slugged —
// the closest HTML-derivable proxy for "article_shape" without model input.
function extractHeadingShape(html) {
  const shape = [];
  const re = /<h2[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/gi;
  let m;
  while ((m = re.exec(html))) {
    const id = m[1].toLowerCase();
    if (id && id !== 'toc' && id !== 'table-of-contents') shape.push(id);
  }
  return shape;
}

// Concepts taught: best-effort guess from heading text itself (not the id) —
// genuinely thin compared to a model-reported list, but better than nothing.
function extractConceptsFromHeadings(html) {
  const concepts = [];
  const re = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  let m;
  while ((m = re.exec(html))) {
    const text = stripTags(m[1]).replace(/^[^\p{L}\p{N}]+/u, '').trim();
    if (text) concepts.push(text);
  }
  return concepts;
}

// Sources actually cited: real <a href> targets on the HARD BAN 6 whitelist,
// deduped by hostname — names, not full URLs, matching the live schema.
function extractSources(html) {
  const hosts = new Set();
  const re = /<a[^>]+href="(https?:\/\/[^"]+)"/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      const host = new URL(m[1]).hostname.replace(/^www\./, '');
      if (WHITELIST_DOMAINS.some((d) => host === d || host.endsWith('.' + d))) hosts.add(host);
    } catch { /* malformed URL, skip */ }
  }
  return [...hosts];
}

function deriveRecord(bundle, slug, type) {
  const html = bundle.bodyHtml || '';
  return {
    id: slug,
    type,
    topic: bundle.topic || '',
    subject: bundle.subject || '',
    exam: bundle.examType || '',
    flavour: null, // predates the Editorial Flavour Engine — never guessed from HTML
    concepts_taught: extractConceptsFromHeadings(html),
    misconceptions_used: [],
    examples_used: [],
    pedagogical_strategy: 'unknown',
    article_shape: extractHeadingShape(html),
    question_types: [],
    sources: extractSources(html),
    postId: String((bundle.wordpress && bundle.wordpress.postId) || ''),
    link: (bundle.wordpress && bundle.wordpress.link) || '',
    published: (bundle.wordpress && bundle.wordpress.publishedAt) || bundle.createdAt || '',
    derived: true,
  };
}

async function main() {
  const force = process.argv.includes('--force');
  await mkdir(MEMORY_DIR, { recursive: true });

  let written = 0, skipped = 0, failed = 0;

  for (const { dir, type } of SOURCES) {
    const fullDir = path.join(REPO_ROOT, dir);
    if (!existsSync(fullDir)) continue;
    const files = (await readdir(fullDir)).filter((f) => f.endsWith('.json') && f !== 'index.json');

    for (const file of files) {
      const slug = file.replace(/\.json$/, '');
      const outPath = path.join(MEMORY_DIR, `${slug}.json`);

      if (existsSync(outPath)) {
        if (!force) { skipped++; continue; }
        try {
          const existing = JSON.parse(await readFile(outPath, 'utf8'));
          if (!existing.derived) { skipped++; continue; } // never clobber a live record
        } catch { /* unreadable existing record — fall through and regenerate */ }
      }

      try {
        const bundle = JSON.parse(await readFile(path.join(fullDir, file), 'utf8'));
        const record = deriveRecord(bundle, slug, type);
        await writeFile(outPath, JSON.stringify(record, null, 2) + '\n', 'utf8');
        written++;
      } catch (e) {
        console.error(`::warning::${slug} — failed to derive content-memory record: ${e.message}`);
        failed++;
      }
    }
  }

  console.log(`Content Memory backfill: ${written} written, ${skipped} skipped (already have a record), ${failed} failed.`);
  if (failed) process.exitCode = 1;
}

main();
