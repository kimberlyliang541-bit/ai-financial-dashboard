const fetch = require('node-fetch');

const SILICONFLOW_URL = 'https://api.siliconflow.cn/v1/chat/completions';

// Three free models on SiliconFlow — each has its own rate-limit quota.
// Round-robin across them to multiply effective throughput by ~3×.
const MODELS = [
  'Qwen/Qwen2.5-7B-Instruct',
  'THUDM/GLM-4-9B-0414',
  'deepseek-ai/DeepSeek-V3',
];

let modelIndex = 0; // module-level counter; incremented on every successful dispatch

const SYSTEM_PROMPT = `You are a financial news sentiment analyzer.
Given a headline or short news text, respond ONLY with a valid JSON object:
{
  "sentiment": "positive" | "negative" | "neutral",
  "confidence": <float 0.0–1.0>,
  "reason": "<one sentence in English>"
}
Do not include any other text.`;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Analyze the sentiment of a single text string via SiliconFlow.
 * Uses round-robin model rotation. On a 429 rate-limit response the next
 * model in the list is tried automatically (up to MODELS.length attempts).
 *
 * @param {string} text
 * @returns {Promise<{sentiment: string, confidence: number, reason: string}>}
 */
async function analyzeSentiment(text) {
  // 500 ms cooldown between calls keeps each model well within free-tier limits
  await sleep(500);

  for (let attempt = 0; attempt < MODELS.length; attempt++) {
    const model = MODELS[modelIndex % MODELS.length];
    modelIndex++;

    const res = await fetch(SILICONFLOW_URL, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.SILICONFLOW_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: text },
        ],
        temperature: 0.2,
      }),
    });

    // Rate-limited by this model — immediately try the next one (no extra sleep,
    // since the next model has its own fresh quota)
    if (res.status === 429) {
      console.warn(`[aiService] 429 from ${model}, trying next model`);
      continue;
    }

    if (!res.ok) throw new Error(`SiliconFlow API error: ${res.status} (model: ${model})`);

    const data = await res.json();
    const raw  = data.choices[0].message.content.trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch {}
    }
    // Model returned non-JSON (safety filter, etc.)
    return { sentiment: 'neutral', confidence: 0.5, reason: 'Analysis unavailable' };
  }

  // All models rate-limited simultaneously — very unlikely, but handle gracefully
  console.warn('[aiService] All models rate-limited, returning neutral fallback');
  return { sentiment: 'neutral', confidence: 0.5, reason: 'All models rate-limited' };
}

module.exports = { analyzeSentiment };
