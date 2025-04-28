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
  
  /**
   * Update dietary restrictions
   */
  updateDietaryRestrictions(restrictions: string[]): void {
    this.context.dietaryRestrictions = restrictions;
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