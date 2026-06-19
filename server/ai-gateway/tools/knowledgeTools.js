const fs = require('fs');
const path = require('path');

const STOPWORDS = new Set([
  'che', 'devo', 'devi', 'deve', 'per', 'con', 'del', 'della', 'dei', 'degli',
  'una', 'uno', 'gli', 'nel', 'nella', 'sono', 'come', 'cosa', 'quali',
  'vorrei', 'mostrami', 'dimmi', 'sapere', 'considerare'
]);

function normalize(value) {
  return String(value || '').toLowerCase();
}

function tokenize(value) {
  return normalize(value)
    .replace(/[^a-z0-9àèéìòùç\s-]/gi, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2 && !STOPWORDS.has(token));
}

function readJsonFile(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
  } catch (error) {
    console.warn('[ai-gateway] Unable to read knowledge file:', filePath, error.message);
    return fallback;
  }
}

function toEntries(payload, source) {
  const rawEntries = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.knowledgeBase)
      ? payload.knowledgeBase
      : Array.isArray(payload?.entries)
        ? payload.entries
        : [];

  return rawEntries.flatMap((entry, index) => {
    if (entry.facts && Array.isArray(entry.facts)) {
      return entry.facts.map((fact, factIndex) => ({
        id: entry.id || `${source}-${index}-${factIndex}`,
        title: entry.title || entry.key || 'Knowledge fact',
        content: String(fact),
        tags: entry.tags || [entry.key, entry.scope].filter(Boolean),
        source: entry.source || source
      }));
    }

    return [{
      id: entry.id || `${source}-${index}`,
      title: entry.title || entry.key || 'Knowledge entry',
      content: String(entry.content || entry.text || entry.description || ''),
      tags: entry.tags || [entry.key, entry.scope].filter(Boolean),
      source: entry.source || source
    }];
  }).filter(entry => entry.content.trim().length > 0);
}

async function loadRemoteKnowledge(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Knowledge source ${url} returned ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return toEntries(await response.json(), url);
  }

  const text = await response.text();
  return [{
    id: url,
    title: url,
    content: text.slice(0, 20000),
    tags: [],
    source: url
  }];
}

function isDemoContext(context = {}) {
  const environment = String(context.tenant?.environment || '').toLowerCase();
  const plan = String(context.tenant?.plan || '').toLowerCase();
  return environment !== 'production' && plan !== 'pro' && plan !== 'enterprise';
}

class KnowledgeSourceService {
  constructor(config) {
    this.config = config;
    this.cache = null;
    this.cacheLoadedAt = 0;
    this.cacheContextKey = '';
  }

  async loadEntries(context = {}) {
    const now = Date.now();
    const cacheTtlMs = this.config.knowledgeCacheTtlMs || 300000;
    const contextKey = isDemoContext(context) ? 'demo' : 'production';

    if (this.cache && this.cacheContextKey === contextKey && now - this.cacheLoadedAt < cacheTtlMs) {
      return this.cache;
    }

    const entries = [];

    if (isDemoContext(context)) {
      const defaultPath = path.resolve(process.cwd(), 'server', 'ai-gateway', 'data', 'defaultKnowledge.json');
      entries.push(...toEntries(readJsonFile(defaultPath, []), 'default-demo'));
    }

    if (this.config.knowledgeInline) {
      try {
        entries.push(...toEntries(JSON.parse(this.config.knowledgeInline), 'env-inline'));
      } catch (error) {
        console.warn('[ai-gateway] Invalid AI_GATEWAY_KNOWLEDGE_INLINE JSON:', error.message);
      }
    }

    for (const url of this.config.knowledgeUrls || []) {
      try {
        entries.push(...await loadRemoteKnowledge(url));
      } catch (error) {
        console.warn('[ai-gateway] Unable to load remote knowledge source:', url, error.message);
      }
    }

    this.cache = entries;
    this.cacheLoadedAt = now;
    this.cacheContextKey = contextKey;
    return entries;
  }

  async search(query, options = {}, context = {}) {
    const entries = await this.loadEntries(context);
    const terms = tokenize(query);
    const limit = Number(options.limit || 5);

    if (terms.length === 0) {
      return entries.slice(0, limit).map(entry => ({ ...entry, score: 0 }));
    }

    return entries
      .map(entry => {
        const haystackTokens = new Set(tokenize([entry.title, entry.content, ...(entry.tags || [])].join(' ')));
        const score = terms.reduce((sum, term) => sum + (haystackTokens.has(term) ? 1 : 0), 0);
        return { ...entry, score };
      })
      .filter(entry => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}

function createKnowledgeTools(config) {
  const knowledgeService = new KnowledgeSourceService(config);

  return [
    {
      name: 'knowledge_search',
      description: 'Search merchant-provided knowledge such as policies, story, offers, allergens, opening hours, FAQs, and custom business information from local or remote sources.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          limit: { type: 'number' }
        },
        required: ['query'],
        additionalProperties: false
      },
      execute: async ({ query, limit = 5 } = {}, context = {}) => {
        const results = await knowledgeService.search(query, { limit }, context);
        return {
          results,
          count: results.length,
          sources: Array.from(new Set(results.map(result => result.source)))
        };
      }
    }
  ];
}

module.exports = { createKnowledgeTools, KnowledgeSourceService };






