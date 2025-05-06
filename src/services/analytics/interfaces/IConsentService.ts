// src/services/analytics/interfaces/IConsentService.ts

import { ConsentLevel } from '../types';

export interface IConsentService {
  getConsentLevel(): ConsentLevel;
  updateConsent(level: ConsentLevel): void;
  getConsentTimestamp(): number | null;
  hasConsent(requiredLevel: ConsentLevel): boolean;
}