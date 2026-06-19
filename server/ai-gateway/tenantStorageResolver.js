const path = require('path');
const { sanitizeMerchantId } = require('./merchantConfigStore');

const SUPPORTED_ISOLATION_MODES = new Set(['shared-db', 'schema-per-tenant', 'database-per-tenant']);

function normalizeIsolationMode(value) {
  return SUPPORTED_ISOLATION_MODES.has(value) ? value : 'schema-per-tenant';
}

class TenantStorageResolver {
  constructor(options = {}) {
    this.baseDir = options.baseDir || path.resolve(__dirname, 'data');
    this.isolationMode = normalizeIsolationMode(options.isolationMode);
  }

  getTenantDir(merchantId) {
    const safeMerchantId = sanitizeMerchantId(merchantId);

    if (this.isolationMode === 'database-per-tenant') {
      return path.join(this.baseDir, 'tenant-databases', safeMerchantId);
    }

    if (this.isolationMode === 'shared-db') {
      return path.join(this.baseDir, 'shared-db', safeMerchantId);
    }

    return path.join(this.baseDir, 'tenant-schemas', safeMerchantId);
  }

  getPaths(merchantId) {
    const tenantDir = this.getTenantDir(merchantId);

    return {
      tenantDir,
      merchantConfigDir: path.join(tenantDir, 'merchant-configs'),
      auditLogPath: path.join(tenantDir, 'auditLog.json'),
      businessEventsPath: path.join(tenantDir, 'businessEvents.json'),
      ordersPath: path.join(tenantDir, 'orders.json')
    };
  }

  describe() {
    return {
      mode: this.isolationMode,
      baseDir: this.baseDir
    };
  }
}

module.exports = {
  TenantStorageResolver,
  normalizeIsolationMode
};
