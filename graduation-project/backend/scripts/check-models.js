// 运行: node scripts/check-models.js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fetch = require('node-fetch');

const API_KEY = process.env.SILICONFLOW_API_KEY;
const BASE    = 'https://api.siliconflow.cn/v1';

async function listChatModels() {
  const res = await fetch(`${BASE}/models`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` },
  });
  if (!res.ok) { console.error(`列表接口失败: ${res.status}`); return []; }
  const data = await res.json();
  const all = (data.data || []).map(m => m.id).sort();
  // 只保留对话模型（过滤掉 embedding / audio / image / reranker 等）
  return all.filter(id =>
    /instruct|chat/i.test(id) &&
    !/bge|reranker|cosyvoice|sensevoice|tts|kolors|embedding/i.test(id)
  );
}

async function testModel(model) {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'Reply with the single word: OK' }],
      max_tokens: 10,
    }),
  });
  if (!res.ok) return { ok: false, status: res.status };
  const data = await res.json();
  return { ok: true, reply: data.choices?.[0]?.message?.content?.trim() };
}

async function main() {
  if (!API_KEY) { console.error('SILICONFLOW_API_KEY 未设置'); process.exit(1); }

  const models = await listChatModels();
  console.log(`找到 ${models.length} 个对话模型，逐一测试：\n`);

  const working = [];
  for (const m of models) {
    process.stdout.write(`  ${m} ... `);
    const r = await testModel(m);
    console.log(r.ok ? `✅  "${r.reply}"` : `❌  HTTP ${r.status}`);
    if (r.ok) working.push(m);
    await new Promise(res => setTimeout(res, 400));
  }

  console.log('\n=== 可用的对话模型 ===');
  if (working.length === 0) {
    console.log('没有找到可用模型，请检查 API Key 是否有效（登录 siliconflow.cn 查看余额/配额）');
  } else {
    working.forEach(m => console.log(' ', m));
  }
}

main().catch(console.error);
