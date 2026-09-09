// OpenAI provider: same shape as providers/claude.mjs and providers/gemini.mjs
// (runAgenticDraft, runSelfCheck), so generate-long-post.mjs can use any of
// the three interchangeably. Uses the Responses API's native function-calling
// loop for search_ncert, plus the hosted web_search_preview tool as Claude's
// web_search equivalent.

import OpenAI from 'openai';

export const name = 'openai';
export const apiKeyEnvVar = 'OPENAI_API_KEY';

const MODEL = 'gpt-4.1';
const SELF_CHECK_MODEL = 'gpt-4.1';
const MAX_AGENT_TURNS = 12; // safety cap on the tool-use loop per topic

const SEARCH_NCERT_TOOL = {
  type: 'function',
  name: 'search_ncert',
  description: 'Search the curated NCERT chapter-gist corpus for content relevant to a sub-topic. Returns the top matching chunks with their chapter/subject citation.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'What to search for — a concept, definition, or sub-topic name.' },
      subject: { type: 'string', description: 'Optional subject filter, e.g. "History", "Physics".' }
    },
    required: ['query'],
    additionalProperties: false
  }
};

const WEB_SEARCH_TOOL = { type: 'web_search_preview' };

function textOf(response) {
  if (response.output_text) return response.output_text;
  return (response.output || [])
    .filter(item => item.type === 'message')
    .flatMap(item => (item.content || []).filter(c => c.type === 'output_text').map(c => c.text))
    .join('\n');
}

// runAgenticDraft(apiKey, systemPrompt, userPrompt, retrieveFn) -> { rawReply, ncertChunksUsed }
export async function runAgenticDraft(apiKey, systemPrompt, userPrompt, retrieveFn) {
  const client = new OpenAI({ apiKey });
  let input = [{ role: 'user', content: userPrompt }];
  const ncertChunksUsed = new Map(); // id -> chunk, dedup across calls

  for (let turn = 0; turn < MAX_AGENT_TURNS; turn++) {
    const response = await client.responses.create({
      model: MODEL,
      instructions: systemPrompt,
      input,
      max_output_tokens: 16000,
      tools: [SEARCH_NCERT_TOOL, WEB_SEARCH_TOOL]
    });

    input = input.concat(response.output);

    const calls = response.output.filter(item => item.type === 'function_call' && item.name === 'search_ncert');
    if (calls.length === 0) {
      return { rawReply: textOf(response), ncertChunksUsed: [...ncertChunksUsed.values()] };
    }

    for (const call of calls) {
      const args = JSON.parse(call.arguments || '{}');
      const chunks = await retrieveFn(args.query, { subject: args.subject }, 5);
      chunks.forEach(c => ncertChunksUsed.set(c.id, c));
      const resultText = chunks.length
        ? chunks.map(c => `[${c.subject || 'NCERT'} — ${c.chapterTitle}]\n${c.text}`).join('\n\n---\n\n')
        : 'No matching NCERT corpus chunks found for this query.';
      input.push({ type: 'function_call_output', call_id: call.call_id, output: resultText });
    }
  }

  throw new Error(`Agentic drafting loop exceeded ${MAX_AGENT_TURNS} turns without finishing.`);
}

// runSelfCheck(apiKey, prompt) -> raw text reply
export async function runSelfCheck(apiKey, prompt) {
  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({
    model: SELF_CHECK_MODEL,
    input: [{ role: 'user', content: prompt }],
    max_output_tokens: 4000
  });
  return textOf(response);
}
