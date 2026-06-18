import { IUserContextService } from './interfaces/IUserContextService';
import { UserContext } from '../../types/UserContext';
import { UserPreference } from '../../types/UserPreference';

/**
 * Service for managing user context and preferences
 * Implements the Singleton pattern
 */
export class UserContextService implements IUserContextService {
  private storageKey = 'cafeconnect-user-context';
  private context: UserContext;
  private static instance: UserContextService;
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.context = this.loadFromStorage() || this.createDefaultContext();
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): UserContextService {
    if (!UserContextService.instance) {
      UserContextService.instance = new UserContextService();
    }
    return UserContextService.instance;
  }
  
  /**
   * Get the current user context
   */
  getUserContext(): UserContext {
    return this.context;
  }
  
  /**
   * Update a user preference
   */
  updatePreference(preference: UserPreference): void {
    // Find existing preference
    const existingIndex = this.context.preferences.findIndex(
      p => p.itemId === preference.itemId && p.itemType === preference.itemType
    );
    
    if (existingIndex >= 0) {
      // Update existing preference
      this.context.preferences[existingIndex] = {
        ...this.context.preferences[existingIndex],
        rating: preference.rating,
        itemName: preference.itemName, // Salva il nuovo campo
        itemCategory: preference.itemCategory, // Salva il nuovo campo
        timestamp: Date.now()
      };
    } else {
      // Add new preference
      this.context.preferences.push({
        ...preference,
        timestamp: Date.now()
      });
    }
    
    // Save updated context
    this.saveToStorage();
  }
  
  /**
   * Remove a user preference
   */
  removePreference(itemId: string, itemType: string): void {
    this.context.preferences = this.context.preferences.filter(
      p => !(p.itemId === itemId && p.itemType === itemType)
    );
    
    this.saveToStorage();
  }
  
  /**
   * Add a user interaction
   */
  addInteraction(interaction: string): void {
    // Add new interaction at the beginning of the array
    this.context.interactions = [
      interaction,
      ...this.context.interactions
    ].slice(0, 20); // Keep only the 20 most recent interactions
    
    this.context.lastVisit = new Date().toISOString();
    this.saveToStorage();
  }

  learnFromInteraction(interaction: string): void {
    const text = this.normalize(interaction);
    const nextRestrictions = new Set(this.context.dietaryRestrictions.map(value => this.normalizeDietaryTerm(value)));

    this.extractDietaryRestrictions(text).forEach(restriction => nextRestrictions.add(restriction));
    this.context.dietaryRestrictions = Array.from(nextRestrictions).filter(Boolean);

    this.extractPreferenceSignals(text).forEach(signal => {
      this.updatePreference({
        itemId: `declared-${signal.category}`,
        itemName: signal.label,
        itemType: 'declaredPreference',
        itemCategory: signal.category,
        rating: signal.rating,
        timestamp: Date.now()
      });
    });

    this.saveToStorage();
  }

  recordItemSignal(item: any, itemType: string, signal: 'view' | 'cart' | 'order'): void {
    if (!item || !item.id || !item.name) return;

    const ratingBySignal = {
      view: 2,
      cart: 5,
      order: 5
    };

    this.updatePreference({
      itemId: String(item.id),
      itemName: String(item.name),
      itemType,
      itemCategory: String(item.category || item.subcategory || 'unknown'),
      rating: ratingBySignal[signal],
      timestamp: Date.now()
    });
  }
  
  /**
   * Update dietary restrictions
   */
  updateDietaryRestrictions(restrictions: string[]): void {
    this.context.dietaryRestrictions = Array.from(new Set(restrictions.map(value => this.normalizeDietaryTerm(value)).filter(Boolean)));
    this.saveToStorage();
  }
  
  /**
   * Reset user context to defaults
   */
  resetContext(): void {
    this.context = this.createDefaultContext();
    this.saveToStorage();
  }
  
  /**
   * Set user name
   */
  setName(name: string): void {
    this.context.name = name;
    this.saveToStorage();
  }
  
  /**
   * Set user email
   */
  setEmail(email: string): void {
    this.context.email = email;
    this.saveToStorage();
  }
  
  /**
   * Create default context with a random user ID
   */
  private createDefaultContext(): UserContext {
    return {
      userId: `user-${Math.floor(Math.random() * 10000)}`,
      preferences: [],
      interactions: [],
      lastVisit: new Date().toISOString(),
      dietaryRestrictions: []
    };
  }

  private normalize(value: string): string {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private normalizeDietaryTerm(value: string): string {
    const term = this.normalize(value);
    if (['senza glutine', 'gluten free', 'gluten-free', 'glutine', 'gluten', 'celiaco', 'celiaca'].includes(term)) {
      return 'gluten-free';
    }
    if (['senza lattosio', 'lactose free', 'lactose-free', 'lattosio', 'lactose'].includes(term)) {
      return 'lactose-free';
    }
    if (['vegano', 'vegana', 'vegan'].includes(term)) {
      return 'vegan';
    }
    if (['vegetariano', 'vegetariana', 'vegetarian'].includes(term)) {
      return 'vegetarian';
    }
    if (['senza zucchero', 'poco zucchero', 'low sugar', 'low-sugar'].includes(term)) {
      return 'low-sugar';
    }
    return term;
  }

  private extractDietaryRestrictions(text: string): string[] {
    const restrictions: string[] = [];

    if (/(senza glutine|gluten[-\s]?free|celiac[oa]|no glutine|non.*glutine)/.test(text)) {
      restrictions.push('gluten-free');
    }
    if (/(senza lattosio|lactose[-\s]?free|no lattosio|non.*lattosio)/.test(text)) {
      restrictions.push('lactose-free');
    }
    if (/\b(vegano|vegana|vegan)\b/.test(text)) {
      restrictions.push('vegan');
    }
    if (/\b(vegetariano|vegetariana|vegetarian)\b/.test(text)) {
      restrictions.push('vegetarian');
    }
    if (/(senza zucchero|poco zucchero|no zucchero|low[-\s]?sugar)/.test(text)) {
      restrictions.push('low-sugar');
    }

    return Array.from(new Set(restrictions));
  }

  private extractPreferenceSignals(text: string): Array<{ category: string; label: string; rating: number }> {
    const positive = /\b(mi piace|adoro|preferisco|vorrei|prendo spesso|di solito prendo)\b/.test(text);
    const negative = /\b(non mi piace|non voglio|evita|odio)\b/.test(text);
    const rating = positive && !negative ? 4 : negative ? 1 : 0;
    if (rating === 0) return [];

    const signals: Array<{ category: string; label: string; rating: number }> = [];
    const terms = [
      { category: 'coffee', label: 'caffe' },
      { category: 'tea', label: 'te' },
      { category: 'food', label: 'proposte salate' },
      { category: 'pastry', label: 'dolci e bakery' },
      { category: 'salad', label: 'bowl e insalate' },
      { category: 'sandwich', label: 'toast e sandwich' },
      { category: 'vegan', label: 'opzioni vegane' },
      { category: 'product', label: 'prodotti confezionati' }
    ];

    terms.forEach(term => {
      const categoryPattern = new RegExp(`\\b${term.category}\\b`);
      const labelPattern = new RegExp(`\\b${term.label.replace(/\s+/g, '\\s+')}\\b`);
      if (categoryPattern.test(text) || labelPattern.test(text)) {
        signals.push({ ...term, rating });
      }
    });

    if (/\b(bowl|insalat[ae])\b/.test(text)) {
      signals.push({ category: 'salad', label: 'bowl e insalate', rating });
    }
    if (/\b(toast|sandwich|panino|panini)\b/.test(text)) {
      signals.push({ category: 'sandwich', label: 'toast e sandwich', rating });
    }
    if (/\b(caffe|espresso|cappuccino|filtro)\b/.test(text)) {
      signals.push({ category: 'coffee', label: 'caffe', rating });
    }

    return Array.from(new Map(signals.map(signal => [signal.category, signal])).values());
  }
  
  /**
   * Load context from localStorage
   */
  private loadFromStorage(): UserContext | null {
    if (typeof window === 'undefined') {
      return null;
    }
    
    try {
      const stored = window.localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error loading user context from storage:', error);
      return null;
    }
  }
  
  /**
   * Save context to localStorage
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      window.localStorage.setItem(this.storageKey, JSON.stringify(this.context));
    } catch (error) {
      console.error('Error saving user context to storage:', error);
    }
  }
}

// Create and export singleton instance
export const userContextService = UserContextService.getInstance();
