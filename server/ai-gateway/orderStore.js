const fs = require('fs');
const path = require('path');

const DEFAULT_MAX_ORDERS = 500;

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function safeString(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function createOrderRecord(rawRecord = {}) {
  const order = rawRecord.order && typeof rawRecord.order === 'object' ? rawRecord.order : {};
  const items = Array.isArray(order.items) ? order.items : [];
  const userInfo = order.userInfo && typeof order.userInfo === 'object' ? order.userInfo : {};
  const timestamp = safeNumber(rawRecord.timestamp, Date.now());

  return {
    id: safeString(rawRecord.id || `ord_evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
    orderId: safeString(rawRecord.orderId || order.id || 'unknown-order'),
    status: rawRecord.status === 'failed' ? 'failed' : 'submitted',
    method: safeString(rawRecord.method || order.method || 'webhook'),
    timestamp,
    createdAt: new Date(timestamp).toISOString(),
    subtotal: safeNumber(rawRecord.subtotal || order.subtotal),
    itemCount: safeNumber(rawRecord.itemCount, items.reduce((sum, item) => sum + safeNumber(item.quantity, 1), 0)),
    customerName: safeString(rawRecord.customerName || userInfo.name),
    customerPhone: safeString(rawRecord.customerPhone || userInfo.phone),
    customerNotes: safeString(rawRecord.customerNotes || userInfo.notes),
    items: items.map(item => ({
      id: safeString(item.id),
      name: safeString(item.name),
      type: safeString(item.type),
      quantity: safeNumber(item.quantity, 1),
      price: safeNumber(item.price),
      notes: safeString(item.notes),
      options: item.options && typeof item.options === 'object' ? item.options : {}
    })),
    error: safeString(rawRecord.error)
  };
}

class OrderStore {
  constructor(options = {}) {
    this.filePath = options.filePath || path.resolve(process.cwd(), 'server/ai-gateway/data/orders.json');
    this.maxOrders = options.maxOrders || DEFAULT_MAX_ORDERS;
  }

  list(limit = 25) {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      const orders = Array.isArray(parsed) ? parsed : [];
      return orders
        .slice()
        .sort((a, b) => safeNumber(b.timestamp) - safeNumber(a.timestamp))
        .slice(0, safeNumber(limit, 25));
    } catch (_error) {
      return [];
    }
  }

  append(rawRecord) {
    const record = createOrderRecord(rawRecord);
    const currentOrders = this.list(this.maxOrders);
    const nextOrders = [record, ...currentOrders]
      .sort((a, b) => safeNumber(b.timestamp) - safeNumber(a.timestamp))
      .slice(0, this.maxOrders);

    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(nextOrders, null, 2));

    return record;
  }
}

module.exports = { OrderStore, createOrderRecord };
