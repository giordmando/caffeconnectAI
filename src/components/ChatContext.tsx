import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Message } from '../types/Message';
import { UIComponent } from '../types/UI';
import { IConversationTracker } from '../services/analytics/interfaces/IConversationTracker';
import { getConversationTracker } from '../services/analytics/setupAnalytics';
import { nlpIntegrationService } from '../services/analytics/nlp/NLPIntegrationService';
import { AnalysisType } from '../services/analytics/nlp/interfaces/INLPService';
import { useServices } from '../contexts/ServiceProvider';

// Definizione delle proprietà di configurazione
export interface ChatConfig {
  welcomeMessage?: string;
  showSidebar?: boolean;
  enableSuggestions?: boolean;
  enableDynamicComponents?: boolean;
  enableNLP?: boolean;
  maxRecommendations?: number;
}

// Definizione del contesto della chat
interface ChatContextType {
  // Configurazione
  config: ChatConfig;
  updateConfig: (newConfig: Partial<ChatConfig>) => void;
  
  // Stato dei messaggi
  messages: Message[];
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  
  // Input utente
  inputValue: string;
  setInputValue: (input: string) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleSendMessage: () => Promise<void>;
  isTyping: boolean;
  
  // Componenti UI e suggerimenti
  uiComponents: UIComponent[];
  suggestedPrompts: string[];
  nlpComponents: UIComponent[];
  handleSuggestionClick: (suggestion: string) => void;
  handleUIAction: (action: string, payload: any) => void;
  availableActions: any[]; // Aggiungi questa proprietà
  //handleActionClick: (action: string, payload: any) => void; // Aggiungi questa funzione
  // Servizi e tracking
  conversationId: string | null;
  isNLPInitialized: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

// Creazione del contesto
const ChatContext = createContext<ChatContextType | undefined>(undefined);

/**
 * Provider per il contesto della chat
 * Gestisce lo stato e la logica centralizzata per tutti i componenti dell'interfaccia di chat
 */
export const ChatProvider: React.FC<{
  children: React.ReactNode;
  initialConfig?: ChatConfig;
}> = ({ children, initialConfig = {} }) => {
  // Configurazione
  const [config, setConfig] = useState<ChatConfig>({
    showSidebar: true,
    enableSuggestions: true,
    enableDynamicComponents: true,
    enableNLP: false,
    maxRecommendations: 3,
    ...initialConfig
  });
  
  // Stato base
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [uiComponents, setUIComponents] = useState<UIComponent[]>([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [nlpComponents, setNLPComponents] = useState<UIComponent[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isNLPInitialized, setIsNLPInitialized] = useState<boolean>(false);
  const [availableActions, setAvailableActions] = useState<any[]>([]);
  
  // Riferimenti
  const messagesEndRef = useRef<HTMLDivElement>(null!);
  const conversationTracker = useRef<IConversationTracker | null>(null);
  
  // Servizi
  const { aiService, userService, suggestionService, functionRegistry } = useServices();
  const userContext = userService.getUserContext();
  
  // Aggiorna configurazione
  const updateConfig = (newConfig: Partial<ChatConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  };
  
  // Inizializza tracker conversazione
  useEffect(() => {
    const initialize = async () => {
      // Inizializza conversation tracker
      try {
        const tracker = await getConversationTracker();
        conversationTracker.current = tracker;
        
        if (tracker) {
          const newConversationId = await tracker.startConversation();
          setConversationId(newConversationId);
        }
      } catch (error) {
        console.error('Errore nell\'inizializzazione del conversation tracker:', error);
      }
      
      // Inizializza NLP se abilitato
      if (config.enableNLP) {
        try {
          await nlpIntegrationService.initialize();
          setIsNLPInitialized(nlpIntegrationService.isServiceInitialized());
        } catch (error) {
          console.error('Errore nell\'inizializzazione del servizio NLP:', error);
          setIsNLPInitialized(false);
        }
      }
    };
    
    initialize();
    
    // Cleanup alla chiusura
    return () => {
      if (conversationId && conversationTracker.current) {
        conversationTracker.current.endConversation(conversationId)
          .catch(error => console.error('Errore nella chiusura conversazione:', error));
      }
    };
  }, [config.enableNLP]);
  
  // Auto-scroll quando arrivano nuovi messaggi
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, uiComponents]);
  
  // Carica messaggio di benvenuto iniziale
  useEffect(() => {
    const loadWelcomeMessage = async () => {
      if (messages.length > 0) return; // Evita caricamenti multipli
      
      setIsTyping(true);
      
      try {
        if (config.welcomeMessage) {
          const welcomeMsg: Message = {
            role: 'assistant',
            content: config.welcomeMessage,
            timestamp: Date.now()
          };
          
          setMessages([welcomeMsg]);
          
          if (config.enableSuggestions) {
            const initialSuggestions = await suggestionService.getSuggestedPrompts(welcomeMsg, userContext);
            setSuggestedPrompts(initialSuggestions);
          }
        } else {
          const response = await aiService.sendMessage(
            "Ciao! Sono nuovo qui.", 
            userContext
          );
          
          setMessages([response.message]);
          
          if (response.uiComponents && config.enableDynamicComponents) {
            setUIComponents(response.uiComponents);
          }
          
          if (response.suggestedPrompts && config.enableSuggestions) {
            setSuggestedPrompts(response.suggestedPrompts);
          }
        }
        
        userService.addInteraction(config.welcomeMessage || "Initial welcome message");
      } catch (error) {
        console.error('Errore nel caricamento del messaggio di benvenuto:', error);
        
        setMessages([{
          role: 'assistant',
          content: config.welcomeMessage || 'Benvenuto! Come posso aiutarti oggi?',
          timestamp: Date.now()
        }]);
      }
      
      setIsTyping(false);
    };
    
    loadWelcomeMessage();
  }, [
    aiService, userService, userContext, 
    config.welcomeMessage, config.enableDynamicComponents, config.enableSuggestions, 
    suggestionService, messages.length
  ]);
  
  // Aggiungi messaggio
  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };
  
  // Cancella messaggi
  const clearMessages = () => {
    setMessages([]);
  };
  
  // Gestione input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };
  
  // Gestione tasto invio
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };
  
  // Traccia i messaggi
  const trackMessage = async (message: any, role: 'user' | 'assistant', nlpAnalysis?: any) => {
    if (!conversationId || !conversationTracker.current) return;
    
    try {
      // Prepara dati base dell'evento
      const eventData: any = {
        role,
        content: message,
        timestamp: Date.now()
      };
      
      // Aggiungi dati NLP se disponibili
      if (nlpAnalysis) {
        eventData.nlpData = {
          sentiment: nlpAnalysis[AnalysisType.SENTIMENT]?.[0] || null,
          intents: nlpAnalysis[AnalysisType.INTENT] || [],
          topics: nlpAnalysis[AnalysisType.TOPIC] || [],
          entities: nlpAnalysis[AnalysisType.ENTITY] || []
        };
      }
      
      await conversationTracker.current.trackEvent({
        type: 'message',
        conversationId,
        data: eventData,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Errore nel tracciamento messaggio:', error);
    }
  };
  
  // Analizza messaggio con NLP
  const analyzeMessage = async (message: string): Promise<any> => {
    if (!isNLPInitialized || !config.enableNLP) {
      return null;
    }
    
    try {
      // Esegui analisi NLP
      const analysis = await nlpIntegrationService.analyzeUserMessage(message);
      return analysis;
    } catch (error) {
      console.error('Errore nell\'analisi NLP del messaggio:', error);
      return null;
    }
  };
  
  // Gestione invio messaggio
  const handleSendMessage = async () => {
    if (inputValue.trim() === '' || isTyping) return;
    
    const userMessage: Message = {
      role: 'user',
      content: inputValue,
      timestamp: Date.now()
    };
    
    // Aggiorna UI immediatamente con il messaggio utente
    addMessage(userMessage);
    setInputValue('');
    setIsTyping(true);
    
    // Esegui analisi NLP se abilitata
    let nlpAnalysis = null;
    if (config.enableNLP && isNLPInitialized) {
      nlpAnalysis = await analyzeMessage(inputValue);
      // 👇 Popola i componenti NLP qui
      if (nlpAnalysis) {
        const newNLPComponents = nlpIntegrationService.generateNLPBasedComponents(userMessage, nlpAnalysis);
        setNLPComponents(newNLPComponents);
      }
    }
    
    // Traccia messaggio utente
    await trackMessage(inputValue, 'user', nlpAnalysis);
    
    // Aggiorna interazioni utente
    userService.addInteraction(inputValue);
    
    try {
      // Preparazione del contesto esteso
      let extendedContext = { ...userContext };
      
      // Recupera contesto aggiuntivo se disponibile
      try {
        if (conversationTracker.current) {
          const aiContext = await conversationTracker.current.getUserContext();
          extendedContext = { ...extendedContext, aiContext } as typeof extendedContext & { aiContext: any };
        }
      } catch (error) {
        console.error('Errore nel recupero del contesto:', error);
      }
      
      // Invia messaggio all'AI
      const response = await aiService.sendMessage(
        inputValue, 
        extendedContext
      );
      
      // Aggiorna messaggi con la risposta dell'AI
      addMessage({
        role: response.message.role,
        content: response.message.content,
        timestamp: response.message.timestamp || Date.now()
      });
      
      // Traccia risposta AI
      await trackMessage(response.message.content, 'assistant');
      
      // Aggiorna componenti UI se presenti e abilitati
      if (response.uiComponents && config.enableDynamicComponents) {
        setUIComponents(prev => [
          ...(response.uiComponents ?? []).slice(0, config.maxRecommendations || 3),
          ...prev.slice(0, 5 - Math.min(config.maxRecommendations || 3, response.uiComponents?.length || 0))
        ]);
      }
      
      // Aggiorna suggerimenti se abilitati
      if (response.suggestedPrompts && config.enableSuggestions) {
        setSuggestedPrompts(response.suggestedPrompts);
      } else {
        setSuggestedPrompts([]);
      }

      // Aggiorna le actions se presenti nella risposta
      if (response.availableActions) {
        setAvailableActions(response.availableActions);
      } else {
        setAvailableActions([]);
      }

    } catch (error) {
      console.error('Errore nella comunicazione con l\'AI:', error);
      
      // Messaggio di errore
      addMessage({
        role: 'assistant',
        content: 'Mi dispiace, ho avuto un problema nel processare la tua richiesta. Puoi riprovare?',
        timestamp: Date.now()
      });
    }
    
    setIsTyping(false);
  };
  
  // Gestione click suggerimento
  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    handleSendMessage();
  };
  
  // Gestione azione UI
  const handleUIAction = async (action: string, payload: any) => {
    console.log(`UI Action: ${action}`, payload);
    

      // Aggiungi questo nuovo case per gestire l'esecuzione di funzioni
      if (action === 'execute_function') {
        const { functionName, parameters } = payload;
        
        // Mostra un indicatore di caricamento
        setIsTyping(true);
        
        try {
          // Esegui la funzione richiesta
          const functionService = functionRegistry;
          const result = await functionService.executeFunction(functionName, parameters);
          
          // Aggiorna contesto utente
          userService.addInteraction(`Esecuzione funzione: ${functionName}`);
          
          // Aggiungi messaggio AI se necessario
          if (result.message) {
            addMessage({
              role: 'assistant',
              content: result.message,
              timestamp: Date.now()
            });
          }
          
          // Aggiungi componenti UI se presenti nel risultato
          if (result.data.uiComponent && config.enableDynamicComponents) {
            const newComponent = {
              type:result.data.uiComponent.type,
              data:result.data.uiComponent?.data || result.data?.product || {},
              id: `${functionName}-${Date.now()}`,
              placement: result.data.uiComponent.placement || 'inline'
            };
            
            setUIComponents(prev => [newComponent, ...prev]);
          }
        } catch (error) {
          console.error(`Error executing function ${functionName}:`, error);
          
          // Messaggio di errore
          addMessage({
            role: 'assistant',
            content: `Mi dispiace, ho avuto un problema nell'eseguire questa azione. Dettaglio: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`,
            timestamp: Date.now()
          });
        } finally {
          setIsTyping(false);
        }
        
        return;
      }

    // Logica per azioni comuni
    if (action === 'view_item') {
      alert(`Visualizzazione dettagli per: ${payload.id}`);
    } else if (action === 'order_item' || action === 'buy_item') {
      alert(`Aggiunto al carrello: ${payload.id}`);
      
      // Aggiorna preferenze utente
      userService.updatePreference({
        itemId: payload.id,
        itemType: payload.type,
        rating: 4,
        timestamp: Date.now()
      });
    }
    
    // Azioni specifiche per NLP
    if (action === 'topic_selected') {
      console.log(`Topic selezionato: ${payload.topic.name}`);
      // Implementare la logica di gestione del topic
    } else if (action === 'intent_selected') {
      console.log(`Intent selezionato: ${payload.intent.name}`);
      // Implementare la logica di gestione dell'intent
    }
  };
  
  // Valore del contesto
  const contextValue: ChatContextType = {
    // Configurazione
    config,
    updateConfig,
    
    // Stato messaggi
    messages,
    addMessage,
    clearMessages,
    
    // Input utente
    inputValue,
    setInputValue,
    handleInputChange,
    handleKeyDown,
    handleSendMessage,
    isTyping,
    
    // Componenti UI e suggerimenti
    uiComponents,
    suggestedPrompts,
    nlpComponents,
    availableActions,
    handleSuggestionClick,
    handleUIAction,
    
    // Servizi e tracking
    conversationId,
    isNLPInitialized,
    messagesEndRef
  };
  
  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};

// Hook per utilizzare il contesto della chat
export const useChatContext = (): ChatContextType => {
  const context = useContext(ChatContext);
  
  if (context === undefined) {
    throw new Error('useChatContext deve essere utilizzato all\'interno di un ChatProvider');
  }
  
  return context;
};