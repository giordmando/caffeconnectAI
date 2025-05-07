// src/services/analytics/SimpleStorageService.ts
import { ConversationRecord } from './types';

export class SimpleStorageService {
  private storageKey = 'conversation_records';
  
  async saveConversation(record: ConversationRecord): Promise<void> {
    try {
      console.log(`Salvataggio conversazione ${record.id}:`, record);
      // Carica conversazioni esistenti
      const records = this.getRecordsFromStorage();
      
      // Aggiorna o aggiungi record
      const existingIndex = records.findIndex(r => r.id === record.id);
      if (existingIndex >= 0) {
        records[existingIndex] = record;
        console.log(`Aggiornato record esistente: ${record.id}`);
      } else {
        records.push(record);
        console.log(`Aggiunto nuovo record: ${record.id}`);
      }
      
      // Salva in localStorage
      localStorage.setItem(this.storageKey, JSON.stringify(records));
      console.log(`Salvati ${records.length} record in localStorage`);
      
      // Verifica che il salvataggio sia avvenuto correttamente
      this.verifyStorage(record.id);
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
      const records = data ? JSON.parse(data) : [];
      console.log(`Recuperati ${records.length} record dal localStorage`);
      return records;
    } catch (error) {
      console.error('Errore nel recupero dei record da localStorage:', error);
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


  private verifyStorage(id: string): void {
    try {
      // Verifica che il record sia stato salvato correttamente
      const data = localStorage.getItem(this.storageKey);
      if (!data) {
        console.error('Errore: nessun dato trovato in localStorage dopo il salvataggio');
        return;
      }
      
      const records = JSON.parse(data);
      const record = records.find((r: any) => r.id === id);
      
      if (!record) {
        console.error(`Errore: record ${id} non trovato dopo il salvataggio`);
      } else {
        console.log(`Verifica completata: record ${id} salvato correttamente`);
        
        // Verifica che i dati importanti siano presenti
        if (record.messages && record.messages.length === 0) {
          console.warn(`Attenzione: il record ${id} non ha messaggi`);
        }
        if (record.intents && record.intents.length === 0) {
          console.warn(`Attenzione: il record ${id} non ha intenti`);
        }
        if (record.topics && record.topics.length === 0) {
          console.warn(`Attenzione: il record ${id} non ha topic`);
        }
      }
    } catch (error) {
      console.error('Errore nella verifica del salvataggio:', error);
    }
  }
}