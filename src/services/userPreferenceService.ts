// Placeholder for userPreferenceService
import { UserPreference } from '../types/UserPreference';
import { UserContext } from '../types/UserContext';

// Servizio per gestire le preferenze dell'utente
export class UserPreferenceService {
  private storageKey: string = 'cafeconnect-user-preferences';
  
  // Salva le preferenze dell'utente
  public saveUserPreferences(preferences: UserPreference[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(preferences));
  }
  
  // Carica le preferenze dell'utente
  public loadUserPreferences(): UserPreference[] {
    const storedPreferences = localStorage.getItem(this.storageKey);
    if (!storedPreferences) {
      return [];
    }
    
    try {
      return JSON.parse(storedPreferences);
    } catch (error) {
      console.error('Errore durante il parsing delle preferenze utente:', error);
      return [];
    }
  }
  
  // Aggiunge o aggiorna una preferenza
  public updatePreference(preference: UserPreference): UserPreference[] {
    const preferences = this.loadUserPreferences();
    
    // Cerca se esiste già una preferenza simile
    const existingIndex = preferences.findIndex(
      p => p.itemId === preference.itemId && p.itemType === preference.itemType
    );
    
    if (existingIndex >= 0) {
      // Aggiorna la preferenza esistente
      preferences[existingIndex] = {
        ...preferences[existingIndex],
        rating: preference.rating,
        timestamp: Date.now()
      };
    } else {
      // Aggiungi nuova preferenza
      preferences.push({
        ...preference,
        timestamp: Date.now()
      });
    }
    
    // Salva le preferenze aggiornate
    this.saveUserPreferences(preferences);
    
    return preferences;
  }
  
  // Rimuove una preferenza
  public removePreference(itemId: string, itemType: string): UserPreference[] {
    const preferences = this.loadUserPreferences();
    
    const updatedPreferences = preferences.filter(
      p => !(p.itemId === itemId && p.itemType === itemType)
    );
    
    this.saveUserPreferences(updatedPreferences);
    
    return updatedPreferences;
  }
  
  // Ottieni preferenze ordinate per rating
  public getTopPreferences(limit: number = 5): UserPreference[] {
    const preferences = this.loadUserPreferences();
    
    return [...preferences]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);
  }
  
  // Ottieni preferenze per tipo
  public getPreferencesByType(itemType: string): UserPreference[] {
    const preferences = this.loadUserPreferences();
    
    return preferences.filter(p => p.itemType === itemType);
  }
  
  // Salva il contesto utente completo
  public saveUserContext(context: UserContext): void {
    localStorage.setItem('cafeconnect-user-context', JSON.stringify(context));
  }
  
  // Carica il contesto utente
  public loadUserContext(): UserContext | null {
    const storedContext = localStorage.getItem('cafeconnect-user-context');
    if (!storedContext) {
      return null;
    }
    
    try {
      return JSON.parse(storedContext);
    } catch (error) {
      console.error('Errore durante il parsing del contesto utente:', error);
      return null;
    }
  }
  
  // Aggiorna interazioni utente
  public updateUserInteraction(interaction: string): UserContext | null {
    const context = this.loadUserContext();
    if (!context) return null;
    
    // Aggiungi la nuova interazione all'inizio dell'array
    const updatedInteractions = [
      interaction,
      ...context.interactions
    ].slice(0, 10); // Mantieni solo le 10 interazioni più recenti
    
    const updatedContext: UserContext = {
      ...context,
      interactions: updatedInteractions,
      lastVisit: new Date().toISOString()
    };
    
    this.saveUserContext(updatedContext);
    
    return updatedContext;
  }
  
  // Aggiorna restrizioni dietetiche
  public updateDietaryRestrictions(restrictions: string[]): UserContext | null {
    const context = this.loadUserContext();
    if (!context) return null;
    
    const updatedContext: UserContext = {
      ...context,
      dietaryRestrictions: restrictions
    };
    
    this.saveUserContext(updatedContext);
    
    return updatedContext;
  }
}

// Istanza singleton del servizio
export const userPreferenceService = new UserPreferenceService();