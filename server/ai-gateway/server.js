const http = require('http');
const { createGatewayConfig } = require('./config');
const { OpenAIResponsesClient } = require('./openaiClient');
const { AgentOrchestrator } = require('./agentOrchestrator');
const { createDefaultToolRegistry } = require('./toolRegistry');
const config = createGatewayConfig();
const toolRegistry = createDefaultToolRegistry();
const openaiClient = new OpenAIResponsesClient({ apiKey: config.openaiApiKey, baseUrl: config.openaiBaseUrl, model: config.model });
const orchestrator = new AgentOrchestrator({ openaiClient, toolRegistry, config });
function sendJson(res, statusCode, body, origin) { res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': origin || config.allowOrigins[0] || '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }); res.end(JSON.stringify(body)); }
function readBody(req) { return new Promise((resolve, reject) => { let body = ''; req.on('data', chunk => { body += chunk; if (body.length > 1024 * 1024) { reject(new Error('Request body too large')); req.destroy(); } }); req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch (_error) { reject(new Error('Invalid JSON body')); } }); req.on('error', reject); }); }
function getAllowedOrigin(req) { const origin = req.headers.origin; if (!origin) return config.allowOrigins[0] || '*'; return config.allowOrigins.includes(origin) ? origin : config.allowOrigins[0] || '*'; }
async function handleRequest(req, res) { const url = new URL(req.url, 'http://localhost'); const origin = getAllowedOrigin(req); if (req.method === 'OPTIONS') return sendJson(res, 204, {}, origin); try { if (req.method === 'GET' && url.pathname === '/health') return sendJson(res, 200, { ok: true, service: 'cafeconnect-ai-gateway', mode: config.demoMode || !openaiClient.isConfigured() ? 'demo' : 'openai-responses', model: config.model, tools: toolRegistry.list().map(tool => tool.name) }, origin); if (req.method === 'GET' && url.pathname === '/v1/tools') return sendJson(res, 200, { tools: toolRegistry.list() }, origin); if (req.method === 'POST' && url.pathname === '/v1/chat') { const body = await readBody(req); const result = await orchestrator.runChat(body); return sendJson(res, 200, result, origin); } return sendJson(res, 404, { error: 'Route not found' }, origin); } catch (error) { console.error('[ai-gateway] Request failed:', error); return sendJson(res, 500, { error: error.message || 'Internal gateway error' }, origin); } }
const server = http.createServer(handleRequest);
server.listen(config.port, () => { console.log('[ai-gateway] listening on http://localhost:' + config.port); console.log('[ai-gateway] mode:', config.demoMode || !openaiClient.isConfigured() ? 'demo' : 'openai-responses'); });
