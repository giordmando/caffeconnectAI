// src/services/analytics/setupAnalytics.ts

import { StorageType, StorageServiceFactory } from './factory/StorageServiceFactory';
import { SimpleConsentService } from './SimpleConsentService';
import { IConversationTracker } from './interfaces/IConversationTracker';
import { TrackerFactory } from './factory/TrackerFactory';
import { nlpConfiguration } from './nlp/NLPConfiguration';

// Funzione per inizializzare i servizi di analisi
export async function setupAnalytics(): Promise<IConversationTracker> {
  // Determina il tipo di storage in base all'ambiente
  const storageType = process.env.NODE_ENV === 'production' 
    ? StorageType.FIREBASE 
    : StorageType.LOCAL;
    
  // Crea i servizi
  const storageService = StorageServiceFactory.createStorageService(storageType);
  const consentService = new SimpleConsentService();
  // Inizializza il servizio NLP
  await nlpConfiguration.initialize();
  const nlpService = nlpConfiguration.getOrchestrator();
  
  // Crea e restituisce il tracker avanzato con NLP
  return TrackerFactory.createTracker(
    storageService,
    consentService,
    nlpService
  );
  
}

// Singleton per l'accesso globale
let conversationTracker: IConversationTracker | null = null;

export async function getConversationTracker(): Promise<IConversationTracker> {
  if (!conversationTracker) {
    conversationTracker = await setupAnalytics();
  }
  return conversationTracker;
}