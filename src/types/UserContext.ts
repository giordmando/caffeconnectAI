  // src/types/UserContext.ts
import { UserPreference } from './UserPreference';
  
  export interface UserContext {
    userId: string;
    preferences: UserPreference[];
    interactions: string[];
    lastVisit: string;
    dietaryRestrictions: string[];
    name?: string;
    email?: string;
  }
