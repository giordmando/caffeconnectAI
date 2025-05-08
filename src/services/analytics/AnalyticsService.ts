import { IAnalyticsService } from './interfaces/IAnalyticsService';
import { IConsentService } from './interfaces/IConsentService';
import { ConsentLevel } from './types';

/**
 * Implementazione del servizio di analisi
 * Gestisce il tracciamento degli eventi analitici in base al consenso dell'utente
 */
export class AnalyticsService implements IAnalyticsService {
  private initialized: boolean = false;
  private consentService: IConsentService;

  constructor(consentService: IConsentService) {
    this.consentService = consentService;
  }

  /**
   * Inizializza il servizio di analisi
   */
  async initialize(): Promise<void> {
    try {
      console.log('Initializing Analytics Service...');
      // Nessuna inizializzazione speciale richiesta per questa implementazione di base
      this.initialized = true;
      console.log('Analytics Service initialized successfully');
    } catch (error) {
      console.error('Error initializing Analytics Service:', error);
      throw error;
    }
  }

  /**
   * Traccia un evento analitico se il consenso è stato dato
   * @param eventName Nome dell'evento
   * @param params Parametri dell'evento
   */
  async trackEvent(eventName: string, params: Record<string, any>): Promise<void> {
    if (!this.isTrackingEnabled()) {
      console.log(`Event tracking disabled (insufficient consent): ${eventName}`);
      return;
    }

    try {
      console.log(`Tracking event: ${eventName}`, params);
      // In una implementazione reale, qui invieremmo i dati a un servizio di analisi
      // Ad esempio: await fetch('https://analytics-api.example.com/track', {...})
    } catch (error) {
      console.error(`Error tracking event ${eventName}:`, error);
    }
  }

  /**
   * Traccia una visualizzazione di pagina se il consenso è stato dato
   * @param pageName Nome della pagina
   * @param params Parametri aggiuntivi
   */
  async trackPageView(pageName: string, params?: Record<string, any>): Promise<void> {
    if (!this.isTrackingEnabled()) {
      console.log(`Page view tracking disabled (insufficient consent): ${pageName}`);
      return;
    }

    try {
      console.log(`Tracking page view: ${pageName}`, params);
      // In una implementazione reale, qui invieremmo i dati a un servizio di analisi
    } catch (error) {
      console.error(`Error tracking page view ${pageName}:`, error);
    }
  }

  /**
   * Imposta proprietà utente se il consenso è stato dato
   * @param properties Proprietà utente
   */
  async setUserProperties(properties: Record<string, any>): Promise<void> {
    if (!this.isTrackingEnabled()) {
      console.log(`User properties tracking disabled (insufficient consent)`);
      return;
    }

    try {
      console.log(`Setting user properties:`, properties);
      // In una implementazione reale, qui invieremmo i dati a un servizio di analisi
    } catch (error) {
      console.error(`Error setting user properties:`, error);
    }
  }

  /**
   * Ottiene il livello di consenso corrente
   */
  getConsentLevel(): string {
    return this.consentService.getConsentLevel();
  }

  /**
   * Verifica se il tracciamento è abilitato in base al consenso
   */
  isTrackingEnabled(): boolean {
    // Verifica se l'utente ha dato il consenso per le analisi
    return this.consentService.hasConsent(ConsentLevel.ANALYTICS);
  }

  /**
   * Metodo per la pulizia delle risorse alla chiusura
   */
  dispose(): void {
    console.log('Disposing Analytics Service resources');
    this.initialized = false;
  }
}