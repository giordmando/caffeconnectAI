// src/services/analytics/factory/TrackerFactory.ts

import { IConversationTracker } from '../interfaces/IConversationTracker';
import { IStorageService } from '../interfaces/IStorageService';
import { IConsentService } from '../interfaces/IConsentService';
import { EnhancedConversationTracker } from '../EnhancedConversationTracker';
import { INLPService } from '../nlp/interfaces/INLPService';

export class TrackerFactory {
  static createTracker(
    storage: IStorageService,
    consent: IConsentService,
    nlp?: INLPService
  ): IConversationTracker {
    return new EnhancedConversationTracker(storage, consent, nlp);
  }
}