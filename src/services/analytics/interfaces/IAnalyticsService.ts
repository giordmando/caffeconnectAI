/**
 * Interfaccia per il servizio di analisi
 */
export interface IAnalyticsService {
    /**
     * Inizializza il servizio di analisi
     */
    initialize(): Promise<void>;
  
    /**
     * Traccia un evento analitico
     * @param eventName Nome dell'evento
     * @param params Parametri dell'evento
     */
    trackEvent(eventName: string, params: Record<string, any>): Promise<void>;
  
    /**
     * Traccia una visualizzazione di pagina
     * @param pageName Nome della pagina
     * @param params Parametri aggiuntivi
     */
    trackPageView(pageName: string, params?: Record<string, any>): Promise<void>;
  
    /**
     * Imposta proprietà utente
     * @param properties Proprietà utente
     */
    setUserProperties(properties: Record<string, any>): Promise<void>;
  
    /**
     * Ottiene il livello di consenso corrente
     */
    getConsentLevel(): string;
  
    /**
     * Verifica se il tracciamento è abilitato
     */
    isTrackingEnabled(): boolean;
  }