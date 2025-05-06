// src/services/analytics/interfaces/IStorageService.ts

import { ConversationRecord } from '../types';

export interface IStorageService {
  saveConversation(record: ConversationRecord): Promise<void>;
  getConversation(id: string): Promise<ConversationRecord | null>;
  getAllConversations(userId?: string): Promise<ConversationRecord[]>;
  cleanOldConversations(olderThanDays?: number): Promise<void>;
}