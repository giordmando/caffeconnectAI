// src/services/analytics/setupAnalytics.ts

import { StorageType, StorageServiceFactory } from './factory/StorageServiceFactory';
import { NLPServiceType, NLPServiceFactory } from './factory/NLPServiceFactory';
import { TrackerFactory } from './factory/TrackerFactory';
import { SimpleConsentService } from './SimpleConsentService';
import { IConversationTracker } from './interfaces/IConversationTracker';

// Funzione per inizializzare i servizi di analisi
export function setupAnalytics(): IConversationTracker {
  // Determina il tipo di storage in base all'ambiente
  const storageType = process.env.NODE_ENV === 'production' 
    ? StorageType.FIREBASE 
    : StorageType.LOCAL;
    
  // Crea i servizi
  const storageService = StorageServiceFactory.createStorageService(storageType);
  const consentService = new SimpleConsentService();
  const nlpService = NLPServiceFactory.createNLPService(NLPServiceType.BASIC);
  
  // Crea e restituisce il tracker
  return TrackerFactory.createTracker(
    storageService,
    consentService,
    nlpService
  );
}

// Singleton per l'accesso globale
let conversationTracker: IConversationTracker | null = null;

export function getConversationTracker(): IConversationTracker {
  if (!conversationTracker) {
    conversationTracker = setupAnalytics();
  }
  return conversationTracker;
}