function readBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function readList(value) {
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function createGatewayConfig(env = process.env) {
  return {
    port: Number(env.AI_GATEWAY_PORT || env.PORT || 8787),
    openaiApiKey: env.OPENAI_API_KEY || '',
    openaiBaseUrl: env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    model: env.OPENAI_MODEL || 'gpt-4o-mini',
    demoMode: readBoolean(env.AI_GATEWAY_DEMO_MODE, !env.OPENAI_API_KEY),
    allowOrigins: readList(env.AI_GATEWAY_ALLOWED_ORIGINS || 'http://localhost:3000'),
    maxToolRounds: Number(env.AI_GATEWAY_MAX_TOOL_ROUNDS || 3),
    maxBusinessEvents: Number(env.AI_GATEWAY_MAX_BUSINESS_EVENTS || 5000),
    knowledgeUrls: readList(env.AI_GATEWAY_KNOWLEDGE_URLS),
    knowledgeInline: env.AI_GATEWAY_KNOWLEDGE_INLINE || '',
    knowledgeCacheTtlMs: Number(env.AI_GATEWAY_KNOWLEDGE_CACHE_TTL_MS || 300000)
  };
}

module.exports = { createGatewayConfig };
