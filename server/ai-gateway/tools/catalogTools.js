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
  const data = readJson('public/demo-data/cafeconnect-menu-normalized.json', { menuItems: [] });
  return Array.isArray(data.menuItems) ? data.menuItems : [];
}

function loadLocalProducts() {
  const data = readJson('public/demo-data/cafeconnect-products-normalized.json', { products: [] });
  return Array.isArray(data.products) ? data.products : [];
}

function isDemoContext(context = {}) {
  const environment = String(context.tenant?.environment || '').toLowerCase();
  const plan = String(context.tenant?.plan || '').toLowerCase();
  return environment !== 'production' && plan !== 'pro' && plan !== 'enterprise';
}

function loadMenuItems(context = {}) {
  const runtimeItems = context.catalog?.menuItems;
  if (Array.isArray(runtimeItems) && runtimeItems.length > 0) {
    return { items: runtimeItems, source: 'runtime-catalog' };
  }

  if (isDemoContext(context)) {
    return { items: loadLocalMenuItems(), source: 'local-demo-catalog' };
  }

  return { items: [], source: 'missing-production-catalog' };
}

function loadProducts(context = {}) {
  const runtimeProducts = context.catalog?.products;
  if (Array.isArray(runtimeProducts) && runtimeProducts.length > 0) {
    return { products: runtimeProducts, source: 'runtime-catalog' };
  }

  if (isDemoContext(context)) {
    return { products: loadLocalProducts(), source: 'local-demo-catalog' };
  }

  return { products: [], source: 'missing-production-catalog' };
}

function normalize(value) {
  return String(value || '').toLowerCase();
}

function normalizeDietaryTerm(value) {
  const term = normalize(value);
  if (['gluten-free', 'gluten free', 'senza glutine', 'glutine', 'gluten'].includes(term)) return 'gluten-free';
  if (['lactose-free', 'lactose free', 'senza lattosio', 'lattosio', 'lactose'].includes(term)) return 'lactose-free';
  if (['vegan', 'vegano', 'vegana'].includes(term)) return 'vegan';
  if (['vegetarian', 'vegetariano', 'vegetariana'].includes(term)) return 'vegetarian';
  return term;
}

function allergenMatchesRestriction(allergen, restriction) {
  const normalizedRestriction = normalizeDietaryTerm(restriction);
  const normalizedAllergen = normalizeDietaryTerm(allergen);
  const rawAllergen = normalize(allergen);

  if (normalizedRestriction === 'gluten-free') {
    return ['gluten', 'glutine', 'wheat', 'frumento'].some(term => rawAllergen.includes(term));
  }

  if (normalizedRestriction === 'lactose-free') {
    return ['lactose', 'lattosio', 'milk', 'latte', 'burro', 'butter', 'cream', 'panna'].some(term => rawAllergen.includes(term));
  }

  return normalizedAllergen === normalizedRestriction;
}

function dietaryInfoMatchesRestriction(info, restriction) {
  return normalizeDietaryTerm(info) === normalizeDietaryTerm(restriction);
}

function getCustomerContext(context = {}) {
  const userContext = context.userContext || {};
  const preferences = Array.isArray(userContext.preferences) ? userContext.preferences : [];
  const interactions = Array.isArray(userContext.interactions) ? userContext.interactions : [];
  const dietaryRestrictions = Array.isArray(userContext.dietaryRestrictions) ? userContext.dietaryRestrictions : [];

  return {
    userId: userContext.userId || 'anonymous',
    name: userContext.name || '',
    preferences,
    interactions,
    dietaryRestrictions
  };
}

function itemText(item) {
  return [
    item.name,
    item.description,
    item.category,
    item.subcategory,
    ...(item.preferences || []),
    ...(item.ingredients || []),
    ...(item.allergens || []),
    ...(item.dietaryInfo || [])
  ].filter(Boolean).join(' ');
}

function matchesQuery(entry, query) {
  if (!query) return true;
  const terms = query
    .split(/\s+/)
    .map(term => term.trim())
    .filter(term => term.length > 2);
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

  const haystack = searchableFields.map(normalize).join(' ');
  return haystack.includes(query) || terms.some(term => haystack.includes(term));
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

function scoreCustomerFit(item, context = {}) {
  const customer = getCustomerContext(context);
  const haystack = normalize(itemText(item));
  let score = 0;

  customer.preferences.forEach(preference => {
    const rating = Number(preference.rating || 0);
    if (preference.itemId && preference.itemId === item.id) score += rating * 40;
    if (preference.itemCategory && normalize(preference.itemCategory) === normalize(item.category)) score += rating * 12;
    if (preference.itemName && haystack.includes(normalize(preference.itemName))) score += rating * 10;
  });

  customer.interactions.slice(0, 8).forEach(interaction => {
    normalize(interaction)
      .split(/\s+/)
      .filter(term => term.length > 3)
      .forEach(term => {
        if (haystack.includes(term)) score += 3;
      });
  });

  customer.dietaryRestrictions.forEach(restriction => {
    const normalizedRestriction = normalizeDietaryTerm(restriction);
    if (!normalizedRestriction) return;
    if ((item.dietaryInfo || []).some(info => dietaryInfoMatchesRestriction(info, restriction))) score += 45;
    if ((item.allergens || []).some(allergen => allergenMatchesRestriction(allergen, restriction))) score -= 120;
    if (haystack.includes(normalizedRestriction)) score += 15;
  });

  return score;
}

function preferenceReasons(item, context = {}) {
  const customer = getCustomerContext(context);
  const reasons = [];
  const haystack = normalize(itemText(item));

  customer.preferences.forEach(preference => {
    if (preference.itemId === item.id && preference.rating > 0) {
      reasons.push(`gia apprezzati da te`);
    } else if (preference.itemCategory && normalize(preference.itemCategory) === normalize(item.category) && preference.rating > 0) {
      reasons.push(`vicini ai tuoi gusti`);
    }
  });

  customer.dietaryRestrictions.forEach(restriction => {
    const normalizedRestriction = normalizeDietaryTerm(restriction);
    if ((item.dietaryInfo || []).some(info => dietaryInfoMatchesRestriction(info, restriction)) || haystack.includes(normalizedRestriction)) {
      reasons.push(`compatibile con ${restriction}`);
    }
  });

  return Array.from(new Set(reasons)).slice(0, 3);
}

function withPersonalization(items, context = {}) {
  return items.map(item => ({
    ...item,
    personalization: {
      score: scoreCustomerFit(item, context),
      reasons: preferenceReasons(item, context)
    }
  }));
}

function requestDietaryRestrictions(args = {}, context = {}) {
  const customer = getCustomerContext(context);
  const terms = [...customer.dietaryRestrictions];
  const dietaryPreference = args.dietaryPreference || args.dietary || '';
  if (dietaryPreference) terms.push(dietaryPreference);

  const query = normalize([args.query, args.originalQuery].filter(Boolean).join(' '));
  if (query.includes('senza glutine') || query.includes('gluten free') || query.includes('gluten-free')) terms.push('gluten-free');
  if (query.includes('senza lattosio') || query.includes('lactose free') || query.includes('lactose-free')) terms.push('lactose-free');
  if (query.includes('vegano') || query.includes('vegan')) terms.push('vegan');
  if (query.includes('vegetariano') || query.includes('vegetarian')) terms.push('vegetarian');

  return Array.from(new Set(terms.map(normalizeDietaryTerm).filter(Boolean)));
}

function isCompatibleWithRestrictions(item, restrictions = []) {
  return restrictions.every(restriction => {
    const normalizedRestriction = normalizeDietaryTerm(restriction);
    if (!normalizedRestriction) return true;

    if (normalizedRestriction === 'vegan' || normalizedRestriction === 'vegetarian') {
      return (item.dietaryInfo || []).some(info => dietaryInfoMatchesRestriction(info, normalizedRestriction));
    }

    if ((item.dietaryInfo || []).some(info => dietaryInfoMatchesRestriction(info, normalizedRestriction))) {
      return true;
    }

    return !(item.allergens || []).some(allergen => allergenMatchesRestriction(allergen, normalizedRestriction));
  });
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
          dietaryPreference: { type: 'string' },
          originalQuery: { type: 'string' },
          limit: { type: 'number' }
        },
        additionalProperties: false
      },
      execute: async (args = {}, context = {}) => {
        const { query = '', category = 'all', timeOfDay = 'all', limit = 6 } = args;
        const q = normalize(query);
        const restrictions = requestDietaryRestrictions(args, context);
        const catalog = loadMenuItems(context);
        const items = catalog.items
          .filter(item => category === 'all' || !category || item.category === category)
          .filter(item => timeOfDay === 'all' || !timeOfDay || (item.timeOfDay || []).includes(timeOfDay))
          .filter(item => matchesQuery(item, q))
          .filter(item => isCompatibleWithRestrictions(item, restrictions))
          .sort((a, b) => (
            scoreMenuItem(b, { query: q, timeOfDay }) + scoreCustomerFit(b, context)
          ) - (
            scoreMenuItem(a, { query: q, timeOfDay }) + scoreCustomerFit(a, context)
          ))
          .slice(0, limit);

        return { items: withPersonalization(items, context), count: items.length, source: catalog.source };
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
          dietaryPreference: { type: 'string' },
          originalQuery: { type: 'string' },
          limit: { type: 'number' }
        },
        additionalProperties: false
      },
      execute: async (args = {}, context = {}) => {
        const { query = '', category = 'all', limit = 6 } = args;
        const q = normalize(query);
        const restrictions = requestDietaryRestrictions(args, context);
        const catalog = loadProducts(context);
        const products = catalog.products
          .filter(product => category === 'all' || !category || product.category === category)
          .filter(product => matchesQuery(product, q))
          .filter(product => isCompatibleWithRestrictions(product, restrictions))
          .sort((a, b) => scoreCustomerFit(b, context) - scoreCustomerFit(a, context))
          .slice(0, limit);

        return { products: withPersonalization(products, context), count: products.length, source: catalog.source };
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
        const catalog = type === 'product' ? loadProducts(context) : loadMenuItems(context);
        const collection = type === 'product' ? catalog.products : catalog.items;
        const item = findByIdOrName(collection, id) || null;
        return { item, found: Boolean(item), source: item ? catalog.source : 'not-found' };
      }
    },
    {
      name: 'customer_profile',
      description: 'Return the current customer preference profile used for personalized recommendations.',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false
      },
      execute: async (_args = {}, context = {}) => {
        const customer = getCustomerContext(context);
        return {
          userId: customer.userId,
          name: customer.name,
          dietaryRestrictions: customer.dietaryRestrictions,
          preferences: customer.preferences
            .sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0))
            .slice(0, 8),
          recentInteractions: customer.interactions.slice(0, 8)
        };
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
        const menuCatalog = loadMenuItems(context);
        const productCatalog = loadProducts(context);
        const menu = menuCatalog.items;
        const products = productCatalog.products;
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
