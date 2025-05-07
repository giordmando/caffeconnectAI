import { IStorageService } from '../analytics/interfaces/IStorageService';
import { ConversationRecord } from '../analytics/types';

/**
 * Servizio di storage migliorato con migliore gestione degli errori e cache
 * Implementa l'interfaccia IStorageService per compatibilità con il sistema esistente
 */
export class EnhancedStorageService implements IStorageService {
  private storageKey = 'cafeconnect_conversations';
  private cacheKey = 'cafeconnect_cache';
  private cache: Map<string, ConversationRecord> = new Map();
  private initialized: boolean = false;
  
  /**
   * Inizializza il servizio caricando la cache
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Carica cache da localStorage se esiste
      const cachedData = localStorage.getItem(this.cacheKey);
      if (cachedData) {
        const parsedCache = JSON.parse(cachedData);
        // Converte la cache da oggetto a Map
        Object.entries(parsedCache).forEach(([key, value]) => {
          this.cache.set(key, value as ConversationRecord);
        });
        console.log(`Cache loaded with ${this.cache.size} records`);
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Error initializing storage service:', error);
      // In caso di errore, inizializza una cache vuota
      this.cache.clear();
      this.initialized = true;
    }
  }
  
  /**
   * Salva una conversazione sia in locale che in cache
   */
  async saveConversation(record: ConversationRecord): Promise<void> {
    // Assicura che il servizio sia inizializzato
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      // Aggiorna la cache
      this.cache.set(record.id, {...record, lastUpdated: new Date()});
      
      // Persisti in localStorage
      await this.persistCache();
      
      // Salva la conversazione completa
      await this.persistConversations();
      
      console.log(`Conversation ${record.id} saved successfully`);
    } catch (error) {
      console.error('Error saving conversation:', error);
      // In caso di errore, salva comunque in cache
      this.cache.set(record.id, {...record, lastUpdated: new Date()});
    }
  }
  
  /**
   * Ottiene una conversazione dalla cache o dal localStorage
   */
  async getConversation(id: string): Promise<ConversationRecord | null> {
    // Assicura che il servizio sia inizializzato
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Cerca prima nella cache
    if (this.cache.has(id)) {
      return this.cache.get(id) || null;
    }
    
    try {
      // Se non in cache, carica tutte le conversazioni
      const records = await this.loadConversations();
      const record = records.find(r => r.id === id);
      
      // Se trovato, aggiorna la cache
      if (record) {
        this.cache.set(id, record);
      }
      
      return record || null;
    } catch (error) {
      console.error('Error getting conversation:', error);
      return null;
    }
  }
  
  /**
   * Ottiene tutte le conversazioni, opzionalmente filtrate per userId
   */
  async getAllConversations(userId?: string): Promise<ConversationRecord[]> {
    // Assicura che il servizio sia inizializzato
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      // Carica tutte le conversazioni
      const records = await this.loadConversations();
      
      // Filtra per userId se specificato
      if (userId) {
        return records.filter(record => record.userId === userId);
      }
      
      return records;
    } catch (error) {
      console.error('Error getting all conversations:', error);
      
      // In caso di errore, utilizza la cache
      const cachedRecords = Array.from(this.cache.values());
      
      // Filtra per userId se specificato
      if (userId) {
        return cachedRecords.filter(record => record.userId === userId);
      }
      
      return cachedRecords;
    }
  }
  
  /**
   * Pulisce le conversazioni più vecchie di X giorni
   */
  async cleanOldConversations(olderThanDays: number = 30): Promise<void> {
    // Assicura che il servizio sia inizializzato
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      // Carica tutte le conversazioni
      let records = await this.loadConversations();
      
      // Filtra le conversazioni
      const filteredRecords = records.filter(record => 
        new Date(record.startTime) >= cutoffDate
      );
      
      // Se ci sono conversazioni da rimuovere
      if (filteredRecords.length < records.length) {
        // Aggiorna le conversazioni
        await this.saveConversations(filteredRecords);
        
        // Aggiorna anche la cache
        this.cache.clear();
        filteredRecords.forEach(record => {
          this.cache.set(record.id, record);
        });
        
        // Persisti la cache aggiornata
        await this.persistCache();
        
        console.log(`Cleaned ${records.length - filteredRecords.length} old conversations`);
      }
    } catch (error) {
      console.error('Error cleaning old conversations:', error);
    }
  }
  
  /**
   * Carica tutte le conversazioni dal localStorage
   */
  private async loadConversations(): Promise<ConversationRecord[]> {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading conversations from localStorage:', error);
      return [];
    }
  }
  
  /**
   * Salva tutte le conversazioni nel localStorage
   */
  private async saveConversations(records: ConversationRecord[]): Promise<void> {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(records));
    } catch (error) {
      console.error('Error saving conversations to localStorage:', error);
      // In caso di fallimento, prova a salvare in un formato più compatto
      this.saveCompactConversations(records);
    }
  }
  
  /**
   * Versione compatta del salvataggio per evitare limiti di localStorage
   */
  private saveCompactConversations(records: ConversationRecord[]): void {
    try {
      // Rimuovi i campi non essenziali
      const compactRecords = records.map(record => ({
        id: record.id,
        userId: record.userId,
        startTime: record.startTime,
        endTime: record.endTime,
        // Limita i messaggi per risparmiare spazio
        messages: record.messages.slice(-20), // Mantieni solo gli ultimi 20 messaggi
        intents: record.intents.slice(0, 10), // Limita gli intenti
        topics: record.topics.slice(0, 10) // Limita i topic
      }));
      
      localStorage.setItem(this.storageKey, JSON.stringify(compactRecords));
    } catch (error) {
      console.error('Error saving compact conversations:', error);
    }
  }
  
  /**
   * Persiste tutte le conversazioni dalla cache
   */
  private async persistConversations(): Promise<void> {
    // Ottieni tutte le conversazioni esistenti
    const existingRecords = await this.loadConversations();
    
    // Aggiorna con le conversazioni in cache
    const cachedRecords = Array.from(this.cache.values());
    
    // Crea un Map per l'efficienza
    const recordsMap = new Map<string, ConversationRecord>();
    
    // Aggiungi prima i record esistenti
    existingRecords.forEach(record => recordsMap.set(record.id, record));
    
    // Poi sovrascrivi con i record aggiornati
    cachedRecords.forEach(record => recordsMap.set(record.id, record));
    
    // Salva le conversazioni aggiornate
    await this.saveConversations(Array.from(recordsMap.values()));
  }
  
  /**
   * Persiste la cache in localStorage
   */
  private async persistCache(): Promise<void> {
    try {
      // Converti la cache Map in un oggetto
      const cacheObject: Record<string, ConversationRecord> = {};
      this.cache.forEach((value, key) => {
        cacheObject[key] = value;
      });
      
      localStorage.setItem(this.cacheKey, JSON.stringify(cacheObject));
    } catch (error) {
      console.error('Error persisting cache:', error);
      
      // In caso di errore, prova a salvare solo gli ID per risparmiare spazio
      try {
        const simpleCacheObject: Record<string, string> = {};
        this.cache.forEach((value, key) => {
          simpleCacheObject[key] = value.id;
        });
        
        localStorage.setItem(this.cacheKey, JSON.stringify(simpleCacheObject));
      } catch (e) {
        console.error('Error persisting simplified cache:', e);
      }
    }
  }
}