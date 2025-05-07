import { StorageType, StorageServiceFactory } from './factory/StorageServiceFactory';
import { SimpleConsentService } from './SimpleConsentService';
import { IConversationTracker } from './interfaces/IConversationTracker';
import { TrackerFactory } from './factory/TrackerFactory';
import { nlpConfiguration } from './nlp/NLPConfiguration';
import { EnhancedStorageService } from './EnhancedStorageService';
import { INLPService } from './nlp/interfaces/INLPService';

/**
 * Configurazione aggiornata dei servizi di analytics che utilizza
 * il servizio di storage migliorato e implementa una migliore
 * gestione degli errori
 */
export async function setupAnalytics(): Promise<IConversationTracker> {
  // Determina il tipo di storage ottimale
  const storageType = StorageServiceFactory.getRecommendedStorageType();
  console.log(`Using storage type: ${storageType}`);
  
  try {
    // Crea i servizi
    const storageService = StorageServiceFactory.createStorageService(storageType);
    const consentService = new SimpleConsentService();
    
    // Se è disponibile il servizio avanzato, inizializzalo
    if (storageService instanceof EnhancedStorageService && typeof storageService.initialize === 'function') {
      try {
        await storageService.initialize();
        console.log('Enhanced storage service initialized successfully');
      } catch (initError) {
        console.warn('Error initializing enhanced storage service:', initError);
        // Continua comunque, il servizio ha fallback interni
      }
    }
    
    // Inizializza il servizio NLP
    let nlpService: INLPService | undefined = undefined;
    try {
      await nlpConfiguration.initialize();
      // Usa type assertion per assicurarsi che il tipo sia corretto
      nlpService = nlpConfiguration.getOrchestrator() as INLPService;
      console.log('NLP service initialized successfully');
    } catch (error) {
      console.error('Error initializing NLP service:', error);
      // Continua senza NLP in caso di errore
      nlpService = undefined;
    }
    
    // Crea e restituisce il tracker avanzato con NLP
    return TrackerFactory.createTracker(
      storageService,
      consentService,
      nlpService
    );
  } catch (error) {
    console.error('Error setting up analytics:', error);
    
    // Fallback a servizi semplici in caso di errore
    console.log('Falling back to simple services');
    const simpleStorageService = StorageServiceFactory.createStorageService(StorageType.LOCAL);
    const consentService = new SimpleConsentService();
    
    return TrackerFactory.createTracker(
      simpleStorageService,
      consentService,
      undefined  // Passa explicit undefined invece di null
    );
  }
}

// Singleton per l'accesso globale
let conversationTracker: IConversationTracker | null = null;

/**
 * Ottiene o crea l'istanza di IConversationTracker
 * @returns Promise che risolve con l'istanza di IConversationTracker
 */
export async function getConversationTracker(): Promise<IConversationTracker> {
  if (!conversationTracker) {
    try {
      conversationTracker = await setupAnalytics();
    } catch (error) {
      console.error('Failed to initialize conversation tracker:', error);
      // Crea un tracker semplice in caso di errore critico
      const simpleStorageService = StorageServiceFactory.createStorageService(StorageType.LOCAL);
      const consentService = new SimpleConsentService();
      conversationTracker = TrackerFactory.createTracker(
        simpleStorageService,
        consentService,
        undefined  // Passa explicit undefined invece di null
      );
    }
  }
  return conversationTracker;
}