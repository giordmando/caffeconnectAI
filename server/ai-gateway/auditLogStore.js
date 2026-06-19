const fs = require('fs');
const path = require('path');

const DEFAULT_AUDIT_PATH = path.resolve(__dirname, 'data', 'auditLog.json');

class AuditLogStore {
  constructor(options = {}) {
    this.filePath = options.filePath || DEFAULT_AUDIT_PATH;
    this.maxEvents = options.maxEvents || 5000;
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
  }

  readAll() {
    if (!fs.existsSync(this.filePath)) {
      return [];
    }

    try {
      const events = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      return Array.isArray(events) ? events : [];
    } catch (_error) {
      return [];
    }
  }

  append(event) {
    const events = this.readAll();
    const record = {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      ...event
    };
    const nextEvents = [...events, record].slice(-this.maxEvents);

    fs.writeFileSync(this.filePath, JSON.stringify(nextEvents, null, 2));
    return record;
  }

  listForMerchant(merchantId, limit = 50) {
    return this.readAll()
      .filter(event => event.merchantId === merchantId)
      .slice(-Math.max(1, Math.min(Number(limit) || 50, 200)))
      .reverse();
  }
}

module.exports = { AuditLogStore };
