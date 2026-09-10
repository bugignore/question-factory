// Ported from long-post-factory/index.html (slugify, extractSEO, extractBody,
// extractPublisherNotes, stripHtmlComments, expandLongPostBlocks,
// parseResponse). Keep byte-for-byte in sync with that file — this is what
// makes an AI reply captured by Notes-Automate/run_pipeline.py (via
// validate-bundle.mjs) parse into the exact same pending-long-posts/<slug>.json
// shape the manual browser tool produces.

export function slugify(s) {
  return String(s || '').toLowerCase().trim()
    .replace(/^\/+|\/+$/g, '').replace(/\/+$/, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function stripFences(s) {
  return String(s || '').replace(/```(?:json|html)?\s*/g, '').replace(/```/g, '').trim();
}

export function extractSEO(raw) {
  // Use the LAST sentinel occurrence, not the first: when this reply was
  // captured from a full chat page (automation), the user's own pasted
  // prompt - including its OUTPUT FORMAT section, which shows these same
  // sentinels around placeholder/example text - is often echoed back
  // (file-attachment preview, quote, etc.) before the real reply. The
  // actual answer is always the last occurrence in document order.
  const sentinelMatches = [...raw.matchAll(/<<<SEO_JSON>>>([\s\S]*?)<<<END_SEO_JSON>>>/g)];
  if (sentinelMatches.length) {
    const m = sentinelMatches[sentinelMatches.length - 1];
    try { return { seo: JSON.parse(stripFences(m[1])), method: 'sentinel-json' }; } catch (e) { /* fall through */ }
  }
  const jsonFenceMatches = [...raw.matchAll(/```json([\s\S]*?)```/gi)];
  for (let i = jsonFenceMatches.length - 1; i >= 0; i--) {
    try {
      const obj = JSON.parse(jsonFenceMatches[i][1].trim());
      if (obj && typeof obj === 'object' && (obj.focusKeyword || obj.seoTitle || obj.slug)) {
        return { seo: obj, method: 'json-fence' };
      }
    } catch (e) { /* not the SEO block, keep scanning */ }
  }
  const get = (label) => {
    const re = new RegExp(label + '\\s*:?\\s*(.+)', 'i');
    const mm = raw.match(re);
    return mm ? mm[1].trim().replace(/[`*]/g, '').split(/\r?\n/)[0].trim() : '';
  };
  const focusKeyword = get('Focus Keyword');
  const seoTitle = get('SEO Title');
  const slugRaw = get('Permalink/Slug') || get('Slug');
  const metaDescription = get('Meta Description');
  const imageAltText = get('Image ALT Text') || get('Image Alt Text') || get('Image ALT');
  const imagePrompt = get('Image (?:Generation )?Prompt') || get('Image Prompt');
  let h1 = '';
  const h1Match = raw.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) h1 = h1Match[1].replace(/<[^>]+>/g, '').trim();
  else h1 = get('H1 \\(Post Title\\)') || get('H1');
  return { seo: { focusKeyword, seoTitle, slug: slugify(slugRaw), metaDescription, h1, imageAltText, imagePrompt }, method: 'label-text' };
}

export function extractBody(raw) {
  // Last occurrence wins - see the note in extractSEO() above.
  const sentinelMatches = [...raw.matchAll(/<<<NOTES_BODY_HTML>>>([\s\S]*?)<<<END_NOTES_BODY_HTML>>>/g)];
  if (sentinelMatches.length) {
    const m = sentinelMatches[sentinelMatches.length - 1];
    const html = stripFences(m[1]).trim();
    if (html) return { bodyHtml: html, method: 'sentinel-html', cutOff: false, endIdx: m.index + m[0].length };
  }
  const lastOpenIdx = raw.lastIndexOf('<<<NOTES_BODY_HTML>>>');
  if (lastOpenIdx !== -1) {
    const html = stripFences(raw.slice(lastOpenIdx + '<<<NOTES_BODY_HTML>>>'.length)).trim();
    if (html) return { bodyHtml: html, method: 'sentinel-html', cutOff: true, endIdx: raw.length };
  }
  let m = raw.match(/<!--\s*NOTES BODY START\s*-->([\s\S]*?)<!--\s*NOTES BODY END\s*-->/i);
  if (m) {
    const html = stripFences(m[1]).trim();
    if (html) return { bodyHtml: html, method: 'body-comments', cutOff: false, endIdx: m.index + m[0].length };
  }
  const h2Start = raw.search(/<h2[\s>]/i);
  if (h2Start === -1) return { bodyHtml: '', method: 'none', cutOff: true, endIdx: raw.length };
  let endIdx = raw.length;
  const endMarkers = [/END OF NOTES/i, /SEO Linking Recommendations/i, /MNEMONICS ARCHIVE/i, /CONSOLIDATED FINAL CHECKS/i, /===\s*PUBLISHER NOTES\s*===/i];
  for (const em of endMarkers) {
    const idx = raw.search(em);
    if (idx !== -1 && idx < endIdx && idx > h2Start) endIdx = idx;
  }
  return { bodyHtml: raw.slice(h2Start, endIdx).trim(), method: 'h2-scan', cutOff: endIdx === raw.length, endIdx };
}

export function extractPublisherNotes(raw, bodyEndIdx) {
  // Last occurrence wins - see the note in extractSEO() above.
  const sentinelMatches = [...raw.matchAll(/<<<PUBLISHER_NOTES>>>([\s\S]*?)<<<END_PUBLISHER_NOTES>>>/g)];
  if (sentinelMatches.length) {
    return { publisherNotes: stripFences(sentinelMatches[sentinelMatches.length - 1][1]).trim(), found: true };
  }
  const lastOpenIdx = raw.lastIndexOf('<<<PUBLISHER_NOTES>>>');
  if (lastOpenIdx !== -1) {
    return { publisherNotes: stripFences(raw.slice(lastOpenIdx + '<<<PUBLISHER_NOTES>>>'.length)).trim(), found: true };
  }
  let m = raw.match(/===\s*PUBLISHER NOTES\s*===([\s\S]*?)(?:```|$)/i);
  if (m) return { publisherNotes: ('=== PUBLISHER NOTES ===' + m[1]).trim(), found: true };
  const tail = bodyEndIdx < raw.length ? raw.slice(bodyEndIdx).trim() : '';
  return { publisherNotes: tail, found: tail.length > 0 };
}

export function stripHtmlComments(html) {
  return String(html || '').replace(/<!--[\s\S]*?-->/g, '').trim();
}

const BLOCK_TYPES = new Set(['h2', 'def', 'tip', 'exam', 'question', 'trick', 'mistake', 'summary', 'revision', 'insight', 'update', 'toc', 'faq', 'table', 'svg', 'img', 'plain']);

function escBlockTitle(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function cardBlockHtml(bg, accent, label, body) {
  return `<div style="background:${bg};border-left:6px solid ${accent};padding:16px;border-radius:12px;margin:14px 0;box-sizing:border-box;max-width:100%;">${label ? `<b>${escBlockTitle(label)}</b><div style="margin-top:6px;line-height:1.6">${body}</div>` : `<div style="line-height:1.6">${body}</div>`}</div>`;
}
const BLOCK_RENDERERS = {
  h2: (t, b) => `<h2 id="${slugify(t) || 'section'}" style="background:#0f172a;color:#fff;padding:12px 16px;border-radius:12px;font-size:22px;font-weight:700;margin:14px 0;box-sizing:border-box;max-width:100%;">${escBlockTitle(t)}</h2>\n${b}`,
  def: (t, b) => cardBlockHtml('#f8fbff', '#2563eb', t || 'Definition', b),
  tip: (t, b) => cardBlockHtml('#fff8e6', '#f59e0b', t || 'Tip', b),
  exam: (t, b) => cardBlockHtml('#ecfeff', '#06b6d4', t || 'Exam Point', b),
  question: (t, b) => cardBlockHtml('#fff1f2', '#e11d48', t || 'Question', b),
  trick: (t, b) => cardBlockHtml('#f5f3ff', '#7c3aed', t || 'Memory Trick', b),
  mistake: (t, b) => cardBlockHtml('#fff7ed', '#ea580c', t || 'Mistake', b),
  summary: (t, b) => cardBlockHtml('#ecfccb', '#65a30d', t || 'Section Summary', b),
  revision: (t, b) => `<div style="background:#eff6ff;border:2px dashed #2563eb;border-radius:12px;padding:16px;margin:14px 0;box-sizing:border-box;max-width:100%;"><b>${escBlockTitle(t || 'Rapid Revision')}</b><div style="margin-top:6px;line-height:1.6">${b}</div></div>`,
  insight: (t, b) => cardBlockHtml('#faf5ff', '#9333ea', t || 'Advanced Insight', b),
  update: (t, b) => cardBlockHtml('#f0fdf4', '#16a34a', t || 'Update', b),
  toc: (t, b) => `<div style="background:#eff6ff;border:2px solid #2563eb;border-radius:12px;padding:16px;margin:14px 0;box-sizing:border-box;max-width:100%;"><b>${escBlockTitle(t || 'Table of Contents')}</b><div style="margin-top:6px;line-height:1.6">${b}</div></div>`,
  faq: (t, b) => `<div style="margin:14px 0"><h3 style="font-size:15px;font-weight:700;color:#1e293b;margin:14px 0 6px;">${escBlockTitle(t)}</h3><div style="font-size:14px;line-height:1.6;margin:0 0 14px;color:#334155;">${b}</div></div>`,
  table: (t, b) => `<div style="overflow-x:auto;margin:14px 0"><div style="min-width:480px">${t ? `<div style="font-weight:600;margin-bottom:6px">${escBlockTitle(t)}</div>` : ''}${b}</div></div>`,
  svg: (t, b) => `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin:14px 0;box-sizing:border-box;max-width:100%;">${b}</div>`,
  img: (t, b) => `<div style="margin:14px 0">${b}</div>`,
  plain: (t, b) => t ? `<div style="margin:14px 0"><b>${escBlockTitle(t)}</b><div style="margin-top:6px">${b}</div></div>` : `<div style="margin:14px 0">${b}</div>`
};
const AD_SNIPPET_TEMPLATE = n => `<div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:12px;padding:10px 14px;margin:18px 0;text-align:center;box-sizing:border-box;max-width:100%;">
<div style="font-size:11px;color:#94a3b8;letter-spacing:0.5px;margin-bottom:6px;">— Advertisement — <span style="background:#eef2f7;padding:2px 8px;border-radius:10px;margin-left:6px;">📢 Sponsored</span></div>
<ins class="adsbygoogle" id="ad-slot-${n}" style="display:block;min-height:1px;" data-ad-client="ca-pub-7389686596343881" data-ad-slot="000000000${n}" data-ad-format="auto" data-full-width-responsive="true"></ins>
</div>`;

function parseBlockHeader(header) {
  // Strip invisible characters (ZWSP/ZWJ/ZWNJ/BOM) an LLM occasionally
  // slips into its own markup so they never leak into a comparison or a
  // rendered title.
  const clean = String(header || '').replace(/[\u200B-\u200D\uFEFF]/g, '');
  // Accept ASCII ':' plus colon-shaped characters a model sometimes
  // substitutes for it -- fullwidth '：', modifier-letter colon U+A789,
  // or ratio '∶'. Missing any of these used to make parseBlockHeader
  // miss the type keyword entirely, so the WHOLE header (e.g.
  // "chart: ...") fell through as a literal "plain" title -- silently
  // discarding every card style, the chart renderer, and the h2/TOC
  // structure for the article (a real production incident, not
  // hypothetical).
  const COLON_RE = /[:：꞉∶]/;
  const m = COLON_RE.exec(clean);
  let type, title;
  if (m) {
    type = clean.slice(0, m.index).trim().toLowerCase();
    title = clean.slice(m.index + 1).trim();
  } else {
    const key = clean.trim().toLowerCase();
    if (BLOCK_TYPES.has(key)) { type = key; title = ''; }
    else {
      // No separator at all, but the header still starts with a known
      // type keyword followed by whitespace ("chart ..." instead of
      // "chart: ..."). Recover the type instead of showing the keyword
      // itself as a visible title.
      const wm = /^([a-z0-9]+)\s+(.+)$/i.exec(clean.trim());
      if (wm && BLOCK_TYPES.has(wm[1].toLowerCase())) { type = wm[1].toLowerCase(); title = wm[2].trim(); }
      else { type = 'plain'; title = clean.trim(); }
    }
  }
  if (!BLOCK_TYPES.has(type)) type = 'plain';
  return { type, title };
}

export function expandLongPostBlocks(raw) {
  const text = String(raw || '');
  const OPEN_RE = /\{\*\s*([^*}]+?)\s*\*\}/g;
  const markers = [];
  let m;
  while ((m = OPEN_RE.exec(text))) {
    markers.push({ start: m.index, end: m.index + m[0].length, header: m[1].trim() });
  }
  if (!markers.length) return { html: text, blockCount: 0, unclosedCount: 0 };

  let out = text.slice(0, markers[0].start);
  let blockCount = 0, unclosedCount = 0, adIdx = 0;
  const subAds = s => s.replace(/\[\[AD\]\]/g, () => AD_SNIPPET_TEMPLATE(++adIdx)).replace(/\[\[WC:\s*\d+\s*\]\]/gi, '');
  for (let i = 0; i < markers.length; i++) {
    const mk = markers[i];
    const next = markers[i + 1];
    const gapEnd = next ? next.start : text.length;
    const gap = text.slice(mk.end, gapEnd);
    if (/^end$/i.test(mk.header)) {
      out += subAds(gap.trim()) + '\n';
      continue;
    }
    const explicitEnd = next && /^end$/i.test(next.header);
    if (!explicitEnd) unclosedCount++;
    const content = subAds(gap.trim());
    const { type, title } = parseBlockHeader(mk.header);
    out += BLOCK_RENDERERS[type](title, content) + '\n';
    blockCount++;
  }
  return { html: out, blockCount, unclosedCount };
}

export function parseResponse(raw) {
  const seoResult = extractSEO(raw);
  const bodyResult = extractBody(raw);
  const pubResult = extractPublisherNotes(raw, bodyResult.endIdx);
  const cleanedBody = stripHtmlComments(bodyResult.bodyHtml);
  const blockResult = expandLongPostBlocks(cleanedBody);
  const result = {
    seo: seoResult.seo,
    bodyHtml: blockResult.html,
    publisherNotes: pubResult.publisherNotes,
    method: seoResult.method + ' + ' + bodyResult.method + (blockResult.blockCount ? ' + blocks:' + blockResult.blockCount : ''),
    truncated: bodyResult.cutOff && !pubResult.found
  };
  const warnings = [];
  if (!result.seo.focusKeyword) warnings.push('Focus Keyword missing.');
  if (!result.seo.seoTitle) warnings.push('SEO Title missing.');
  if (!result.seo.slug) warnings.push('URL Slug missing.');
  if (!result.seo.metaDescription) warnings.push('Meta Description missing.');
  if (!result.seo.h1) warnings.push('H1 missing.');
  if (!result.seo.imageAltText) warnings.push('Image ALT text missing.');
  if (!result.seo.imagePrompt) warnings.push('Image generation prompt missing.');
  if (!result.bodyHtml || result.bodyHtml.length < 500) warnings.push('Notes body looks too short or missing.');
  if (result.truncated) warnings.push('The reply looks CUT OFF midway (no closing marker found).');
  if (blockResult.blockCount === 0) warnings.push('No {* type: title *} block tags were found in the body.');
  if (blockResult.unclosedCount > 0) warnings.push(`${blockResult.unclosedCount} block(s) were missing an explicit {* END *} — auto-closed.`);
  if (seoResult.method === 'label-text') warnings.push('SEO fields: no JSON block found — read from the plain labeled panel instead.');
  if (bodyResult.method === 'h2-scan') warnings.push('Notes body: no marker comments found — guessed the body by scanning from the first <h2>.');
  result.warnings = warnings;
  return result;
}
