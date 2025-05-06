// src/services/analytics/factory/TrackerFactory.ts

import { IConversationTracker } from '../interfaces/IConversationTracker';
import { IStorageService } from '../interfaces/IStorageService';
import { IConsentService } from '../interfaces/IConsentService';
import { INLPService } from '../interfaces/INLPService';
import { EnhancedConversationTracker } from '../EnhancedConversationTracker';

export class TrackerFactory {
  static createTracker(
    storage: IStorageService,
    consent: IConsentService,
    nlp?: INLPService
  ): IConversationTracker {
    return new EnhancedConversationTracker(storage, consent, nlp);
  }
}