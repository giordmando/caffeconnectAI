import { UserContext } from '../../../types/UserContext';
import { UserPreference } from '../../../types/UserPreference';

/**
 * Interface for user context management
 */
export interface IUserContextService {
  /**
   * Get the current user context
   * @returns The user context
   */
  getUserContext(): UserContext;
  
  /**
   * Update a user preference
   * @param preference User preference to update
   */
  updatePreference(preference: UserPreference): void;
  
  /**
   * Remove a user preference
   * @param itemId ID of the item
   * @param itemType Type of the item
   */
  removePreference(itemId: string, itemType: string): void;
  
  /**
   * Add a user interaction
   * @param interaction Interaction text
   */
  addInteraction(interaction: string): void;
  
  /**
   * Update dietary restrictions
   * @param restrictions Array of dietary restriction strings
   */
  updateDietaryRestrictions(restrictions: string[]): void;
  
  /**
   * Reset user context to defaults
   */
  resetContext(): void;
}