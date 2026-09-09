// Per-topic generation: an agentic Claude loop (NCERT retrieval tool + web
// search) writes the long post, then a second Claude call self-checks the
// draft against the NCERT chunks it actually retrieved. Output is parsed
// with the same logic long-post-factory/index.html uses, so the result is
// byte-shape-identical to what a human pastes into that tool manually.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildLongPostPrompt, getExamProfile } from './prompt-builder.mjs';
import { parseResponse, slugify } from './parse-reply.mjs';
import { retrieve, hasCorpus } from '../../ncert-knowledge-base/retrieve.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const YEAR = 2026;

function loadPromptFile(name) {
  return readFileSync(join(__dirname, 'prompts', name), 'utf8');
}

function fillTemplate(tpl, vars) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : ''));
}

function buildSystemPrompt(topic, examType, subject, hindiPercent) {
  const profile = getExamProfile(examType);
  const tpl = loadPromptFile('research-writer-system.md');
  return fillTemplate(tpl, {
    PROFILE_LABEL: profile.label,
    PERSONA: profile.persona,
    SUBJECTS: profile.subjects,
    ANGLE: profile.angle,
    TOPIC: topic,
    EXAM_TYPE: examType,
    SUBJECT: subject,
    YEAR,
    HINDI_PERCENT: hindiPercent,
    ENGLISH_PERCENT: 100 - hindiPercent
  });
}

async function runSelfCheck(provider, apiKey, bodyHtml, ncertChunksUsed, focusKeyword) {
  const tpl = loadPromptFile('self-check.md');
  const retrievedText = ncertChunksUsed.length
    ? ncertChunksUsed.map(c => `[${c.subject || 'NCERT'} — ${c.chapterTitle}]\n${c.text}`).join('\n\n---\n\n')
    : '(no NCERT chunks were retrieved during drafting)';
  const prompt = fillTemplate(tpl, {
    DRAFT_BODY_HTML: bodyHtml,
    RETRIEVED_CHUNKS: retrievedText,
    FOCUS_KEYWORD: focusKeyword || ''
  });
  const text = await provider.runSelfCheck(apiKey, prompt);
  const m = text.match(/<<<SELF_CHECK_JSON>>>([\s\S]*?)<<<END_SELF_CHECK_JSON>>>/);
  if (!m) return { clean: null, flags: [], ncertSourcesConfirmedUsed: [], raw: text };
  try {
    const parsed = JSON.parse(m[1].replace(/```(?:json)?/g, '').trim());
    return parsed;
  } catch (e) {
    return { clean: null, flags: [], ncertSourcesConfirmedUsed: [], raw: text, parseError: String(e) };
  }
}

// generateOne(topic, examType, subject, hindiPercent, apiKey, provider)
// -> the pending-long-posts/<slug>.json bundle object.
// `provider` is a module from ./providers/*.mjs (default: claude), exposing
// runAgenticDraft(apiKey, systemPrompt, userPrompt, retrieveFn) and
// runSelfCheck(apiKey, prompt) — see providers/claude.mjs for the interface.
export async function generateOne(topic, examType, subject, hindiPercent, apiKey, provider) {
  if (!hasCorpus()) {
    console.warn('  [warn] ncert-index.json has no chunks — search_ncert will return nothing until you run organize_ncert_corpus.py + build-index.mjs.');
  }

  const systemPrompt = buildSystemPrompt(topic, examType, subject, hindiPercent);
  const userPrompt = buildLongPostPrompt(topic, examType, subject, hindiPercent, YEAR);

  const { rawReply, ncertChunksUsed } = await provider.runAgenticDraft(apiKey, systemPrompt, userPrompt, retrieve);

  const parsed = parseResponse(rawReply);
  if (parsed.warnings.length) {
    console.warn(`  [warn] parse warnings for "${topic}": ${parsed.warnings.join(' | ')}`);
  }

  const selfCheck = await runSelfCheck(provider, apiKey, parsed.bodyHtml, ncertChunksUsed, parsed.seo.focusKeyword);

  let publisherNotes = parsed.publisherNotes || '';
  if (selfCheck.clean === false && selfCheck.flags && selfCheck.flags.length) {
    publisherNotes += '\n\n=== SELF-CHECK FLAGS (needs manual review) ===\n' +
      selfCheck.flags.map(f => `- [${f.issue}] "${f.claim}" — ${f.needsManualReview ? 'MANUAL REVIEW NEEDED' : `suggested fix: ${f.suggestedFix}`}`).join('\n');
  }

  const slug = parsed.seo.slug || slugify(`${topic}-${examType}-notes-${YEAR}`);

  return {
    topic,
    examType,
    subject,
    hindiPercent,
    seo: { ...parsed.seo, slug },
    bodyHtml: parsed.bodyHtml,
    publisherNotes,
    generatedAt: new Date().toISOString(),
    generator: `automation/src/generate-long-post.mjs (${provider.name})`,
    parseMethod: parsed.method,
    ncertCitationCount: ncertChunksUsed.length,
    ncertSourcesUsed: [...new Set(ncertChunksUsed.map(c => c.chapterTitle))],
    selfCheck: { clean: selfCheck.clean, flagCount: (selfCheck.flags || []).length }
  };
}
