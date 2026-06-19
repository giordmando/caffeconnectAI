const fs = require('fs');
const path = require('path');

const DEFAULT_CONFIG_DIR = path.resolve(__dirname, 'data', 'merchant-configs');
const ALLOWED_TOP_LEVEL_FIELDS = new Set([
  'business',
  'catalog',
  'knowledgeBase',
  'knowledgeSources',
  'merchantKnowledge',
  'tenant',
  'agents',
  'integrations',
  'ui',
  'privacy',
  'dataGovernance'
]);

const BLOCKED_KEYS = new Set([
  'apiKey',
  'openaiApiKey',
  'secret',
  'token',
  'password',
  'userContext',
  'customerProfile',
  'customerProfiles',
  'conversation',
  'conversations',
  'transcript',
  'transcripts',
  'messages'
]);

function sanitizeMerchantId(merchantId) {
  const normalized = String(merchantId || '').trim();

  if (!/^[a-zA-Z0-9_-]{2,80}$/.test(normalized)) {
    throw new Error('Invalid merchant id');
  }

  return normalized;
}

function stripBlockedKeys(value) {
  if (Array.isArray(value)) {
    return value.map(stripBlockedKeys).filter(item => item !== undefined);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.entries(value).reduce((clean, [key, entryValue]) => {
    if (BLOCKED_KEYS.has(key)) {
      return clean;
    }

    const strippedValue = stripBlockedKeys(entryValue);
    if (strippedValue !== undefined) {
      clean[key] = strippedValue;
    }

    return clean;
  }, {});
}

function sanitizeMerchantConfig(rawConfig) {
  const source = rawConfig && typeof rawConfig === 'object' ? rawConfig : {};

  return Object.entries(source).reduce((clean, [key, value]) => {
    if (!ALLOWED_TOP_LEVEL_FIELDS.has(key)) {
      return clean;
    }

    clean[key] = stripBlockedKeys(value);
    return clean;
  }, {});
}

class MerchantConfigStore {
  constructor(options = {}) {
    this.configDir = options.configDir || DEFAULT_CONFIG_DIR;
    fs.mkdirSync(this.configDir, { recursive: true });
  }

  getPath(merchantId) {
    const safeMerchantId = sanitizeMerchantId(merchantId);
    return path.join(this.configDir, `${safeMerchantId}.json`);
  }

  get(merchantId) {
    const safeMerchantId = sanitizeMerchantId(merchantId);
    const filePath = this.getPath(safeMerchantId);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const record = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return {
        merchantId: safeMerchantId,
        updatedAt: record.updatedAt,
        version: record.version || 1,
        config: sanitizeMerchantConfig(record.config)
      };
    } catch (_error) {
      return null;
    }
  }

  put(merchantId, rawConfig) {
    const safeMerchantId = sanitizeMerchantId(merchantId);
    const existing = this.get(safeMerchantId);
    const record = {
      merchantId: safeMerchantId,
      updatedAt: new Date().toISOString(),
      version: existing ? Number(existing.version || 1) + 1 : 1,
      config: sanitizeMerchantConfig(rawConfig)
    };

    fs.writeFileSync(this.getPath(safeMerchantId), JSON.stringify(record, null, 2));
    return record;
  }
}

module.exports = {
  MerchantConfigStore,
  sanitizeMerchantConfig,
  sanitizeMerchantId
};
