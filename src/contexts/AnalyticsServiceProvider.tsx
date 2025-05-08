import React, { createContext, useContext, useState, useEffect } from 'react';
import { IAnalyticsService } from '../services/analytics/interfaces/IAnalyticsService';
import { IConsentService } from '../services/analytics/interfaces/IConsentService';
import { AnalyticsService } from '../services/analytics/AnalyticsService';
import { SimpleConsentService } from '../services/analytics/SimpleConsentService';
import { IConversationTracker } from '../services/analytics/interfaces/IConversationTracker';
import { setupAnalytics } from '../services/analytics/setupAnalytics';

// Tipo per il contesto Analytics
interface AnalyticsContextType {
  analyticsService: IAnalyticsService;
  consentService: IConsentService;
  conversationTracker: IConversationTracker | null;
  isInitialized: boolean;
  initializationError: string | null;
}

// Creazione del contesto
const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

// Provider per i servizi di analisi
export const AnalyticsServiceProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  // Stati per il provider
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [analyticsService, setAnalyticsService] = useState<IAnalyticsService | null>(null);
  const [consentService, setConsentService] = useState<IConsentService | null>(null);
  const [conversationTracker, setConversationTracker] = useState<IConversationTracker | null>(null);

  // Inizializza i servizi di analisi
  useEffect(() => {
    const initializeAnalytics = async () => {
      try {
        // Crea il servizio di consenso
        const consent = new SimpleConsentService();
        setConsentService(consent);
        
        // Crea il servizio di analisi
        const analytics = new AnalyticsService(consent);
        await analytics.initialize();
        setAnalyticsService(analytics);
        
        // Inizializza il tracker di conversazione
        const tracker = await setupAnalytics();
        setConversationTracker(tracker);
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing analytics services:', error);
        setInitializationError(error instanceof Error ? error.message : 'Unknown error');
        
        // Inizializza comunque i servizi di base in caso di errore
        const consent = new SimpleConsentService();
        setConsentService(consent);
        const analytics = new AnalyticsService(consent);
        setAnalyticsService(analytics);
        setIsInitialized(true);
      }
    };
    
    initializeAnalytics();
  }, []);

  // Valore del contesto
  const contextValue: AnalyticsContextType = {
    analyticsService: analyticsService!,
    consentService: consentService!,
    conversationTracker,
    isInitialized,
    initializationError
  };

  if (!isInitialized || !analyticsService || !consentService) {
    return <div>Initializing Analytics services...</div>;
  }

  return (
    <AnalyticsContext.Provider value={contextValue}>
      {children}
    </AnalyticsContext.Provider>
  );
};

// Hook per utilizzare il contesto Analytics
export const useAnalytics = (): AnalyticsContextType => {
  const context = useContext(AnalyticsContext);
  
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsServiceProvider');
  }
  
  return context;
};