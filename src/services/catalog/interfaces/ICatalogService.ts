// src/services/catalog/interfaces/ICatalogService.ts
import { MenuItem } from '../../../types/MenuItem';
import { Product } from '../../../types/Product';

export interface ICatalogService {
  /**
   * Inizializza il catalogo
   */
  initialize(): Promise<void>;
  
  /**
   * Ottiene gli elementi di menu filtrati per il momento della giornata corrente
   */
  getMenuItems(): Promise<MenuItem[]>;
  
  /**
   * Ottiene tutti gli elementi di menu senza filtri
   */
  getAllMenuItems(): Promise<MenuItem[]>;
  
  /**
   * Ottiene un elemento di menu specifico tramite ID
   */
  getMenuItemById(id: string): Promise<MenuItem | null>;
  
  /**
   * Ottiene i prodotti filtrati per categoria
   */
  getProducts(category?: string): Promise<Product[]>;
  
  /**
   * Ottiene un prodotto specifico tramite ID
   */
  getProductById(id: string): Promise<Product | null>;
  
  /**
   * Aggiorna il catalogo completo
   */
  refreshCatalog(): Promise<void>;
  
  /**
   * Ottiene le categorie disponibili
   */
  getCategories(): { menu: string[], products: string[] };
}