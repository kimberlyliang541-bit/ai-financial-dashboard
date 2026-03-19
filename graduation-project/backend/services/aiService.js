const fetch = require('node-fetch');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL    = 'llama3-8b-8192';

const SYSTEM_PROMPT = `You are a financial news sentiment analyzer.
Given a headline or short news text, respond ONLY with a valid JSON object:
{
  "sentiment": "positive" | "negative" | "neutral",
  "confidence": <float 0.0–1.0>,
  "reason": "<one sentence in English>"
}
Do not include any other text.`;

/**
 * Analyze the sentiment of a single text string via Groq.
 * @param {string} text
 * @returns {Promise<{sentiment: string, confidence: number, reason: string}>}
 */
async function analyzeSentiment(text) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: text },
      ],
      temperature: 0.2,
    }),
  });

  if (!res.ok) throw new Error(`Groq API error: ${res.status}`);
  const data = await res.json();
  const raw  = data.choices[0].message.content.trim();
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Groq returned non-JSON response: ${raw.slice(0, 100)}`);
  }
}

module.exports = { analyzeSentiment };
