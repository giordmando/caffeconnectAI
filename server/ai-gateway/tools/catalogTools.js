const fs = require('fs');
const path = require('path');

function readJson(relativePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8'));
  } catch (error) {
    console.warn('[ai-gateway] Unable to read local catalog data:', relativePath, error.message);
    return fallback;
  }
}

function loadLocalMenuItems() {
  const data = readJson('src/api/mockData/menuItems.json', { menuItems: [] });
  return Array.isArray(data.menuItems) ? data.menuItems : [];
}

function loadLocalProducts() {
  const data = readJson('src/api/mockData/products.json', []);
  return Array.isArray(data) ? data : [];
}

function loadMenuItems(context = {}) {
  const runtimeItems = context.catalog?.menuItems;
  return Array.isArray(runtimeItems) && runtimeItems.length > 0 ? runtimeItems : loadLocalMenuItems();
}

function loadProducts(context = {}) {
  const runtimeProducts = context.catalog?.products;
  return Array.isArray(runtimeProducts) && runtimeProducts.length > 0 ? runtimeProducts : loadLocalProducts();
}

function normalize(value) {
  return String(value || '').toLowerCase();
}

function matchesQuery(entry, query) {
  if (!query) return true;
  const searchableFields = [
    entry.name,
    entry.description,
    entry.category,
    entry.subcategory,
    ...(entry.preferences || []),
    ...(entry.ingredients || []),
    ...(entry.allergens || []),
    ...(entry.dietaryInfo || []),
    ...(entry.timeOfDay || [])
  ];

  return searchableFields.some(field => normalize(field).includes(query));
}

function findByIdOrName(collection, value) {
  const target = normalize(value);
  if (!target) return null;

  return collection.find(entry => normalize(entry.id) === target)
    || collection.find(entry => normalize(entry.name) === target)
    || collection.find(entry => normalize(entry.name).includes(target))
    || collection.find(entry => target.includes(normalize(entry.name)));
}

function scoreMenuItem(item, { query, timeOfDay }) {
  let score = Number(item.popularity || 0);
  const preferences = (item.preferences || []).map(normalize);
  const category = normalize(item.category);
  const subcategory = normalize(item.subcategory);

  if (query === 'lunch' || timeOfDay === 'afternoon') {
    if (preferences.includes('lunch')) score += 120;
    if (category === 'food') score += 80;
    if (['salad', 'sandwich', 'bowl', 'lunch'].includes(subcategory)) score += 60;
    if (category === 'beverage') score -= 70;
    if (subcategory === 'coffee') score -= 90;
  }

  if (query === 'breakfast' || timeOfDay === 'morning') {
    if (preferences.includes('breakfast')) score += 100;
    if (['coffee', 'pastry', 'breakfast'].includes(subcategory)) score += 50;
  }

  if (query === 'aperitivo' || timeOfDay === 'evening') {
    if (preferences.includes('aperitivo')) score += 100;
    if (['aperitivo', 'wine', 'cocktail'].includes(subcategory)) score += 50;
  }

  return score;
}

function createCatalogTools() {
  return [
    {
      name: 'search_menu',
      description: 'Search CafeConnect menu items by query, category, time of day, or dietary preference.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          category: { type: 'string' },
          timeOfDay: { type: 'string', enum: ['morning', 'afternoon', 'evening', 'all'] },
          limit: { type: 'number' }
        },
        additionalProperties: false
      },
      execute: async ({ query = '', category = 'all', timeOfDay = 'all', limit = 6 } = {}, context = {}) => {
        const q = normalize(query);
        const items = loadMenuItems(context)
          .filter(item => category === 'all' || !category || item.category === category)
          .filter(item => timeOfDay === 'all' || !timeOfDay || (item.timeOfDay || []).includes(timeOfDay))
          .filter(item => matchesQuery(item, q))
          .sort((a, b) => scoreMenuItem(b, { query: q, timeOfDay }) - scoreMenuItem(a, { query: q, timeOfDay }))
          .slice(0, limit);

        return { items, count: items.length, source: context.catalog?.menuItems?.length ? 'runtime-catalog' : 'local-catalog' };
      }
    },
    {
      name: 'search_products',
      description: 'Search packaged products that can be purchased or added to cart.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          category: { type: 'string' },
          limit: { type: 'number' }
        },
        additionalProperties: false
      },
      execute: async ({ query = '', category = 'all', limit = 6 } = {}, context = {}) => {
        const q = normalize(query);
        const products = loadProducts(context)
          .filter(product => category === 'all' || !category || product.category === category)
          .filter(product => matchesQuery(product, q))
          .slice(0, limit);

        return { products, count: products.length, source: context.catalog?.products?.length ? 'runtime-catalog' : 'local-catalog' };
      }
    },
    {
      name: 'get_item_detail',
      description: 'Get a single menu item or product by id.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string', enum: ['menuItem', 'product'] }
        },
        required: ['id', 'type'],
        additionalProperties: false
      },
      execute: async ({ id, type }, context = {}) => {
        const collection = type === 'product' ? loadProducts(context) : loadMenuItems(context);
        const item = findByIdOrName(collection, id) || null;
        return { item, found: Boolean(item), source: item ? 'catalog' : 'not-found' };
      }
    },
    {
      name: 'create_order_draft',
      description: 'Create a draft order summary. This does not charge the customer or submit to WhatsApp/POS.',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                type: { type: 'string', enum: ['menuItem', 'product'] },
                quantity: { type: 'number' }
              },
              required: ['id', 'type', 'quantity'],
              additionalProperties: false
            }
          },
          customerName: { type: 'string' },
          notes: { type: 'string' }
        },
        required: ['items'],
        additionalProperties: false
      },
      execute: async ({ items = [], customerName = '', notes = '' }, context = {}) => {
        const menu = loadMenuItems(context);
        const products = loadProducts(context);
        const lines = items
          .map(requested => {
            const source = requested.type === 'product' ? products : menu;
            const item = source.find(entry => entry.id === requested.id);
            const quantity = Math.max(1, Number(requested.quantity || 1));
            return item
              ? {
                  id: item.id,
                  type: requested.type,
                  name: item.name,
                  quantity,
                  price: Number(item.price || 0),
                  lineTotal: Number(item.price || 0) * quantity
                }
              : null;
          })
          .filter(Boolean);

        const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
        return {
          orderId: 'DRAFT-' + Date.now(),
          customerName,
          notes,
          items: lines,
          subtotal,
          nextStep: 'confirm_in_cart_or_send_to_whatsapp'
        };
      }
    }
  ];
}

module.exports = { createCatalogTools };
