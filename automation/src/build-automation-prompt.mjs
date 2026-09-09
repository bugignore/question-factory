// CLI: prints the stripped automation prompt to stdout for one topic.
// Usage:
//   node build-automation-prompt.mjs --topic "..." --exam "..." --subject "Hindi" --hindi 90 [--year 2026]

import { buildAutomationPrompt } from './prompt-builder-automation.mjs';

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
  console.error('Usage: node build-automation-prompt.mjs --topic "..." --exam "..." [--subject "..."] [--hindi 80] [--year 2026]');
  process.exit(1);
}

process.stdout.write(buildAutomationPrompt(topic, exam, subject, hindiPercent, year));
