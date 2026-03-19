const fetch = require('node-fetch');

const SILICONFLOW_URL = 'https://api.siliconflow.cn/v1/chat/completions';
const MODEL           = 'Qwen/Qwen2.5-7B-Instruct';

const SYSTEM_PROMPT = `You are a financial news sentiment analyzer.
Given a headline or short news text, respond ONLY with a valid JSON object:
{
  "sentiment": "positive" | "negative" | "neutral",
  "confidence": <float 0.0–1.0>,
  "reason": "<one sentence in English>"
}
Do not include any other text.`;

/**
 * Analyze the sentiment of a single text string via SiliconFlow.
 * @param {string} text
 * @returns {Promise<{sentiment: string, confidence: number, reason: string}>}
 */
async function analyzeSentiment(text) {
  const res = await fetch(SILICONFLOW_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${process.env.SILICONFLOW_API_KEY}`,
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

  if (!res.ok) throw new Error(`SiliconFlow API error: ${res.status}`);
  const data = await res.json();
  const raw  = data.choices[0].message.content.trim();
  // Try to extract JSON object from response (model may wrap it in text)
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
  }
  // Fallback: model refused or returned non-JSON (e.g. safety filter)
  return { sentiment: 'neutral', confidence: 0.5, reason: 'Analysis unavailable' };
}

module.exports = { analyzeSentiment };
