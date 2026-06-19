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
const { AuditLogStore } = require('./auditLogStore');
const { TenantStorageResolver } = require('./tenantStorageResolver');

const config = createGatewayConfig();
const toolRegistry = createDefaultToolRegistry(config);
const openaiClient = new OpenAIResponsesClient({
  apiKey: config.openaiApiKey,
  baseUrl: config.openaiBaseUrl,
  model: config.model
});
const orchestrator = new AgentOrchestrator({ openaiClient, toolRegistry, config });
const storageResolver = new TenantStorageResolver({ isolationMode: config.tenantIsolationMode });
const tenantStores = new Map();
const orderProcessor = new OrderProcessor({ defaultWebhookUrl: config.orderWebhookUrl });

const ROLE_RANK = {
  anonymous: 0,
  viewer: 1,
  admin: 2,
  owner: 3
};

const OWNER_ONLY_CONFIG_SECTIONS = new Set(['agents', 'integrations', 'dataGovernance']);

function getStoresForMerchant(merchantId) {
  const safeMerchantId = String(merchantId || config.defaultMerchantId).trim() || config.defaultMerchantId;

  if (!tenantStores.has(safeMerchantId)) {
    const paths = storageResolver.getPaths(safeMerchantId);
    tenantStores.set(safeMerchantId, {
      paths,
      merchantConfigStore: new MerchantConfigStore({ configDir: paths.merchantConfigDir }),
      auditLogStore: new AuditLogStore({ filePath: paths.auditLogPath, maxEvents: config.maxAuditEvents }),
      eventStore: new EventStore({ filePath: paths.businessEventsPath, maxEvents: config.maxBusinessEvents }),
      orderStore: new OrderStore({ filePath: paths.ordersPath, maxOrders: config.maxOrders })
    });
  }

  return tenantStores.get(safeMerchantId);
}

function getRequestMerchantId(req, url, body) {
  return (
    url.searchParams.get('merchantId') ||
    req.headers['x-merchant-id'] ||
    body?.merchantId ||
    body?.tenant?.merchantId ||
    body?.event?.merchantId ||
    body?.event?.payload?.merchantId ||
    body?.events?.[0]?.merchantId ||
    body?.events?.[0]?.payload?.merchantId ||
    body?.order?.businessId ||
    body?.order?.merchantId ||
    config.defaultMerchantId
  );
}

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

function getRequestActor(req) {
  const requestKey = getRequestApiKey(req);

  if (config.merchantConfigOwnerKey && requestKey === config.merchantConfigOwnerKey) {
    return { role: 'owner', id: 'owner-key' };
  }

  if (config.merchantConfigWriteKey && requestKey === config.merchantConfigWriteKey) {
    return { role: 'admin', id: 'admin-key' };
  }

  if (config.merchantConfigReadKey && requestKey === config.merchantConfigReadKey) {
    return { role: 'viewer', id: 'viewer-key' };
  }

  if (!config.merchantConfigReadKey && !config.merchantConfigWriteKey && !config.merchantConfigOwnerKey) {
    return { role: 'owner', id: 'demo-open-access' };
  }

  return { role: 'anonymous', id: 'anonymous' };
}

function hasRole(actor, requiredRole) {
  return ROLE_RANK[actor.role] >= ROLE_RANK[requiredRole];
}

function getRequestMetadata(req) {
  return {
    origin: req.headers.origin || '',
    userAgent: req.headers['user-agent'] || '',
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''
  };
}

function getChangedSections(previousConfig = {}, nextConfig = {}) {
  const keys = new Set([
    ...Object.keys(previousConfig || {}),
    ...Object.keys(nextConfig || {})
  ]);

  return Array.from(keys).filter(key => (
    JSON.stringify(previousConfig ? previousConfig[key] : undefined) !==
    JSON.stringify(nextConfig ? nextConfig[key] : undefined)
  ));
}

function getForbiddenSectionsForRole(role, changedSections) {
  if (role === 'owner') {
    return [];
  }

  return changedSections.filter(section => OWNER_ONLY_CONFIG_SECTIONS.has(section));
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
    const merchantAuditMatch = url.pathname.match(/^\/v1\/merchants\/([^/]+)\/audit$/);

    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      return sendHtml(req, res, 200, getHarnessHtml());
    }

    if (req.method === 'GET' && url.pathname === '/health') {
      return sendJson(req, res, 200, {
        ok: true,
        service: 'cafeconnect-ai-gateway',
        mode: config.demoMode || !openaiClient.isConfigured() ? 'demo' : 'openai-responses',
        model: config.model,
        storage: storageResolver.describe(),
        defaultMerchantId: config.defaultMerchantId,
        tools: toolRegistry.list().map(tool => tool.name)
      });
    }

    if (req.method === 'GET' && url.pathname === '/v1/tools') {
      return sendJson(req, res, 200, { tools: toolRegistry.list() });
    }

    if (merchantConfigMatch && req.method === 'GET') {
      const actor = getRequestActor(req);
      if (!hasRole(actor, 'viewer')) {
        return sendJson(req, res, 401, { error: 'Merchant config read access denied' });
      }

      const merchantId = decodeURIComponent(merchantConfigMatch[1]);
      const { merchantConfigStore, auditLogStore } = getStoresForMerchant(merchantId);
      const record = merchantConfigStore.get(merchantId);
      auditLogStore.append({
        merchantId,
        action: 'merchant_config_read',
        actor,
        result: record ? 'found' : 'not_found',
        metadata: getRequestMetadata(req)
      });
      return sendJson(req, res, 200, record
        ? { found: true, actorRole: actor.role, ...record }
        : { found: false, merchantId, config: null });
    }

    if (merchantConfigMatch && req.method === 'PUT') {
      const actor = getRequestActor(req);
      if (!hasRole(actor, 'admin')) {
        return sendJson(req, res, 401, { error: 'Merchant config write access denied' });
      }

      const merchantId = decodeURIComponent(merchantConfigMatch[1]);
      const body = await readBody(req);
      const { merchantConfigStore, auditLogStore } = getStoresForMerchant(merchantId);
      const previousRecord = merchantConfigStore.get(merchantId);
      const nextRecordPreview = merchantConfigStore.prepareRecord(merchantId, body.config || body);
      const changedSections = getChangedSections(previousRecord && previousRecord.config, nextRecordPreview.config);
      const forbiddenSections = getForbiddenSectionsForRole(actor.role, changedSections);

      if (forbiddenSections.length) {
        auditLogStore.append({
          merchantId,
          action: 'merchant_config_write_denied',
          actor,
          changedSections,
          forbiddenSections,
          versionBefore: previousRecord ? previousRecord.version : null,
          metadata: getRequestMetadata(req)
        });
        return sendJson(req, res, 403, {
          error: 'Owner role required for sensitive merchant config sections',
          forbiddenSections
        });
      }

      const record = merchantConfigStore.putPrepared(nextRecordPreview);
      const audit = auditLogStore.append({
        merchantId,
        action: 'merchant_config_write',
        actor,
        changedSections,
        versionBefore: previousRecord ? previousRecord.version : null,
        versionAfter: record.version,
        metadata: getRequestMetadata(req)
      });

      return sendJson(req, res, 200, { ok: true, auditId: audit.id, actorRole: actor.role, ...record });
    }

    if (merchantAuditMatch && req.method === 'GET') {
      const actor = getRequestActor(req);
      if (!hasRole(actor, 'viewer')) {
        return sendJson(req, res, 401, { error: 'Merchant audit access denied' });
      }

      const merchantId = decodeURIComponent(merchantAuditMatch[1]);
      const { auditLogStore } = getStoresForMerchant(merchantId);
      const limit = Number(url.searchParams.get('limit') || 50);
      return sendJson(req, res, 200, {
        merchantId,
        actorRole: actor.role,
        events: auditLogStore.listForMerchant(merchantId, limit)
      });
    }

    if (req.method === 'GET' && url.pathname === '/v1/events/summary') {
      const merchantId = getRequestMerchantId(req, url);
      const { eventStore } = getStoresForMerchant(merchantId);
      return sendJson(req, res, 200, {
        merchantId,
        storage: storageResolver.describe(),
        ...eventStore.summary()
      });
    }

    if (req.method === 'POST' && url.pathname === '/v1/events') {
      const body = await readBody(req);
      const merchantId = getRequestMerchantId(req, url, body);
      const { eventStore } = getStoresForMerchant(merchantId);
      const savedEvents = eventStore.append(body.events || body.event || body);
      return sendJson(req, res, 201, {
        ok: true,
        merchantId,
        saved: savedEvents.length,
        summary: eventStore.summary()
      });
    }

    if (req.method === 'GET' && url.pathname === '/v1/orders') {
      const limit = Number(url.searchParams.get('limit') || 25);
      const merchantId = getRequestMerchantId(req, url);
      const { orderStore } = getStoresForMerchant(merchantId);
      return sendJson(req, res, 200, { orders: orderStore.list(limit) });
    }

    if (req.method === 'POST' && url.pathname === '/v1/orders') {
      const body = await readBody(req);
      const merchantId = getRequestMerchantId(req, url, body);
      const { orderStore, eventStore } = getStoresForMerchant(merchantId);

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
          merchantId,
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
          merchantId,
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

