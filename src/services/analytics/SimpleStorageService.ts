// src/services/analytics/SimpleStorageService.ts
import { ConversationRecord } from './types';

export class SimpleStorageService {
  private storageKey = 'conversation_records';
  
  async saveConversation(record: ConversationRecord): Promise<void> {
    try {
      // Carica conversazioni esistenti
      const records = this.getRecordsFromStorage();
      
      // Aggiorna o aggiungi record
      const existingIndex = records.findIndex(r => r.id === record.id);
      if (existingIndex >= 0) {
        records[existingIndex] = record;
      } else {
        records.push(record);
      }
      
      // Salva in localStorage
      localStorage.setItem(this.storageKey, JSON.stringify(records));
    } catch (error) {
      console.error('Errore nel salvataggio conversazione:', error);
    }
  }
  
  async getConversation(id: string): Promise<ConversationRecord | null> {
    const records = this.getRecordsFromStorage();
    return records.find(r => r.id === id) || null;
  }
  
  async getAllConversations(): Promise<ConversationRecord[]> {
    return this.getRecordsFromStorage();
  }
  
  private getRecordsFromStorage(): ConversationRecord[] {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Errore nel recupero conversazioni:', error);
      return [];
    }
  }
  
  // Metodo per eliminare conversazioni più vecchie di X giorni
  async cleanOldConversations(olderThanDays: number = 30): Promise<void> {
    try {
      const records = this.getRecordsFromStorage();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      const filteredRecords = records.filter(record => 
        new Date(record.startTime) >= cutoffDate
      );
      
      localStorage.setItem(this.storageKey, JSON.stringify(filteredRecords));
    } catch (error) {
      console.error('Errore nella pulizia conversazioni:', error);
    }
  }
}