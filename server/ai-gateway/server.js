const fs = require('fs');
const http = require('http');
const path = require('path');
const { createGatewayConfig } = require('./config');
const { OpenAIResponsesClient } = require('./openaiClient');
const { AgentOrchestrator } = require('./agentOrchestrator');
const { createDefaultToolRegistry } = require('./toolRegistry');
const { EventStore } = require('./eventStore');

const config = createGatewayConfig();
const toolRegistry = createDefaultToolRegistry(config);
const openaiClient = new OpenAIResponsesClient({
  apiKey: config.openaiApiKey,
  baseUrl: config.openaiBaseUrl,
  model: config.model
});
const orchestrator = new AgentOrchestrator({ openaiClient, toolRegistry, config });
const eventStore = new EventStore({ maxEvents: config.maxBusinessEvents });

function getCorsOrigin(req) {
  const requestOrigin = req.headers.origin;

  if (config.allowOrigins.includes('*')) {
    return '*';
  }

  if (!requestOrigin) {
    return config.allowOrigins[0] || '*';
  }

  if (requestOrigin === 'null') {
    return config.allowOrigins.includes('null') ? 'null' : '*';
  }

  return config.allowOrigins.includes(requestOrigin)
    ? requestOrigin
    : config.allowOrigins[0] || '*';
}

function corsHeaders(req) {
  return {
    'Access-Control-Allow-Origin': getCorsOrigin(req),
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400'
  };
}

function sendJson(req, res, statusCode, body) {
  res.writeHead(statusCode, {
    ...corsHeaders(req),
    'Content-Type': 'application/json; charset=utf-8'
  });
  res.end(JSON.stringify(body));
}

function sendHtml(req, res, statusCode, html) {
  res.writeHead(statusCode, {
    ...corsHeaders(req),
    'Content-Type': 'text/html; charset=utf-8'
  });
  res.end(html);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (_error) {
        reject(new Error('Invalid JSON body'));
      }
    });

    req.on('error', reject);
  });
}

function getHarnessHtml() {
  const harnessPath = path.resolve(process.cwd(), 'manual-tests', 'ai-gateway-harness.html');

  try {
    return fs.readFileSync(harnessPath, 'utf8')
      .replace(
        /const gatewayUrl = .*?;/,
        "const gatewayUrl = window.location.origin;"
      );
  } catch (_error) {
    return `<!doctype html>
<html lang="it">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>CafeConnect AI Gateway</title></head>
<body style="font-family:Arial,sans-serif;padding:24px">
  <h1>CafeConnect AI Gateway</h1>
  <p>Gateway attivo. Apri <a href="/health">/health</a> per verificare lo stato.</p>
</body>
</html>`;
  }
}

async function handleRequest(req, res) {
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders(req));
    res.end();
    return;
  }

  try {
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      return sendHtml(req, res, 200, getHarnessHtml());
    }

    if (req.method === 'GET' && url.pathname === '/health') {
      return sendJson(req, res, 200, {
        ok: true,
        service: 'cafeconnect-ai-gateway',
        mode: config.demoMode || !openaiClient.isConfigured() ? 'demo' : 'openai-responses',
        model: config.model,
        tools: toolRegistry.list().map(tool => tool.name)
      });
    }

    if (req.method === 'GET' && url.pathname === '/v1/tools') {
      return sendJson(req, res, 200, { tools: toolRegistry.list() });
    }

    if (req.method === 'GET' && url.pathname === '/v1/events/summary') {
      return sendJson(req, res, 200, eventStore.summary());
    }

    if (req.method === 'POST' && url.pathname === '/v1/events') {
      const body = await readBody(req);
      const savedEvents = eventStore.append(body.events || body.event || body);
      return sendJson(req, res, 201, {
        ok: true,
        saved: savedEvents.length,
        summary: eventStore.summary()
      });
    }

    if (req.method === 'POST' && url.pathname === '/v1/chat') {
      const body = await readBody(req);
      const result = await orchestrator.runChat(body);
      return sendJson(req, res, 200, result);
    }

    return sendJson(req, res, 404, { error: 'Route not found' });
  } catch (error) {
    console.error('[ai-gateway] Request failed:', error);
    return sendJson(req, res, 500, { error: error.message || 'Internal gateway error' });
  }
}

const server = http.createServer(handleRequest);
server.listen(config.port, () => {
  console.log('[ai-gateway] listening on http://localhost:' + config.port);
  console.log('[ai-gateway] mode:', config.demoMode || !openaiClient.isConfigured() ? 'demo' : 'openai-responses');
});

