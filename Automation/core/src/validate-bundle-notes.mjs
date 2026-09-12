// CLI: reads a raw DeepSeek/AI reply from stdin, parses it with the SAME
// parser the manual tool's fallback chain uses (parse-reply.mjs — already
// supports the <<<SEO_JSON>>>/<<<NOTES_BODY_HTML>>>/<<<PUBLISHER_NOTES>>>
// sentinel format the notes prompt's PIPELINE OUTPUT CONTRACT specifies),
// then runs the REAL hard-fail gate ported from notes-factory/index.html
// (validators-notes.mjs) — the exact same checks the manual tool's "Run
// validation" button runs, not a separately-maintained approximation.
//
// Usage:
//   node validate-bundle-notes.mjs --topic "..." --exam "..." --subject "..." --hindi 80 [--year 2026] < reply.txt
// Prints one JSON line to stdout:
//   { pass: bool, hardFails: [...], warnings: [...], bundle: {...} | null }

import { parseResponse, slugify } from './parse-reply.mjs';
import { vRunChecks, setHindiPercent } from './validators-notes.mjs';

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

async function main() {
  const topic = arg('topic', '');
  const examType = arg('exam', '');
  const subject = arg('subject', 'Auto-detect');
  const hindiPercent = parseInt(arg('hindi', '80'), 10);
  const year = parseInt(arg('year', '2026'), 10);

  const raw = await readStdin();
  const parsed = parseResponse(raw);

  // Parser-level warnings (missing fields, cut-off reply, etc.) become hard
  // fails too when they mean there is genuinely nothing usable to publish —
  // mirrors notes-factory's own "Auto-save blocked" behaviour for a body
  // that's empty/near-empty or missing its slug.
  const fails = [];
  if (!parsed.bodyHtml || parsed.bodyHtml.trim().length < 200) {
    fails.push('Notes body is empty or near-empty — nothing to publish.');
  }
  if (!parsed.seo || !parsed.seo.slug) fails.push('URL Slug missing — cannot publish without it (used as the filename).');
  if (!parsed.seo || !parsed.seo.focusKeyword) fails.push('Focus Keyword missing.');

  setHindiPercent(hindiPercent);
  const v = fails.length === 0 ? vRunChecks(parsed.seo, parsed.bodyHtml) : null;
  if (v) v.hardFails.forEach(f => fails.push(`${f.label}: ${f.detail}`));

  const warnings = [...(parsed.warnings || [])];
  if (v) v.softWarnings.forEach(w => warnings.push(`${w.label}: ${w.detail}`));

  const pass = fails.length === 0;
  let bundle = null;
  if (pass) {
    const slug = parsed.seo.slug || slugify(`${topic}-${examType}-notes-${year}`);
    bundle = {
      topic, examType, subject, targetYear: year, hindiPercent,
      seo: { ...parsed.seo, slug },
      bodyHtml: parsed.bodyHtml,
      publisherNotes: (parsed.publisherNotes || '') +
        (warnings.length ? `\n\n=== AUTOMATION WARNINGS (soft, non-blocking) ===\n${warnings.map(w => `- ${w}`).join('\n')}` : ''),
      createdAt: new Date().toISOString(),
      generator: 'Automation/notes-runner/run_pipeline.py (DeepSeek via browser)'
    };
  }

  process.stdout.write(JSON.stringify({ pass, hardFails: fails, warnings, bundle }));
}

main().catch((err) => {
  process.stdout.write(JSON.stringify({ pass: false, hardFails: [`validator crashed: ${err.message}`], warnings: [], bundle: null }));
  process.exit(0);
});
