// Claude provider: agentic loop using Anthropic's native tool_use + the
// server-side web_search tool. Logic unchanged from the original
// generate-long-post.mjs — just relocated behind the shared provider
// interface (runAgenticDraft, runSelfCheck) so run-batch.mjs can pick a
// provider by name.

import Anthropic from '@anthropic-ai/sdk';

export const name = 'claude';
export const apiKeyEnvVar = 'ANTHROPIC_API_KEY';

const MODEL = 'claude-sonnet-5';
const SELF_CHECK_MODEL = 'claude-sonnet-5';
const MAX_AGENT_TURNS = 12; // safety cap on the tool-use loop per topic

const SEARCH_NCERT_TOOL = {
  name: 'search_ncert',
  description: 'Search the curated NCERT chapter-gist corpus for content relevant to a sub-topic. Returns the top matching chunks with their chapter/subject citation.',
  input_schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'What to search for — a concept, definition, or sub-topic name.' },
      subject: { type: 'string', description: 'Optional subject filter, e.g. "History", "Physics".' }
    },
    required: ['query']
  }
};

const WEB_SEARCH_TOOL = { type: 'web_search_20250305', name: 'web_search' };

// runAgenticDraft(apiKey, systemPrompt, userPrompt, retrieveFn) -> { rawReply, ncertChunksUsed }
export async function runAgenticDraft(apiKey, systemPrompt, userPrompt, retrieveFn) {
  const client = new Anthropic({ apiKey });
  const messages = [{ role: 'user', content: userPrompt }];
  const ncertChunksUsed = new Map(); // id -> chunk, dedup across calls

  for (let turn = 0; turn < MAX_AGENT_TURNS; turn++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: systemPrompt,
      messages,
      tools: [SEARCH_NCERT_TOOL, WEB_SEARCH_TOOL]
    });

    messages.push({ role: 'assistant', content: response.content });

    const toolUses = response.content.filter(b => b.type === 'tool_use' && b.name === 'search_ncert');
    if (response.stop_reason !== 'tool_use' || toolUses.length === 0) {
      const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
      if (response.stop_reason !== 'tool_use') {
        return { rawReply: text, ncertChunksUsed: [...ncertChunksUsed.values()] };
      }
    }

    if (toolUses.length === 0) continue;

    const toolResults = [];
    for (const tu of toolUses) {
      const chunks = await retrieveFn(tu.input.query, { subject: tu.input.subject }, 5);
      chunks.forEach(c => ncertChunksUsed.set(c.id, c));
      const resultText = chunks.length
        ? chunks.map(c => `[${c.subject || 'NCERT'} — ${c.chapterTitle}]\n${c.text}`).join('\n\n---\n\n')
        : 'No matching NCERT corpus chunks found for this query.';
      toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: resultText });
    }
    messages.push({ role: 'user', content: toolResults });
  }

  throw new Error(`Agentic drafting loop exceeded ${MAX_AGENT_TURNS} turns without finishing.`);
}

// runSelfCheck(apiKey, prompt) -> raw text reply
export async function runSelfCheck(apiKey, prompt) {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: SELF_CHECK_MODEL,
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }]
  });
  return response.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
}
