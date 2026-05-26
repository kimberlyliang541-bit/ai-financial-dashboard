const fetch = require('node-fetch');

// ═══════════════════════════════════════════════════════════════════════════════
// AI Service — 5-Level Cascade Architecture
// ═══════════════════════════════════════════════════════════════════════════════
//
//  Level 1: 智谱 GLM-4.7-Flash  — 永久免费，无限调用，最稳定
//  Level 2: DeepSeek             — 注册送 500 万 tokens，无限速
//  Level 3: SiliconFlow          — 注册送 2000 万 tokens，多模型轮询
//  Level 4: (可扩展)             — 预留接口，随时加新平台
//  Level 5: Keyword rules        — 零成本兜底，永远不会失败
//
//  Design principles:
//  - 每个平台独立配置，有 key 才启用，没 key 自动跳过
//  - 平台级健康追踪：连续失败自动冷却，避免重复请求已挂的平台
//  - 模型级轮询：同平台多模型 round-robin 分散限流
//  - 指数退避：429 后等待时间逐次翻倍
//  - analyzeSentiment 永远返回结果（最终 fallback 到关键词）
//  - generateText 需要真正的 LLM 输出，不做关键词 fallback
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Platform Registry ────────────────────────────────────────────────────────
// 所有 OpenAI-compatible 的平台都可以按这个格式添加
// 只要 .env 里有对应的 key，就会自动启用

function buildPlatforms() {
  const platforms = [];

  // Level 1: 智谱 GLM — 永久免费，无限量，最推荐
  // 注册: https://open.bigmodel.cn → API Keys
  if (process.env.ZHIPU_API_KEY) {
    platforms.push({
      name: 'Zhipu',
      url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      key: process.env.ZHIPU_API_KEY,
      models: ['glm-4-flash'],  // 永久免费
      rateDelay: 100,           // 几乎不限速
    });
  }

  // Level 2: DeepSeek — 注册送 500万 tokens，无限速，性价比之王
  // 注册: https://platform.deepseek.com
  if (process.env.DEEPSEEK_API_KEY) {
    platforms.push({
      name: 'DeepSeek',
      url: 'https://api.deepseek.com/v1/chat/completions',
      key: process.env.DEEPSEEK_API_KEY,
      models: ['deepseek-chat'],
      rateDelay: 100,
    });
  }

  // Level 3: SiliconFlow — 注册送 2000万 tokens，多免费模型
  // 注册: https://cloud.siliconflow.cn
  if (process.env.SILICONFLOW_API_KEY) {
    platforms.push({
      name: 'SiliconFlow',
      url: 'https://api.siliconflow.cn/v1/chat/completions',
      key: process.env.SILICONFLOW_API_KEY,
      models: [
        'Qwen/Qwen2.5-7B-Instruct',
        'Qwen/Qwen2.5-14B-Instruct',
        'internlm/internlm2_5-7b-chat',
      ],
      rateDelay: 300,  // SiliconFlow 限速较严
    });
  }

  // Level 4: 预留 — 在这里添加更多平台
  // 例如: 阿里百炼、腾讯混元、Groq、Cerebras 等
  // if (process.env.DASHSCOPE_API_KEY) { platforms.push({...}); }

  return platforms;
}

const PLATFORMS = buildPlatforms();

// ─── Platform Health Tracker ──────────────────────────────────────────────────
// 跟踪每个平台的健康状态，避免反复请求已经挂掉的平台

const platformHealth = {};

function getHealth(name) {
  if (!platformHealth[name]) {
    platformHealth[name] = {
      consecutiveFailures: 0,  // 连续失败次数
      cooldownUntil: 0,        // 冷却到期时间戳
      modelIndex: 0,           // round-robin 计数器
      totalCalls: 0,           // 总调用次数
      totalSuccess: 0,         // 总成功次数
    };
  }
  return platformHealth[name];
}

function markSuccess(name) {
  const h = getHealth(name);
  h.consecutiveFailures = 0;
  h.cooldownUntil = 0;
  h.totalCalls++;
  h.totalSuccess++;
}

function markFailure(name) {
  const h = getHealth(name);
  h.consecutiveFailures++;
  h.totalCalls++;
  // 指数冷却: 3次失败→30秒, 6次→60秒, 9次→120秒, 上限5分钟
  if (h.consecutiveFailures >= 3) {
    const cooldownMs = Math.min(30000 * Math.pow(2, Math.floor(h.consecutiveFailures / 3) - 1), 300000);
    h.cooldownUntil = Date.now() + cooldownMs;
    console.warn(`[aiService] ${name} cooled down for ${cooldownMs / 1000}s (${h.consecutiveFailures} failures)`);
  }
}

function isAvailable(name) {
  const h = getHealth(name);
  if (h.cooldownUntil && Date.now() < h.cooldownUntil) return false;
  return true;
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

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

// ─── Level 5: Keyword Fallback (zero cost, never fails) ──────────────────────

const POS_WORDS = [
  'surge','surges','surging','soar','soars','soaring',
  'beat','beats','exceed','exceeds',
  'rise','rises','rising','rally','rallies',
  'gain','gains','climb','climbs',
  'bull','bullish','upbeat','optimis',
  'record high','all-time high','new high',
  'upgrade','upgrades','outperform',
  'profit','profits','profitable',
  'growth','grow','grows','growing',
  'boost','boosts','boosted',
  'positive','success','successful',
  'innovation','innovative','breakthrough',
  'launch','launches','expand','expansion',
  'recover','recovery','win','wins','won',
  'strong','strength','revenue growth','earnings beat',
  'higher','increase','opportunity','partnership','demand','momentum',
];

const NEG_WORDS = [
  'fall','falls','falling','fell',
  'drop','drops','dropping','dropped',
  'crash','crashes','crashing',
  'miss','misses','missed',
  'lose','loses','losing','lost','loss',
  'bear','bearish',
  'downgrade','downgrades','sell','underperform',
  'decline','declines','declining',
  'slump','plunge','plunges',
  'weak','weakness',
  'risk','risks','risky',
  'lawsuit','sue','sued','fraud','scandal','investigation',
  'recall','recalls','layoff','layoffs','job cuts',
  'warning','warns','warned',
  'debt','default','concern','concerns',
  'threat','threatens','volatile','volatility','uncertainty',
  'lower','decrease','disappoint','disappointing',
  'struggle','struggles','trouble',
  'fine','fined','penalty',
  'ban','banned','restrict','restriction','tariff','tariffs',
];

function keywordSentiment(text) {
  const h = text.toLowerCase();
  const pScore = POS_WORDS.filter(w => h.includes(w)).length;
  const nScore = NEG_WORDS.filter(w => h.includes(w)).length;

  if (pScore > nScore) {
    return { sentiment: 'positive', confidence: Math.min(0.5 + pScore * 0.1, 0.85), reason: `Keyword match: ${pScore} positive signals` };
  }
  if (nScore > pScore) {
    return { sentiment: 'negative', confidence: Math.min(0.5 + nScore * 0.1, 0.85), reason: `Keyword match: ${nScore} negative signals` };
  }
  return { sentiment: 'neutral', confidence: 0.5, reason: 'No dominant keyword signal' };
}

// ─── Core Engine: Multi-platform Cascade ──────────────────────────────────────

/**
 * Cascade through all healthy platforms. Within each platform, round-robin models.
 * Returns { res, platform, model } on first success, or null if all exhausted.
 */
async function cascadeFetch(buildBody) {
  for (const platform of PLATFORMS) {
    // Skip cooled-down platforms
    if (!isAvailable(platform.name)) {
      continue;
    }

    const health = getHealth(platform.name);

    for (let attempt = 0; attempt < platform.models.length; attempt++) {
      const model = platform.models[health.modelIndex % platform.models.length];
      health.modelIndex++;

      try {
        // Rate-limit delay per platform
        if (platform.rateDelay) await sleep(platform.rateDelay);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const res = await fetch(platform.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${platform.key}`,
          },
          body: JSON.stringify(buildBody(model)),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        // Rate limited → try next model on same platform
        if (res.status === 429) {
          console.warn(`[ai] 429 ${platform.name}/${model}`);
          markFailure(platform.name);
          await sleep(2000 * (attempt + 1)); // progressive backoff within platform
          continue;
        }

        // Auth/quota error → skip entire platform
        if (res.status === 401 || res.status === 402 || res.status === 403) {
          console.warn(`[ai] ${res.status} ${platform.name} — skipping platform`);
          markFailure(platform.name);
          break;
        }

        // Success
        markSuccess(platform.name);
        return { res, platform: platform.name, model };

      } catch (e) {
        console.warn(`[ai] ${platform.name}/${model} error: ${e.message}`);
        markFailure(platform.name);
        continue;
      }
    }
  }

  return null; // All platforms exhausted
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Analyze sentiment — always returns a result.
 * Cascade: Zhipu → DeepSeek → SiliconFlow → [...] → Keyword rules
 */
async function analyzeSentiment(text) {
  // If no API platforms configured at all, go straight to keywords
  if (PLATFORMS.length === 0) {
    return keywordSentiment(text);
  }

  const result = await cascadeFetch(model => ({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: text },
    ],
    temperature: 0.2,
  }));

  // All APIs failed → keyword fallback (still returns valid result)
  if (!result) {
    return keywordSentiment(text);
  }

  const { res, platform, model } = result;

  if (!res.ok) {
    console.warn(`[ai] ${platform}/${model} returned ${res.status}`);
    return keywordSentiment(text);
  }

  try {
    const data = await res.json();
    const raw  = data.choices[0].message.content.trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (parsed.sentiment && parsed.confidence != null) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn(`[ai] Parse error from ${platform}: ${e.message}`);
  }

  // LLM returned gibberish → keyword fallback
  return keywordSentiment(text);
}

/**
 * Generate free-form text — requires real LLM (no keyword fallback).
 * Used for AI Insight Report.
 */
async function generateText(prompt) {
  if (PLATFORMS.length === 0) {
    throw new Error('No LLM platforms configured. Add at least one API key to .env');
  }

  const result = await cascadeFetch(model => ({
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 1000,
  }));

  if (!result) {
    throw new Error('All LLM platforms unavailable. Check API keys and quotas in .env');
  }

  const { res, platform } = result;
  if (!res.ok) throw new Error(`${platform} API error: ${res.status}`);

  const data = await res.json();
  return data.choices[0].message.content.trim();
}

/**
 * Get health status of all platforms — useful for debugging and dashboard.
 */
function getHealthReport() {
  return PLATFORMS.map(p => {
    const h = getHealth(p.name);
    return {
      name: p.name,
      models: p.models,
      available: isAvailable(p.name),
      consecutiveFailures: h.consecutiveFailures,
      totalCalls: h.totalCalls,
      successRate: h.totalCalls > 0 ? `${Math.round(h.totalSuccess / h.totalCalls * 100)}%` : 'N/A',
      cooldownRemaining: h.cooldownUntil > Date.now() ? `${Math.round((h.cooldownUntil - Date.now()) / 1000)}s` : null,
    };
  });
}

module.exports = { analyzeSentiment, generateText, getHealthReport };
