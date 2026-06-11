import { MenuItem } from '../../types/MenuItem';
import { Product } from '../../types/Product';
import { configManager } from '../../config/ConfigManager';
import { getTimeOfDay } from '../../utils/timeContext';
import { mockApiGetMenuItems, mockApiGetProducts } from '../../api/mockApi';
import { ICatalogService } from './interfaces/ICatalogService';
import {
  extractCatalogRecords,
  normalizeCatalogEndpoint,
  normalizeMenuRecord,
  normalizeProductRecord,
  parseCatalogPayload
} from './catalogDataUtils';

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
    const records = extractCatalogRecords(rawData, 'menu');
    const menuItems = records.map((record, index) => normalizeMenuRecord(record, index));

    if (menuItems.length === 0) {
      throw new Error('Remote menu source returned no usable items');
    }

    return menuItems;
  }

  private async loadRemoteProducts(endpoint: string): Promise<Product[]> {
    const rawData = await this.fetchRemoteCatalogData(endpoint);
    const records = extractCatalogRecords(rawData, 'products');
    const products = records.map((record, index) => normalizeProductRecord(record, index));

    if (products.length === 0) {
      throw new Error('Remote products source returned no usable items');
    }

    return products;
  }

  private async fetchRemoteCatalogData(endpoint: string): Promise<any> {
    const response = await fetch(normalizeCatalogEndpoint(endpoint));
    if (!response.ok) {
      throw new Error(`Failed to load catalog source: ${response.status}`);
    }

    return parseCatalogPayload(await response.text());
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
