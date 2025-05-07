import React, { createContext, useContext, useState, useEffect } from 'react';
import { Message } from '../../types/Message';
import { UIComponent } from '../../types/UI';
import { getConversationTracker } from '../../services/analytics/setupAnalytics';
import { IConversationTracker } from '../../services/analytics/interfaces/IConversationTracker';
import { AnalysisType } from '../../services/analytics/nlp/interfaces/INLPService';
import { nlpIntegrationService } from '../../services/analytics/nlp/NLPIntegrationService';
import { ConsentLevel } from '../../services/analytics/types';


// Definizione del tipo per il contesto
interface ConversationContextType {
  // Stato della conversazione
  messages: Message[];
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  
  // Componenti UI e NLP
  uiComponents: UIComponent[];
  nlpComponents: UIComponent[];
  setUIComponents: (components: UIComponent[]) => void;
  setNLPComponents: (components: UIComponent[]) => void;
  
  // Tracking conversazione
  conversationId: string | null;
  trackMessage: (message: any, role: 'user' | 'assistant', nlpAnalysis?: any) => Promise<void>;
  
  // Analisi NLP
  analyzeMessage: (message: string) => Promise<any>;
  currentAnalysis: any;
  
  // Stato sistema
  isNLPInitialized: boolean;
}

// Creazione del contesto React
const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

// Provider del contesto
export const ConversationContextProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  // Stati di base
  const [messages, setMessages] = useState<Message[]>([]);
  const [uiComponents, setUIComponents] = useState<UIComponent[]>([]);
  const [nlpComponents, setNLPComponents] = useState<UIComponent[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationTracker, setConversationTracker] = useState<IConversationTracker | null>(null);
  const [isNLPInitialized, setIsNLPInitialized] = useState<boolean>(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<any>(null);

  // Inizializzazione dei servizi
  useEffect(() => {
    const initialize = async () => {
      // Inizializza conversation tracker
      const tracker = await getConversationTracker();
      setConversationTracker(tracker);
      
      // Inizializza NLP
      try {
        await nlpIntegrationService.initialize();
        setIsNLPInitialized(nlpIntegrationService.isServiceInitialized());
        console.log('NLP service initialized successfully');
      } catch (error) {
        console.error('Error initializing NLP service:', error);
      }
      
      // Crea una nuova conversazione
      if (tracker) {
        const newConversationId = await tracker.startConversation();
        setConversationId(newConversationId);
        console.log(`New conversation started with ID: ${newConversationId}`);
      }
    };
    
    initialize();
    
    // Cleanup all'unmount
    return () => {
      if (conversationId && conversationTracker) {
        conversationTracker.endConversation(conversationId)
          .catch(error => console.error('Error ending conversation:', error));
      }
    };
  }, []);
  
  // Aggiungi messaggio alla conversazione
  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };
  
  // Cancella i messaggi
  const clearMessages = () => {
    setMessages([]);
  };
  
  // Traccia messaggio nella conversazione
  const trackMessage = async (message: any, role: 'user' | 'assistant', nlpAnalysis?: any) => {
    if (!conversationId || !conversationTracker) {
      console.error('Cannot track message: conversation tracking not initialized');
      return;
    }
    
    try {
      // Prepara i dati base dell'evento
      const eventData = {
        role,
        content: message,
        timestamp: Date.now()
      };
      
      // Aggiungi dati NLP se disponibili
      if (nlpAnalysis) {
        const enrichedData = {
          ...eventData,
          nlpData: {
            sentiment: nlpAnalysis[AnalysisType.SENTIMENT]?.[0] || null,
            intents: nlpAnalysis[AnalysisType.INTENT] || [],
            topics: nlpAnalysis[AnalysisType.TOPIC] || [],
            entities: nlpAnalysis[AnalysisType.ENTITY] || []
          }
        };
        
        // Traccia evento arricchito
        await conversationTracker.trackEvent({
          type: 'message',
          conversationId,
          data: enrichedData,
          timestamp: Date.now()
        });
      } else {
        // Traccia evento standard
        await conversationTracker.trackEvent({
          type: 'message',
          conversationId,
          data: eventData,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Error tracking message:', error);
    }
  };
  
  // Analizza messaggio con NLP
  const analyzeMessage = async (message: string): Promise<any> => {
    if (!isNLPInitialized) {
      console.warn('NLP is not initialized, cannot analyze message');
      return null;
    }
    
    try {
      // Verifica il consenso per l'analisi
      const hasConsent = conversationTracker?.getConsentService().hasConsent(ConsentLevel.ANALYTICS);
      
      if (!hasConsent) {
        console.log('User has not given consent for analytics, skipping NLP analysis');
        return null;
      }
      
      // Esegui analisi NLP
      const analysis = await nlpIntegrationService.analyzeUserMessage(message);
      setCurrentAnalysis(analysis);
      return analysis;
    } catch (error) {
      console.error('Error analyzing message with NLP:', error);
      return null;
    }
  };
  
  // Valore del contesto
  const contextValue: ConversationContextType = {
    messages,
    addMessage,
    clearMessages,
    uiComponents,
    nlpComponents,
    setUIComponents,
    setNLPComponents,
    conversationId,
    trackMessage,
    analyzeMessage,
    currentAnalysis,
    isNLPInitialized
  };
  
  return (
    <ConversationContext.Provider value={contextValue}>
      {children}
    </ConversationContext.Provider>
  );
};

// Hook per utilizzare il contesto
export const useConversationContext = (): ConversationContextType => {
  const context = useContext(ConversationContext);
  
  if (context === undefined) {
    throw new Error('useConversationContext must be used within a ConversationContextProvider');
  }
  
  return context;
};