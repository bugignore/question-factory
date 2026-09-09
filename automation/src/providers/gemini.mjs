// Gemini provider: same shape as providers/claude.mjs (runAgenticDraft,
// runSelfCheck), so generate-long-post.mjs can use either interchangeably.
// Uses Gemini's manual function-calling loop for search_ncert, plus the
// built-in googleSearch grounding tool as Claude's web_search equivalent.

import { GoogleGenAI } from '@google/genai';

export const name = 'gemini';
export const apiKeyEnvVar = 'GEMINI_API_KEY';

const MODEL = 'gemini-3.6-flash';
const SELF_CHECK_MODEL = 'gemini-3.6-flash';
const MAX_AGENT_TURNS = 12; // safety cap on the tool-use loop per topic

const SEARCH_NCERT_DECLARATION = {
  name: 'search_ncert',
  description: 'Search the curated NCERT chapter-gist corpus for content relevant to a sub-topic. Returns the top matching chunks with their chapter/subject citation.',
  parameters: {
    type: 'OBJECT',
    properties: {
      query: { type: 'STRING', description: 'What to search for — a concept, definition, or sub-topic name.' },
      subject: { type: 'STRING', description: 'Optional subject filter, e.g. "History", "Physics".' }
    },
    required: ['query']
  }
};

function textOf(response) {
  const parts = response.candidates?.[0]?.content?.parts || [];
  return parts.filter(p => p.text).map(p => p.text).join('\n');
}

function functionCallsOf(response) {
  const parts = response.candidates?.[0]?.content?.parts || [];
  return parts.filter(p => p.functionCall).map(p => p.functionCall);
}

// runAgenticDraft(apiKey, systemPrompt, userPrompt, retrieveFn) -> { rawReply, ncertChunksUsed }
export async function runAgenticDraft(apiKey, systemPrompt, userPrompt, retrieveFn) {
  const ai = new GoogleGenAI({ apiKey });
  const contents = [{ role: 'user', parts: [{ text: userPrompt }] }];
  const ncertChunksUsed = new Map();

  const config = {
    systemInstruction: systemPrompt,
    maxOutputTokens: 16000,
    tools: [
      { googleSearch: {} },
      { functionDeclarations: [SEARCH_NCERT_DECLARATION] }
    ]
  };

  for (let turn = 0; turn < MAX_AGENT_TURNS; turn++) {
    const response = await ai.models.generateContent({ model: MODEL, contents, config });

    contents.push(response.candidates[0].content);

    const calls = functionCallsOf(response).filter(c => c.name === 'search_ncert');
    if (calls.length === 0) {
      return { rawReply: textOf(response), ncertChunksUsed: [...ncertChunksUsed.values()] };
    }

    const responseParts = [];
    for (const call of calls) {
      const chunks = await retrieveFn(call.args.query, { subject: call.args.subject }, 5);
      chunks.forEach(c => ncertChunksUsed.set(c.id, c));
      const resultText = chunks.length
        ? chunks.map(c => `[${c.subject || 'NCERT'} — ${c.chapterTitle}]\n${c.text}`).join('\n\n---\n\n')
        : 'No matching NCERT corpus chunks found for this query.';
      responseParts.push({ functionResponse: { name: 'search_ncert', response: { result: resultText } } });
    }
    contents.push({ role: 'user', parts: responseParts });
  }

  throw new Error(`Agentic drafting loop exceeded ${MAX_AGENT_TURNS} turns without finishing.`);
}

// runSelfCheck(apiKey, prompt) -> raw text reply
export async function runSelfCheck(apiKey, prompt) {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: SELF_CHECK_MODEL,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: { maxOutputTokens: 4000 }
  });
  return textOf(response);
}
