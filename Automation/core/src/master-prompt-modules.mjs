// Splits a Master Prompt (e.g. MASTER-PROMPT-ExamNotesPDF_v13.md) into
// addressable modules by its existing `## Heading` structure — no changes
// to the Master Prompt file itself are required for this to work, which is
// deliberate: the Master Prompt stays the single, human-edited source of
// truth, and this parser is just an external lens onto it. See
// prompt-assembler.mjs for how these modules get selected/trimmed per run.
//
// OPTIONAL explicit module metadata: a module's heading line may be
// immediately followed by an HTML comment declaring which contexts it
// applies to, e.g.:
//   ## MATHS DEPTH
//   <!-- module: id=MATHS_DEPTH subject=maths,math depends_on=CORE,EDITORIAL -->
// Recognized keys: id, subject, exam, level, tool, depends_on (all
// comma-separated value lists; a key a module doesn't declare means "applies
// regardless of that dimension"). This is what lets prompt-assembler.mjs do
// GENERIC selection (module applies to subject X / level Y / tool Z) instead
// of relying only on hard-coded heading-name pattern matching — needed for a
// future, more modular Master Prompt (or the synthetic scalability test in
// prompt-assembler.scalability-test.mjs) where dozens of exam/subject/level
// modules exist. A module with NO such comment (true of every section in
// today's real MASTER-PROMPT-ExamNotesPDF_v13.md) simply has `meta: null`
// and falls back entirely to prompt-assembler.mjs's heading-name MODULE_RULES
// — this is fully backward compatible, nothing about the real file changes.

const META_COMMENT_RE = /^<!--\s*module:\s*(.+?)\s*-->\s*$/;

function parseMetaComment(line) {
  const m = META_COMMENT_RE.exec(line.trim());
  if (!m) return null;
  const meta = {};
  for (const pair of m[1].split(/\s+/)) {
    const [key, val] = pair.split('=');
    if (!key || val === undefined) continue;
    meta[key] = val.split(',');
  }
  return meta;
}

/**
 * @param {string} masterText raw Master Prompt markdown
 * @returns {Array<{heading:string, text:string, meta:Object|null}>} one entry
 *   per `## ` section, plus a leading `{heading:'(preamble)', text}` entry
 *   for anything before the first `## ` heading.
 */
export function parseMasterPromptModules(masterText) {
  const text = String(masterText || '');
  const parts = text.split(/\n(?=## )/);
  return parts.map(block => {
    const m = /^## (.+)$/m.exec(block);
    if (!m) return { heading: '(preamble)', text: block, meta: null };
    const afterHeading = block.slice(block.indexOf('\n', m.index) + 1);
    const nextLine = afterHeading.split('\n', 1)[0];
    return { heading: m[1].trim(), text: block, meta: parseMetaComment(nextLine) };
  });
}
