import { MenuItem } from '../../types/MenuItem';
import { Product } from '../../types/Product';
import { configManager } from '../../config/ConfigManager';
import { getTimeOfDay } from '../../utils/timeContext';
import { mockApiGetMenuItems, mockApiGetProducts } from '../../api/mockApi';
import { ICatalogService } from './interfaces/ICatalogService';

/**
 * Servizio per gestire il catalogo di menu e prodotti
 * Supporta caricamento da API o dati locali
 */
export class CatalogService implements ICatalogService{
  private static instance: CatalogService;
  private menuItems: MenuItem[] = [];
  private products: Product[] = [];
  private lastMenuRefresh: number = 0;
  private lastProductsRefresh: number = 0;
  private refreshInterval: number = 60 * 60 * 1000; // Default: 1 ora
  
  private constructor() {
    // Inizializza con l'intervallo dalla configurazione
    const catalogConfig = configManager.getSection('catalog');
    this.refreshInterval = catalogConfig.dataRefreshInterval * 60 * 1000; // Converti minuti in ms
  }
  
  /**
   * Ottiene l'istanza singleton
   */
  public static getInstance(): CatalogService {
    if (!CatalogService.instance) {
      CatalogService.instance = new CatalogService();
    }
    return CatalogService.instance;
  }
  
  /**
   * Inizializza il catalogo
   */
  public async initialize(): Promise<void> {
    await this.refreshCatalog();
    console.log('Catalog initialized');
  }
  
  /**
   * Ottiene gli elementi di menu filtrati per il momento della giornata corrente
   * @returns Promise con gli elementi di menu
   */
  public async getMenuItems(): Promise<MenuItem[]> {
    await this.checkRefreshMenu();
    
    // Filtra per il momento della giornata corrente
    const currentTimeOfDay = getTimeOfDay();
    return this.menuItems.filter(item => item.timeOfDay.includes(currentTimeOfDay));
  }
  
  /**
   * Ottiene tutti gli elementi di menu senza filtri
   * @returns Promise con tutti gli elementi di menu
   */
  public async getAllMenuItems(): Promise<MenuItem[]> {
    await this.checkRefreshMenu();
    return this.menuItems;
  }
  
  /**
   * Ottiene un elemento di menu specifico tramite ID
   * @param id ID dell'elemento
   * @returns Promise con l'elemento di menu o null se non trovato
   */
  public async getMenuItemById(id: string): Promise<MenuItem | null> {
    await this.checkRefreshMenu();
    return this.menuItems.find(item => item.id === id) || null;
  }
  
  /**
   * Ottiene i prodotti filtrati per categoria
   * @param category Categoria opzionale
   * @returns Promise con i prodotti
   */
  public async getProducts(category?: string): Promise<Product[]> {
    await this.checkRefreshProducts();
    
    if (category && category !== 'all') {
      return this.products.filter(product => product.category === category);
    }
    
    return this.products;
  }
  
  /**
   * Ottiene un prodotto specifico tramite ID
   * @param id ID del prodotto
   * @returns Promise con il prodotto o null se non trovato
   */
  public async getProductById(id: string): Promise<Product | null> {
    await this.checkRefreshProducts();
    return this.products.find(product => product.id === id) || null;
  }
  
  /**
   * Aggiorna il catalogo completo
   */
  public async refreshCatalog(): Promise<void> {
    await Promise.all([
      this.refreshMenu(),
      this.refreshProducts()
    ]);
  }
  
  /**
   * Verifica se è necessario aggiornare il menu e lo aggiorna se necessario
   */
  private async checkRefreshMenu(): Promise<void> {
    const now = Date.now();
    if (now - this.lastMenuRefresh > this.refreshInterval) {
      await this.refreshMenu();
    }
  }
  
  /**
   * Verifica se è necessario aggiornare i prodotti e li aggiorna se necessario
   */
  private async checkRefreshProducts(): Promise<void> {
    const now = Date.now();
    if (now - this.lastProductsRefresh > this.refreshInterval) {
      await this.refreshProducts();
    }
  }
  
  /**
   * Aggiorna il menu da API o dati mock
   */
  private async refreshMenu(): Promise<void> {
    try {
      const catalogConfig = configManager.getSection('catalog');
      
      if (catalogConfig.menuEndpoint && !catalogConfig.enableLocalData) {
        this.menuItems = await this.loadRemoteMenuItems(catalogConfig.menuEndpoint);
      } else {
        // Usa dati mock
        this.menuItems = await mockApiGetMenuItems();
      }
      
      this.lastMenuRefresh = Date.now();
      console.log(`Menu refreshed: ${this.menuItems.length} items`);
    } catch (error) {
      console.error('Error refreshing menu:', error);
      if (this.menuItems.length === 0) {
        this.menuItems = await mockApiGetMenuItems();
        this.lastMenuRefresh = Date.now();
        console.warn('Menu fallback loaded from local mock data');
      }
    }
  }
  
  /**
   * Aggiorna i prodotti da API o dati mock
   */
  private async refreshProducts(): Promise<void> {
    try {
      const catalogConfig = configManager.getSection('catalog');
      
      if (catalogConfig.productsEndpoint && !catalogConfig.enableLocalData) {
        this.products = await this.loadRemoteProducts(catalogConfig.productsEndpoint);
      } else {
        // Usa dati mock
        this.products = await mockApiGetProducts();
      }
      
      this.lastProductsRefresh = Date.now();
      console.log(`Products refreshed: ${this.products.length} items`);
    } catch (error) {
      console.error('Error refreshing products:', error);
      if (this.products.length === 0) {
        this.products = await mockApiGetProducts();
        this.lastProductsRefresh = Date.now();
        console.warn('Products fallback loaded from local mock data');
      }
    }
  }

  private async loadRemoteMenuItems(endpoint: string): Promise<MenuItem[]> {
    const rawData = await this.fetchRemoteCatalogData(endpoint);
    const records = this.extractRecords(rawData, ['menuItems', 'items', 'data', 'rows']);
    const menuItems = records.map((record, index) => this.normalizeMenuItem(record, index));

    if (menuItems.length === 0) {
      throw new Error('Remote menu source returned no usable items');
    }

    return menuItems;
  }

  private async loadRemoteProducts(endpoint: string): Promise<Product[]> {
    const rawData = await this.fetchRemoteCatalogData(endpoint);
    const records = this.extractRecords(rawData, ['products', 'items', 'data', 'rows']);
    const products = records.map((record, index) => this.normalizeProduct(record, index));

    if (products.length === 0) {
      throw new Error('Remote products source returned no usable items');
    }

    return products;
  }

  private async fetchRemoteCatalogData(endpoint: string): Promise<any> {
    const response = await fetch(this.normalizeCatalogEndpoint(endpoint));
    if (!response.ok) {
      throw new Error(`Failed to load catalog source: ${response.status}`);
    }

    const text = await response.text();
    const trimmed = text.trim();
    if (!trimmed) {
      return [];
    }

    try {
      return JSON.parse(trimmed);
    } catch {
      return this.parseCsv(trimmed);
    }
  }

  private normalizeCatalogEndpoint(endpoint: string): string {
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
    const gid = gidMatch?.[1] || '0';

    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
  }

  private extractRecords(data: any, keys: string[]): any[] {
    if (Array.isArray(data)) {
      return data;
    }

    if (data && typeof data === 'object') {
      for (const key of keys) {
        if (Array.isArray(data[key])) {
          return data[key];
        }
      }
    }

    return [];
  }

  private normalizeMenuItem(record: any, index: number): MenuItem {
    const id = this.toStringValue(record.id || record.sku || record.slug || `menu-${index + 1}`);
    const name = this.toStringValue(record.name || record.nome || record.title || `Voce menu ${index + 1}`);
    const category = this.toStringValue(record.category || record.categoria || 'food');

    return {
      id,
      name,
      category,
      subcategory: this.toStringValue(record.subcategory || record.sottocategoria || category),
      timeOfDay: this.toStringList(record.timeOfDay || record.fasceOrarie || record.momenti || 'morning,afternoon,evening'),
      price: this.toNumber(record.price || record.prezzo),
      description: this.toStringValue(record.description || record.descrizione || ''),
      ingredients: this.toStringList(record.ingredients || record.ingredienti),
      preferences: this.toStringList(record.preferences || record.preferenze),
      imageUrl: this.toStringValue(record.imageUrl || record.image || record.immagine || ''),
      allergens: this.toStringList(record.allergens || record.allergeni),
      dietaryInfo: this.toStringList(record.dietaryInfo || record.infoDietetiche),
      popularity: this.toNumber(record.popularity || record.popolarita, 50),
      alcoholic: this.toBoolean(record.alcoholic || record.alcolico)
    };
  }

  private normalizeProduct(record: any, index: number): Product {
    const id = this.toStringValue(record.id || record.sku || record.slug || `product-${index + 1}`);

    return {
      id,
      name: this.toStringValue(record.name || record.nome || record.title || `Prodotto ${index + 1}`),
      category: this.toStringValue(record.category || record.categoria || 'product'),
      price: this.toNumber(record.price || record.prezzo),
      description: this.toStringValue(record.description || record.descrizione || ''),
      details: this.toDetails(record.details || record.dettagli),
      imageUrl: this.toStringValue(record.imageUrl || record.image || record.immagine || ''),
      inStock: this.toBoolean(record.inStock ?? record.disponibile ?? record.available, true),
      popularity: this.toNumber(record.popularity || record.popolarita, 50)
    };
  }

  private parseCsv(text: string): Record<string, string>[] {
    const rows = text.split(/\r?\n/).filter(Boolean).map(row => this.splitCsvRow(row));
    const headers = rows.shift()?.map(header => header.trim()) || [];

    return rows.map(row => {
      return headers.reduce<Record<string, string>>((record, header, index) => {
        record[header] = row[index]?.trim() || '';
        return record;
      }, {});
    });
  }

  private splitCsvRow(row: string): string[] {
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

  private toStringValue(value: any): string {
    return value === undefined || value === null ? '' : String(value).trim();
  }

  private toStringList(value: any): string[] {
    if (Array.isArray(value)) {
      return value.map(item => this.toStringValue(item)).filter(Boolean);
    }

    if (typeof value === 'string') {
      return value.split(/[;,|]/).map(item => item.trim()).filter(Boolean);
    }

    return [];
  }

  private toNumber(value: any, fallback: number = 0): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    const parsed = Number(String(value || '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private toBoolean(value: any, fallback: boolean = false): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (value === undefined || value === null || value === '') {
      return fallback;
    }

    return ['true', '1', 'si', 'yes', 'y'].includes(String(value).trim().toLowerCase());
  }

  private toDetails(value: any): Record<string, any> {
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
  
  /**
   * Ottiene le categorie disponibili
   * @returns Oggetto con le categorie di menu e prodotti
   */
  public getCategories(): { menu: string[], products: string[] } {
    const menuCategories = new Set<string>();
    const productCategories = new Set<string>();
    
    this.menuItems.forEach(item => {
      menuCategories.add(item.category);
    });
    
    this.products.forEach(product => {
      productCategories.add(product.category);
    });
    
    return {
      menu: Array.from(menuCategories),
      products: Array.from(productCategories)
    };
  }
}

// Esporta l'istanza singleton
export const catalogService = CatalogService.getInstance();
