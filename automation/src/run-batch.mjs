// CLI entrypoint. Reads the provider's API key from env (never stored),
// loops topics.json, generates + commits + pushes each pending topic with a
// cooldown between runs. Resumable: re-running only touches topics still
// "pending" or "failed". NCERT retrieval is local BM25 (see retrieve.mjs) —
// no second API key needed for that.
//
// Usage (PowerShell):
//   $env:ANTHROPIC_API_KEY = "sk-ant-..."
//   node run-batch.mjs
//
//   # or, to use Gemini instead:
//   $env:AI_PROVIDER = "gemini"
//   $env:GEMINI_API_KEY = "AIza..."
//   node run-batch.mjs
//
// Optional env: AI_PROVIDER (claude|gemini, default claude),
// COOLDOWN_SECONDS (default 120), MAX_RETRIES (default 2).

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { generateOne } from './generate-long-post.mjs';
import * as claudeProvider from './providers/claude.mjs';
import * as geminiProvider from './providers/gemini.mjs';
import * as openaiProvider from './providers/openai.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const TOPICS_PATH = join(__dirname, '..', 'input', 'topics.json');
const PENDING_DIR = join(REPO_ROOT, 'pending-long-posts');

const COOLDOWN_SECONDS = parseInt(process.env.COOLDOWN_SECONDS || '120', 10);
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || '2', 10);

const PROVIDERS = { claude: claudeProvider, gemini: geminiProvider, openai: openaiProvider };

function resolveProvider() {
  const key = (process.env.AI_PROVIDER || 'claude').toLowerCase();
  const provider = PROVIDERS[key];
  if (!provider) {
    console.error(`Unknown AI_PROVIDER "${key}". Valid options: ${Object.keys(PROVIDERS).join(', ')}`);
    process.exit(1);
  }
  return provider;
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`${name} is not set. Set it in this shell session only — it is never read from or written to a file.`);
    process.exit(1);
  }
  return v;
}

function loadTopics() {
  return JSON.parse(readFileSync(TOPICS_PATH, 'utf8'));
}
function saveTopics(topics) {
  writeFileSync(TOPICS_PATH, JSON.stringify(topics, null, 2) + '\n');
}

function git(args) {
  return execFileSync('git', args, { cwd: REPO_ROOT, stdio: 'pipe' }).toString();
}

function commitAndPush(message) {
  try {
    git(['add', 'automation/input/topics.json', 'pending-long-posts']);
    const status = git(['status', '--porcelain']);
    if (!status.trim()) return; // nothing to commit
    git(['commit', '-m', message]);
    git(['push']);
  } catch (e) {
    console.error('  [error] git commit/push failed:', e.message);
    throw e;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const provider = resolveProvider();
  const apiKey = requireEnv(provider.apiKeyEnvVar);
  console.log(`Using provider: ${provider.name}`);

  if (!existsSync(PENDING_DIR)) mkdirSync(PENDING_DIR, { recursive: true });

  const topics = loadTopics();
  const runnable = topics.filter(t => t.status === 'pending' || t.status === 'failed');
  if (!runnable.length) {
    console.log('No pending/failed topics in topics.json — nothing to do.');
    return;
  }
  console.log(`${runnable.length} topic(s) to process. Cooldown ${COOLDOWN_SECONDS}s between topics.`);

  for (let i = 0; i < runnable.length; i++) {
    const t = runnable[i];
    if ((t.attempts || 0) >= MAX_RETRIES && t.status === 'failed') {
      console.log(`── Skipping "${t.topic}" (${t.exam}) — already failed ${t.attempts} time(s), MAX_RETRIES=${MAX_RETRIES}`);
      continue;
    }
    console.log(`── [${i + 1}/${runnable.length}] "${t.topic}" (${t.exam}) ──`);
    t.status = 'running';
    t.attempts = (t.attempts || 0) + 1;
    saveTopics(topics);

    try {
      const bundle = await generateOne(t.topic, t.exam, t.subject || 'Auto-detect', t.hindiPercent || 70, apiKey, provider);
      const slug = bundle.seo.slug;
      writeFileSync(join(PENDING_DIR, `${slug}.json`), JSON.stringify(bundle, null, 2));
      t.status = 'done';
      t.slug = slug;
      t.error = null;
      saveTopics(topics);
      commitAndPush(`Generate long post: ${slug}`);
      console.log(`  ✔ done — pending-long-posts/${slug}.json (publish-long-post.yml will pick it up on push)`);
    } catch (e) {
      console.error(`  ✘ failed: ${e.message}`);
      t.status = 'failed';
      t.error = e.message;
      saveTopics(topics);
      commitAndPush(`Mark long post topic failed: ${t.topic} (${t.exam})`);
    }

    const isLast = i === runnable.length - 1;
    if (!isLast) {
      console.log(`  cooling down ${COOLDOWN_SECONDS}s...`);
      await sleep(COOLDOWN_SECONDS * 1000);
    }
  }

  console.log('Batch complete.');
}

main().catch(e => { console.error(e); process.exit(1); });
