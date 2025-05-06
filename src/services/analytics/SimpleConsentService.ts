// src/services/analytics/SimpleConsentService.ts
import { ConsentLevel } from './types';

export class SimpleConsentService {
  private consentKey = 'user_consent_level';
  private timestampKey = 'consent_timestamp';
  
  getConsentLevel(): ConsentLevel {
    try {
      const storedLevel = localStorage.getItem(this.consentKey);
      return storedLevel 
        ? (storedLevel as ConsentLevel) 
        : ConsentLevel.MINIMAL;
    } catch (error) {
      return ConsentLevel.MINIMAL;
    }
  }
  
  updateConsent(level: ConsentLevel): void {
    localStorage.setItem(this.consentKey, level);
    localStorage.setItem(this.timestampKey, Date.now().toString());
  }
  
  getConsentTimestamp(): number | null {
    const timestamp = localStorage.getItem(this.timestampKey);
    return timestamp ? parseInt(timestamp, 10) : null;
  }
  
  // Verifica se il consenso è sufficiente per una particolare operazione
  hasConsent(requiredLevel: ConsentLevel): boolean {
    const currentLevel = this.getConsentLevel();
    const levels = {
      [ConsentLevel.MINIMAL]: 0,
      [ConsentLevel.FUNCTIONAL]: 1,
      [ConsentLevel.ANALYTICS]: 2
    };
    
    return levels[currentLevel] >= levels[requiredLevel];
  }
}