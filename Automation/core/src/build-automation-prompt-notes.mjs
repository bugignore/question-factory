// CLI: prints the full Notes Factory prompt (v13, byte-identical to what the
// manual browser tool builds) to stdout for one topic.
// Usage:
//   node build-automation-prompt-notes.mjs --topic "..." --exam "..." --subject "Hindi" --hindi 90 [--year 2026]

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildNotesPrompt } from './prompt-builder-notes.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : fallback;
}

const topic = arg('topic');
const exam = arg('exam');
const subject = arg('subject', 'Auto-detect');
const hindiPercent = parseInt(arg('hindi', '80'), 10);
const year = parseInt(arg('year', '2026'), 10);

if (!topic || !exam) {
  console.error('Usage: node build-automation-prompt-notes.mjs --topic "..." --exam "..." [--subject "..."] [--hindi 80] [--year 2026]');
  process.exit(1);
}

const masterPromptText = fs.readFileSync(path.join(REPO_ROOT, 'MASTER-PROMPT-ExamNotesPDF_v13.md'), 'utf8');
process.stdout.write(buildNotesPrompt({ topic, examType: exam, subject, hindiPercent, year, masterPromptText, extraSourceUrls: '' }));
