import { CartItem } from '../../types/Order';

export class CartService {
  private static instance: CartService;
  private items: CartItem[] = [];
  private storageKey = 'cafeconnect-cart';
  
  private constructor() {
    this.loadFromStorage();
  }
  
  public static getInstance(): CartService {
    if (!CartService.instance) {
      CartService.instance = new CartService();
    }
    return CartService.instance;
  }
  
  addItem(item: any, type: 'menuItem' | 'product'): void {
    const existingIndex = this.items.findIndex(
      cartItem => cartItem.id === item.id && cartItem.type === type
    );
    
    if (existingIndex >= 0) {
      this.items[existingIndex].quantity += 1;
    } else {
      this.items.push({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        type
      });
    }
    
    this.saveToStorage();
    this.notifyListeners();
  }
  
  removeItem(id: string, type: string): void {
    this.items = this.items.filter(
      item => !(item.id === id && item.type === type)
    );
    this.saveToStorage();
    this.notifyListeners();
  }
  
  updateQuantity(id: string, type: string, quantity: number): void {
    const item = this.items.find(
      item => item.id === id && item.type === type
    );
    
    if (item) {
      if (quantity <= 0) {
        this.removeItem(id, type);
      } else {
        item.quantity = quantity;
        this.saveToStorage();
        this.notifyListeners();
      }
    }
  }
  
  updateItemOptions(id: string, type: string, options: Record<string, string>): void {
    const item = this.items.find(
      item => item.id === id && item.type === type
    );
    
    if (item) {
      item.options = options;
      this.saveToStorage();
      this.notifyListeners();
    }
  }
  
  getItems(): CartItem[] {
    return [...this.items];
  }
  
  getItemCount(): number {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }
  
  getSubtotal(): number {
    return this.items.reduce(
      (sum, item) => sum + (item.price * item.quantity), 
      0
    );
  }
  
  clear(): void {
    this.items = [];
    this.saveToStorage();
    this.notifyListeners();
  }
  
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.items = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    }
  }
  
  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.items));
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  }
  
  // Sistema di notifiche per React
  private listeners: Set<() => void> = new Set();
  
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

export const cartService = CartService.getInstance();