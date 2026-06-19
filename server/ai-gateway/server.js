const fs = require('fs');
const http = require('http');
const path = require('path');
const { createGatewayConfig } = require('./config');
const { OpenAIResponsesClient } = require('./openaiClient');
const { AgentOrchestrator } = require('./agentOrchestrator');
const { createDefaultToolRegistry } = require('./toolRegistry');
const { EventStore } = require('./eventStore');
const { OrderProcessor } = require('./orderProcessor');
const { OrderStore } = require('./orderStore');
const { MerchantConfigStore } = require('./merchantConfigStore');

const config = createGatewayConfig();
const toolRegistry = createDefaultToolRegistry(config);
const openaiClient = new OpenAIResponsesClient({
  apiKey: config.openaiApiKey,
  baseUrl: config.openaiBaseUrl,
  model: config.model
});
const orchestrator = new AgentOrchestrator({ openaiClient, toolRegistry, config });
const eventStore = new EventStore({ maxEvents: config.maxBusinessEvents });
const orderStore = new OrderStore({ maxOrders: config.maxOrders });
const merchantConfigStore = new MerchantConfigStore();
const orderProcessor = new OrderProcessor({ defaultWebhookUrl: config.orderWebhookUrl });

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

  if (config.allowOrigins.includes(requestOrigin) || isTrustedRenderOrigin(requestOrigin)) {
    return requestOrigin;
  }

  return config.allowOrigins[0] || '*';
}

function isTrustedRenderOrigin(origin) {
  try {
    const url = new URL(origin);
    return url.protocol === 'https:' && url.hostname.endsWith('.onrender.com');
  } catch (_error) {
    return false;
  }
}

function corsHeaders(req) {
  return {
    'Access-Control-Allow-Origin': getCorsOrigin(req),
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
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

function getRequestApiKey(req) {
  const authHeader = req.headers.authorization || '';
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  return req.headers['x-api-key'] || (bearerMatch ? bearerMatch[1] : '');
}

function isMerchantConfigAuthorized(req, accessMode) {
  const requiredKey = accessMode === 'write'
    ? config.merchantConfigWriteKey
    : config.merchantConfigReadKey;

  if (!requiredKey) {
    return true;
  }

  return getRequestApiKey(req) === requiredKey;
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
    const merchantConfigMatch = url.pathname.match(/^\/v1\/merchants\/([^/]+)\/config$/);

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

    if (merchantConfigMatch && req.method === 'GET') {
      if (!isMerchantConfigAuthorized(req, 'read')) {
        return sendJson(req, res, 401, { error: 'Merchant config read access denied' });
      }

      const merchantId = decodeURIComponent(merchantConfigMatch[1]);
      const record = merchantConfigStore.get(merchantId);
      return sendJson(req, res, 200, record
        ? { found: true, ...record }
        : { found: false, merchantId, config: null });
    }

    if (merchantConfigMatch && req.method === 'PUT') {
      if (!isMerchantConfigAuthorized(req, 'write')) {
        return sendJson(req, res, 401, { error: 'Merchant config write access denied' });
      }

      const merchantId = decodeURIComponent(merchantConfigMatch[1]);
      const body = await readBody(req);
      const record = merchantConfigStore.put(merchantId, body.config || body);
      return sendJson(req, res, 200, { ok: true, ...record });
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

    if (req.method === 'GET' && url.pathname === '/v1/orders') {
      const limit = Number(url.searchParams.get('limit') || 25);
      return sendJson(req, res, 200, { orders: orderStore.list(limit) });
    }

    if (req.method === 'POST' && url.pathname === '/v1/orders') {
      const body = await readBody(req);

      try {
        const result = await orderProcessor.process(body);
        const orderRecord = orderStore.append({
          status: 'submitted',
          orderId: result.orderId,
          order: body.order,
          timestamp: Date.now()
        });
        eventStore.append({
          type: 'order_submitted',
          timestamp: Date.now(),
          payload: {
            orderId: result.orderId,
            method: 'webhook',
            subtotal: body.order && body.order.subtotal,
            itemCount: body.order && Array.isArray(body.order.items)
              ? body.order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
              : 0
          }
        });
        return sendJson(req, res, 201, {
          ...result,
          orderRecord
        });
      } catch (orderError) {
        const orderRecord = orderStore.append({
          status: 'failed',
          order: body.order,
          timestamp: Date.now(),
          error: orderError.message || 'Order gateway error'
        });
        eventStore.append({
          type: 'order_failed',
          timestamp: Date.now(),
          payload: {
            method: 'webhook',
            subtotal: body.order && body.order.subtotal,
            error: orderError.message || 'Order gateway error'
          }
        });
        return sendJson(req, res, 502, {
          error: orderError.message || 'Order gateway error',
          orderRecord
        });
      }
    }

    if (req.method === 'POST' && url.pathname === '/v1/chat') {
      const body = await readBody(req);
      const result = await orchestrator.runChat(body);
      return sendJson(req, res, 200, result);
    }

    return sendJson(req, res, 404, { error: 'Route not found' });
  } catch (error) {
    if (error.message === 'Invalid merchant id') {
      return sendJson(req, res, 400, { error: error.message });
    }

    console.error('[ai-gateway] Request failed:', error);
    return sendJson(req, res, 500, { error: error.message || 'Internal gateway error' });
  }
}

const server = http.createServer(handleRequest);
server.listen(config.port, () => {
  console.log('[ai-gateway] listening on http://localhost:' + config.port);
  console.log('[ai-gateway] mode:', config.demoMode || !openaiClient.isConfigured() ? 'demo' : 'openai-responses');
});

