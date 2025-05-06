// src/services/analytics/interfaces/IConversationTracker.ts

import { BaseEvent } from '../types';
import { IConsentService } from './IConsentService';

export interface IConversationTracker {
  startConversation(userId?: string): Promise<string>;
  trackEvent(event: BaseEvent): Promise<void>;
  endConversation(conversationId: string): Promise<void>;
  getUserContext(userId?: string): Promise<any>;
  getConsentService(): IConsentService;
}