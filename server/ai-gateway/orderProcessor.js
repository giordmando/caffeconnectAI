function normalizeString(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function validateWebhookUrl(value) {
  const url = normalizeString(value);
  if (!url) return '';

  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Unsupported webhook protocol');
    }
    return parsed.toString();
  } catch (_error) {
    throw new Error('Invalid order webhook URL');
  }
}

function normalizeOrder(rawOrder = {}) {
  const id = normalizeString(rawOrder.id);
  if (!id) {
    throw new Error('Order id is required');
  }

  const items = Array.isArray(rawOrder.items) ? rawOrder.items : [];
  if (items.length === 0) {
    throw new Error('Order must include at least one item');
  }

  return {
    ...rawOrder,
    id,
    businessId: normalizeString(rawOrder.businessId),
    userId: normalizeString(rawOrder.userId),
    method: 'webhook',
    items: items.map((item, index) => ({
      id: normalizeString(item.id || `item-${index + 1}`),
      name: normalizeString(item.name || `Item ${index + 1}`),
      price: safeNumber(item.price),
      quantity: safeNumber(item.quantity, 1),
      type: normalizeString(item.type || 'product'),
      notes: normalizeString(item.notes),
      options: item.options && typeof item.options === 'object' ? item.options : undefined
    })),
    subtotal: safeNumber(rawOrder.subtotal),
    userInfo: rawOrder.userInfo && typeof rawOrder.userInfo === 'object' ? {
      name: normalizeString(rawOrder.userInfo.name),
      phone: normalizeString(rawOrder.userInfo.phone),
      notes: normalizeString(rawOrder.userInfo.notes)
    } : {},
    timestamp: safeNumber(rawOrder.timestamp, Date.now()),
    createdAt: rawOrder.createdAt || new Date(safeNumber(rawOrder.timestamp, Date.now())).toISOString()
  };
}

class OrderProcessor {
  constructor(options = {}) {
    this.defaultWebhookUrl = options.defaultWebhookUrl || '';
  }

  async process(rawRequest = {}) {
    const order = normalizeOrder(rawRequest.order || rawRequest);
    const webhookUrl = validateWebhookUrl(rawRequest.webhookUrl || this.defaultWebhookUrl);

    if (!webhookUrl) {
      throw new Error('Order webhook URL is not configured');
    }

    const payload = {
      event: 'order.created',
      source: 'cafeconnect-ai-gateway',
      business: rawRequest.business && typeof rawRequest.business === 'object' ? rawRequest.business : {},
      order
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CafeConnect-AI-Gateway/1.0'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Order webhook failed with status ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ''}`);
    }

    return {
      ok: true,
      orderId: order.id,
      forwardedTo: webhookUrl,
      message: 'Order forwarded to webhook'
    };
  }
}

module.exports = { OrderProcessor, normalizeOrder, validateWebhookUrl };
