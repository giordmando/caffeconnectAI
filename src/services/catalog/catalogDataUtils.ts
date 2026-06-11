import { MenuItem } from '../../types/MenuItem';
import { Product } from '../../types/Product';

export type CatalogPreviewKind = 'menu' | 'products';

export const REQUIRED_CATALOG_COLUMNS: Record<CatalogPreviewKind, string[]> = {
  menu: ['id', 'name', 'category', 'price', 'description'],
  products: ['id', 'name', 'category', 'price', 'description']
};

export function normalizeCatalogEndpoint(endpoint: string): string {
  const trimmed = String(endpoint || '').trim();
  const match = trimmed.match(/docs\.google\.com\/spreadsheets\/d\/([^/]+)/i);

  if (!match) {
    return trimmed;
  }

  if (trimmed.includes('/export?') || trimmed.includes('output=csv')) {
    return trimmed;
  }

  const gidMatch = trimmed.match(/[?&#]gid=([0-9]+)/i);
  const spreadsheetId = match[1];
  const gid = gidMatch && gidMatch[1] ? gidMatch[1] : '0';

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
}

export function splitCsvRow(row: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < row.length; index += 1) {
    const char = row[index];
    const nextChar = row[index + 1];

    if (char === '"' && nextChar === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

export function parseCatalogCsv(text: string): Record<string, string>[] {
  const rows = text.split(/\r?\n/).filter(Boolean).map(row => splitCsvRow(row));
  const firstRow = rows.shift();
  const headers = firstRow ? firstRow.map(header => header.trim()) : [];

  return rows.map(row => headers.reduce<Record<string, string>>((record, header, index) => {
    record[header] = row[index] ? row[index].trim() : '';
    return record;
  }, {}));
}

export function parseCatalogPayload(text: string): any {
  const trimmed = text.trim();
  if (!trimmed) return [];

  try {
    return JSON.parse(trimmed);
  } catch {
    return parseCatalogCsv(trimmed);
  }
}

export function extractCatalogRecords(data: any, kind: CatalogPreviewKind): Record<string, any>[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === 'object') {
    const keys = kind === 'menu'
      ? ['menuItems', 'items', 'data', 'rows']
      : ['products', 'items', 'data', 'rows'];

    for (const key of keys) {
      if (Array.isArray(data[key])) {
        return data[key];
      }
    }
  }

  return [];
}

export function toStringValue(value: any): string {
  return value === undefined || value === null ? '' : String(value).trim();
}

export function toStringList(value: any): string[] {
  if (Array.isArray(value)) {
    return value.map(item => toStringValue(item)).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value.split(/[;,|]/).map(item => item.trim()).filter(Boolean);
  }

  return [];
}

export function toNumber(value: any, fallback: number = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number(String(value || '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function toBoolean(value: any, fallback: boolean = false): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return ['true', '1', 'si', 'yes', 'y'].includes(String(value).trim().toLowerCase());
}

export function toDetails(value: any): Record<string, any> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : { note: value };
    } catch {
      return { note: value };
    }
  }

  return {};
}

function firstDefined(...values: any[]): any {
  return values.find(value => value !== undefined && value !== null);
}

export function normalizeMenuRecord(record: Record<string, any>, index: number = 0): MenuItem {
  const id = toStringValue(record.id || record.sku || record.slug || `menu-${index + 1}`);
  const name = toStringValue(record.name || record.nome || record.title || `Voce menu ${index + 1}`);
  const category = toStringValue(record.category || record.categoria || 'food');

  return {
    id,
    name,
    category,
    subcategory: toStringValue(record.subcategory || record.sottocategoria || category),
    timeOfDay: toStringList(record.timeOfDay || record.fasceOrarie || record.momenti || 'morning,afternoon,evening'),
    price: toNumber(record.price || record.prezzo),
    description: toStringValue(record.description || record.descrizione || ''),
    ingredients: toStringList(record.ingredients || record.ingredienti),
    preferences: toStringList(record.preferences || record.preferenze),
    imageUrl: toStringValue(record.imageUrl || record.image || record.immagine || ''),
    allergens: toStringList(record.allergens || record.allergeni),
    dietaryInfo: toStringList(record.dietaryInfo || record.infoDietetiche),
    popularity: toNumber(record.popularity || record.popolarita, 50),
    alcoholic: toBoolean(record.alcoholic || record.alcolico)
  };
}

export function normalizeProductRecord(record: Record<string, any>, index: number = 0): Product {
  const id = toStringValue(record.id || record.sku || record.slug || `product-${index + 1}`);
  const stockValue = firstDefined(record.inStock, record.disponibile, record.available);

  return {
    id,
    name: toStringValue(record.name || record.nome || record.title || `Prodotto ${index + 1}`),
    category: toStringValue(record.category || record.categoria || 'product'),
    price: toNumber(record.price || record.prezzo),
    description: toStringValue(record.description || record.descrizione || ''),
    details: toDetails(record.details || record.dettagli),
    imageUrl: toStringValue(record.imageUrl || record.image || record.immagine || ''),
    inStock: toBoolean(stockValue, true),
    popularity: toNumber(record.popularity || record.popolarita, 50)
  };
}

export function getMissingCatalogColumns(records: Record<string, any>[], kind: CatalogPreviewKind): string[] {
  const columns = records.length > 0 ? Object.keys(records[0]) : [];
  const normalizedColumns = columns.map(column => column.toLowerCase());
  return REQUIRED_CATALOG_COLUMNS[kind].filter(column => !normalizedColumns.includes(column.toLowerCase()));
}
