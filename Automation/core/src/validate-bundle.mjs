// CLI: reads a raw DeepSeek/AI reply from stdin, parses it with the same
// logic the manual tool uses (parse-reply.mjs), then runs HARD-FAIL-ONLY
// checks (the things that must never ship: no body, no <script>, unclosed
// blocks left as literal text, empty required SEO fields, or a word count
// so low the article is unusable). Anything short of that is a WARNING,
// not a blocker — the whole point of moving checks out of the prompt and
// into code is that "close enough" doesn't need an AI's own self-report,
// it needs one hard gate for what's truly broken and human judgement for
// the rest (via Publisher Notes + soft warnings on the review step).
//
// Usage:
//   node validate-bundle.mjs --topic "..." --exam "..." --subject "..." --hindi 80 < reply.txt
// Prints one JSON line to stdout:
//   { pass: bool, hardFails: [...], warnings: [...], bundle: {...} | null }

import { parseResponse, slugify } from './parse-reply.mjs';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : fallback;
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

// Real hard fails only — never ship these regardless of anything else.
const MIN_WORD_COUNT_HARD_FLOOR = 2500; // below this the article isn't a usable page at all
const WORD_COUNT_WARN_FLOOR = 6000; // below this, still ship but flag for a human to consider expanding

function countProseWords(html) {
  const text = String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text ? text.split(' ').length : 0;
}

function hardFailChecks(parsed) {
  const fails = [];
  const { seo, bodyHtml } = parsed;

  if (!bodyHtml || bodyHtml.trim().length < 200) {
    fails.push('Notes body is empty or near-empty — nothing to publish.');
  }
  if (/<script[\s>]/i.test(bodyHtml || '')) {
    fails.push('Body contains a <script> tag (HARD BAN 1).');
  }
  if (/\{\*\s*[a-z]+/i.test(bodyHtml || '')) {
    fails.push('Body still contains unexpanded {* type *} block markers — block-tag parsing failed.');
  }
  if (!seo || !seo.focusKeyword) fails.push('Focus Keyword missing — cannot publish without it.');
  if (!seo || !seo.seoTitle) fails.push('SEO Title missing.');
  if (!seo || !seo.slug) fails.push('URL Slug missing.');

  const wordCount = countProseWords(bodyHtml);
  if (wordCount < MIN_WORD_COUNT_HARD_FLOOR) {
    fails.push(`Word count ${wordCount} is below the hard floor of ${MIN_WORD_COUNT_HARD_FLOOR} — article too thin to publish.`);
  }

  return { fails, wordCount };
}

function softWarnings(parsed, wordCount) {
  const warnings = [...(parsed.warnings || [])];
  if (wordCount < WORD_COUNT_WARN_FLOOR) {
    warnings.push(`Word count ${wordCount} is under the ${WORD_COUNT_WARN_FLOOR} target — consider expanding before publishing.`);
  }
  return warnings;
}

async function main() {
  const topic = arg('topic', '');
  const examType = arg('exam', '');
  const subject = arg('subject', 'Auto-detect');
  const hindiPercent = parseInt(arg('hindi', '80'), 10);
  const year = parseInt(arg('year', '2026'), 10);

  const raw = await readStdin();
  const parsed = parseResponse(raw);
  const { fails, wordCount } = hardFailChecks(parsed);
  const warnings = softWarnings(parsed, wordCount);
  const pass = fails.length === 0;

  let bundle = null;
  if (pass) {
    const slug = parsed.seo.slug || slugify(`${topic}-${examType}-notes-${year}`);
    bundle = {
      topic,
      examType,
      subject,
      hindiPercent,
      seo: { ...parsed.seo, slug },
      bodyHtml: parsed.bodyHtml,
      publisherNotes: (parsed.publisherNotes || '') +
        (warnings.length ? `\n\n=== AUTOMATION WARNINGS (soft, non-blocking) ===\n${warnings.map(w => `- ${w}`).join('\n')}` : ''),
      createdAt: new Date().toISOString(),
      generator: 'Automation/long-post-runner/run_pipeline.py (DeepSeek via browser)',
      wordCount
    };
  }

  process.stdout.write(JSON.stringify({ pass, hardFails: fails, warnings, wordCount, bundle }));
}

main().catch((err) => {
  process.stdout.write(JSON.stringify({ pass: false, hardFails: [`validator crashed: ${err.message}`], warnings: [], wordCount: 0, bundle: null }));
  process.exit(0);
});
