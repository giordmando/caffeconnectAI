const fs = require('fs');
const path = require('path');

const DEFAULT_MAX_EVENTS = 5000;
const EVENT_TYPES = new Set([
  'message_sent',
  'gateway_result',
  'ui_action',
  'item_viewed',
  'add_to_cart',
  'cart_opened',
  'cart_cleared',
  'checkout_started',
  'order_submitted',
  'order_failed'
]);

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeEvent(rawEvent = {}) {
  const type = String(rawEvent.type || '').trim();
  if (!EVENT_TYPES.has(type)) {
    throw new Error('Invalid event type');
  }

  return {
    id: rawEvent.id || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    timestamp: safeNumber(rawEvent.timestamp, Date.now()),
    payload: rawEvent.payload && typeof rawEvent.payload === 'object' ? rawEvent.payload : {}
  };
}

class EventStore {
  constructor(options = {}) {
    this.filePath = options.filePath || path.resolve(process.cwd(), 'server/ai-gateway/data/businessEvents.json');
    this.maxEvents = options.maxEvents || DEFAULT_MAX_EVENTS;
  }

  list() {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }

  append(rawEvents) {
    const incoming = Array.isArray(rawEvents) ? rawEvents : [rawEvents];
    const events = incoming.map(normalizeEvent);
    const currentEvents = this.list();
    const nextEvents = [...currentEvents, ...events].slice(-this.maxEvents);

    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(nextEvents, null, 2));

    return events;
  }

  summary() {
    const events = this.list();
    const countsByType = events.reduce((counts, event) => {
      counts[event.type] = (counts[event.type] || 0) + 1;
      return counts;
    }, {});

    const addToCartEvents = events.filter(event => event.type === 'add_to_cart');
    const orderEvents = events.filter(event => event.type === 'order_submitted');
    const failedOrderEvents = events.filter(event => event.type === 'order_failed');
    const messageEvents = events.filter(event => event.type === 'message_sent');
    const viewedEvents = events.filter(event => event.type === 'item_viewed' || event.type === 'ui_action');

    const addToCartCounts = addToCartEvents.reduce((counts, event) => {
      const id = String(event.payload?.id || '');
      if (!id) return counts;
      const name = String(event.payload?.name || id);
      const quantity = safeNumber(event.payload?.quantity, 1);
      counts[id] = counts[id] || {
        id,
        name,
        type: event.payload?.type || 'unknown',
        category: event.payload?.category || '',
        quantity: 0,
        revenue: 0
      };
      counts[id].quantity += quantity;
      counts[id].revenue += safeNumber(event.payload?.price, 0) * quantity;
      return counts;
    }, {});

    const topItems = Object.values(addToCartCounts)
      .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
      .slice(0, 5);

    const orderRevenue = orderEvents.reduce((sum, event) => sum + safeNumber(event.payload?.subtotal, 0), 0);
    const currentMessageText = messageEvents
      .map(event => String(event.payload?.content || ''))
      .join(' ')
      .toLowerCase();

    return {
      eventCount: events.length,
      countsByType,
      messageCount: messageEvents.length,
      addToCartCount: addToCartEvents.length,
      orderCount: orderEvents.length,
      failedOrderCount: failedOrderEvents.length,
      viewedCount: viewedEvents.length,
      averageOrderValue: orderEvents.length > 0 ? orderRevenue / orderEvents.length : 0,
      topItems,
      allergenMentions: ['allerg', 'lattosio', 'glutine', 'vegano', 'vegan']
        .some(term => currentMessageText.includes(term))
        ? Math.max(1, Math.round(messageEvents.length * 0.22))
        : 0,
      lastEventAt: events.length > 0 ? events[events.length - 1].timestamp : null
    };
  }
}

module.exports = { EventStore, normalizeEvent };
