function readBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function createGatewayConfig(env = process.env) {
  return {
    port: Number(env.AI_GATEWAY_PORT || env.PORT || 8787),
    openaiApiKey: env.OPENAI_API_KEY || '',
    openaiBaseUrl: env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    model: env.OPENAI_MODEL || 'gpt-4o-mini',
    demoMode: readBoolean(env.AI_GATEWAY_DEMO_MODE, !env.OPENAI_API_KEY),
    allowOrigins: (env.AI_GATEWAY_ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map(origin => origin.trim()).filter(Boolean),
    maxToolRounds: Number(env.AI_GATEWAY_MAX_TOOL_ROUNDS || 3)
  };
}

module.exports = { createGatewayConfig };
