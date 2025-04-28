import { UserContext } from "../../../types/UserContext";
import { UserPreference } from "../../../types/UserPreference";

export interface IUserContextService {
    getUserContext(): UserContext;
    updatePreference(preference: UserPreference): void;
    removePreference(itemId: string, itemType: string): void;
    addInteraction(interaction: string): void;
    updateDietaryRestrictions(restrictions: string[]): void;
    resetContext(): void;
  }