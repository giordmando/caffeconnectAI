import React, { useState, useEffect, useRef } from 'react';
import { Message } from '../types/Message';
import { UIComponent } from '../types/UI';
import { useServices } from '../contexts/ServiceContext';
import { DynamicUIRenderer } from './ui/DynamicUIRenderer';
import { configManager } from '../config/ConfigManager';
import { SimpleStorageService } from '../services/analytics/SimpleStorageService';
import { SimpleConsentService } from '../services/analytics/SimpleConsentService';
import { ConsentLevel } from '../services/analytics/types';
import { SimpleConsentBanner } from './SimpleConsentBanner';
import { getConversationTracker } from '../services/analytics/setupAnalytics';
import { IConversationTracker } from '../services/analytics/interfaces/IConversationTracker';
import { AnalysisType } from '../services/analytics/nlp/interfaces/INLPService';
import { nlpIntegrationService } from '../services/analytics/nlp/NLPIntegrationService';

/**
 * Versione migliorata dell'interfaccia di chat con supporto NLP
 * Rispetta l'Interfacce Segregation Principle con interfacce chiare e specifiche
 */
interface EnhancedChatInterfaceProps {
  welcomeMessage?: string;
  showSidebar?: boolean;
  enableSuggestions?: boolean;
  enableDynamicComponents?: boolean;
  enableNLP?: boolean; // Nuovo flag per abilitare/disabilitare NLP
  maxRecommendations?: number;
}

// Inizializza servizi
const storageService = new SimpleStorageService();
const consentService = new SimpleConsentService();

const EnhancedChatInterface: React.FC<EnhancedChatInterfaceProps> = ({
  welcomeMessage,
  showSidebar = true,
  enableSuggestions = true,
  enableDynamicComponents = true,
  enableNLP = true, // Di default abilitiamo l'NLP
  maxRecommendations = 3
}) => {
  // Stato
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [uiComponents, setUIComponents] = useState<UIComponent[]>([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [availableActions, setAvailableActions] = useState<any[]>([]);
  const [isNLPInitialized, setIsNLPInitialized] = useState<boolean>(false);

  // Ottieni servizi
  const { aiService, userService, suggestionService } = useServices();

  // Ottieni contesto utente
  const [userContext, setUserContext] = useState(userService.getUserContext());

  // Riferimento al container dei messaggi per l'auto-scroll
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const conversationTracker = useRef<IConversationTracker | null>(null);

  // Inizializza NLP e conversation tracker
  useEffect(() => {
    const initialize = async () => {
      // Inizializza conversation tracker
      conversationTracker.current = await getConversationTracker();
      
      // Inizializza NLP se abilitato
      if (enableNLP) {
        try {
          await nlpIntegrationService.initialize();
          setIsNLPInitialized(nlpIntegrationService.isServiceInitialized());
        } catch (error) {
          console.error('Error initializing NLP service:', error);
          setIsNLPInitialized(false);
        }
      }
    };
    
    initialize();
  }, [enableNLP]);

  // Carica messaggio di benvenuto iniziale
  useEffect(() => {
    const loadWelcomeMessage = async () => {
      setIsTyping(true);
      
      try {
        // Se è fornito un messaggio di benvenuto personalizzato, usalo
        if (welcomeMessage) {
          const welcomeMsg: Message = {
            role: 'assistant',
            content: welcomeMessage,
            timestamp: Date.now()
          };
          
          setMessages([welcomeMsg]);
          
          if (enableSuggestions) {
            const initialSuggestions = await suggestionService.getSuggestedPrompts(welcomeMsg, userContext);
            setSuggestedPrompts(initialSuggestions);
          }
        } else {
          // Altrimenti chiedi all'IA un messaggio di benvenuto
          const response = await aiService.sendMessage(
            "Ciao! Sono nuovo qui.", 
            userContext
          );
          
          setMessages([response.message]);
          
          if (response.uiComponents && enableDynamicComponents) {
            setUIComponents(response.uiComponents);
          }
          
          if (response.suggestedPrompts && enableSuggestions) {
            setSuggestedPrompts(response.suggestedPrompts);
          }
          
          if (response.availableActions) {
            setAvailableActions(response.availableActions);
          }
        }
        
        // Aggiorna contesto utente
        userService.addInteraction(welcomeMessage || "Initial welcome message");
      } catch (error) {
        console.error('Error loading welcome message:', error);
        
        // Messaggio di fallback
        setMessages([{
          role: 'assistant',
          content: welcomeMessage || 'Benvenuto! Come posso aiutarti oggi?',
          timestamp: Date.now()
        }]);
      }
      
      setIsTyping(false);
    };
    
    loadWelcomeMessage();
  }, [aiService, userService, userContext, welcomeMessage, enableDynamicComponents, enableSuggestions, suggestionService]);

  // Auto-scroll quando arrivano nuovi messaggi
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, uiComponents]);

  // Inizializza la conversazione
  useEffect(() => {
    const initConversation = async () => {
      try {
        if (conversationTracker.current) {
          const newConversationId = await conversationTracker.current.startConversation();
          setConversationId(newConversationId);
        } else {
          console.error('conversationTracker is not initialized.');
        }
      } catch (error) {
        console.error('Errore nell\'inizializzazione della conversazione:', error);
      }
    };
    
    initConversation();
    
    // Pulisci alla chiusura
    return () => {
      if (conversationId) {
        if (conversationTracker.current) {
          conversationTracker.current.endConversation(conversationId)
            .catch(error => console.error('Errore nella chiusura conversazione:', error));
        } else {
          console.error('conversationTracker is not initialized.');
        }
      }
    };
  }, []);

  // Traccia i messaggi
  const trackMessage = async (message: any, role: 'user' | 'assistant', nlpAnalysis?: any) => {
    if (!conversationId) {
      console.error('Impossibile tracciare il messaggio: conversationId non definito');
      return;
    }
    
    try {
      if (conversationTracker.current) {
        // Aggiungiamo log per debug
        console.log(`Tracciamento messaggio ${role}:`, message);
        
        // Preparazione di dati arricchiti per il tracciamento
        const eventData = {
          role,
          content: message,
          timestamp: Date.now()
        };
        
        // Se abbiamo analisi NLP, aggiungiamole ai dati dell'evento
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
          
          console.log('Tracciamento con dati NLP arricchiti:', enrichedData);
          
          // Traccia l'evento arricchito
          await conversationTracker.current.trackEvent({
            type: 'message',
            conversationId,
            data: enrichedData,
            timestamp: Date.now()
          });
        } else {
          // Traccia l'evento standard
          await conversationTracker.current.trackEvent({
            type: 'message',
            conversationId,
            data: eventData,
            timestamp: Date.now()
          });
        }
        
        console.log('Tracciamento completato con successo');
      } else {
        console.error('conversationTracker non è inizializzato.');
      }
    } catch (error) {
      console.error('Errore nel tracciamento messaggio:', error);
    }
  };

  // Gestione consenso
  const handleConsentChange = async (level: ConsentLevel) => {
    console.log(`Consenso aggiornato: ${level}`);
    
    // Se cambiano di livello, aggiorna il welcomeMessage
    if (level === ConsentLevel.ANALYTICS) {
      try {
        // Ottieni contesto utente per personalizzazione
        const context = conversationTracker.current 
          ? await conversationTracker.current.getUserContext() 
          : null;
        if (context.topTopics?.length > 0) {
          // Usa il contesto per personalizzare il messaggio
          // Esempio implementativo
        }
      } catch (error) {
        console.error('Errore nel recupero del contesto utente:', error);
      }
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
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    
    // Aggiorna interazioni utente
    userService.addInteraction(inputValue);

    // Analizza il messaggio con NLP
    let nlpAnalysis = null;
    let nlpComponents: UIComponent[] = [];
    if (enableNLP && isNLPInitialized && consentService.hasConsent(ConsentLevel.ANALYTICS)) {
      try {
        // Analizza il messaggio con NLP
        nlpAnalysis = await nlpIntegrationService.analyzeUserMessage(inputValue);
        
        // Genera componenti UI basati sull'analisi NLP
        if (nlpAnalysis) {
          nlpComponents = nlpIntegrationService.generateNLPBasedComponents(userMessage, nlpAnalysis);
          
          // Aggiorna il contesto utente con i dati NLP
          const enrichedContext = nlpIntegrationService.enrichUserContext(userContext, nlpAnalysis);
          setUserContext(enrichedContext);
        }

      } catch (error) {
        console.error('Error in NLP analysis:', error);
        // Non blocchiamo il flusso se l'NLP fallisce
      }

    }
    await trackMessage(inputValue, 'user', nlpAnalysis);
    try {
      let aiContext = {};
      // Ottieni contesto dalle conversazioni solo se abilitato
      try {
        if (conversationTracker.current) {
          aiContext = await conversationTracker.current.getUserContext();
        } else {
          console.error('conversationTracker is not initialized.');
        }
      } catch (error) {
        console.error('Errore nel recupero del contesto:', error);
      }
      
      // Estendi il contesto utente con i dati NLP
      const extendedContext = { 
        ...userContext, 
        aiContext,
        // Aggiungi i dati NLP se disponibili
        ...(nlpAnalysis && { nlpAnalysis })
      };

      // Invia messaggio all'AI
      const response = await aiService.sendMessage(
        inputValue, 
        extendedContext
      );
      
      // Aggiorna messaggi con la risposta dell'AI
      setMessages(prev => [...prev, response.message]);
      
      // Traccia risposta AI
      await trackMessage(response.message.content, 'assistant');
      
      // Combina componenti UI standard con quelli NLP
      const allUIComponents = [
        ...(response.uiComponents || []),
        ...nlpComponents
      ];

      // Filtra e limita i componenti in base alla configurazione
      if (enableDynamicComponents) {
        setUIComponents(prev => [
          ...allUIComponents.slice(0, maxRecommendations),
          ...prev.slice(0, 5 - Math.min(maxRecommendations, allUIComponents.length || 0)) // Mantieni solo i più recenti
        ]);
      }
      
      // Aggiorna suggerimenti se abilitati
      if (response.suggestedPrompts && enableSuggestions) {
        console.log('Suggerimenti ricevuti:', response.suggestedPrompts);
        setSuggestedPrompts(response.suggestedPrompts);
      } else {
        setSuggestedPrompts([]);
      }
      
      // Aggiorna azioni disponibili
      if (response.availableActions) {
        console.log('Azioni disponibili ricevute:', response.availableActions);
        setAvailableActions(response.availableActions);
      } else {
        setAvailableActions([]);
      }
      
      // Analizza anche la risposta dell'AI con NLP se l'opzione è abilitata
      if (enableNLP && isNLPInitialized && consentService.hasConsent(ConsentLevel.ANALYTICS)) {
        try {
          console.log('Analisi NLP della risposta dell\'AI...');
          // Analizziamo la risposta, ma non creiamo un altro componente sentiment
          // per evitare duplicazioni nell'interfaccia
          const assistantAnalysis = await nlpIntegrationService.analyzeUserMessage(response.message.content);
          console.log('Analisi NLP completata:', assistantAnalysis);
          
          // Aggiorniamo il contesto con l'analisi della risposta AI
          if (assistantAnalysis) {
            const furtherEnrichedContext = nlpIntegrationService.enrichUserContext(
              extendedContext, 
              assistantAnalysis
            );
            setUserContext(furtherEnrichedContext);
            
            // Aggiorniamo i componenti solo se abbiamo dati rilevanti e non duplicati
            if (enableDynamicComponents && 
                (assistantAnalysis[AnalysisType.TOPIC]?.length > 0 || 
                 assistantAnalysis[AnalysisType.ENTITY]?.length > 0)) {
              
              console.log('Aggiunta di componenti NLP per la risposta dell\'AI');
              
              // Aggiungiamo un componente per i topic rilevati nella risposta AI
              if (assistantAnalysis[AnalysisType.TOPIC]?.length > 0) {
                const topicComponent: UIComponent = {
                  type: 'topicTags',
                  data: {
                    topics: assistantAnalysis[AnalysisType.TOPIC],
                    message: response.message.content,
                    isAI: true
                  },
                  placement: 'bottom',
                  id: `ai-topics-${Date.now()}`
                };
                
                setUIComponents(prev => {
                  // Rimuovi componenti topicTags duplicati con isAI = true
                  const filtered = prev.filter(comp => 
                    !(comp.type === 'topicTags' && comp.data.isAI)
                  );
                  
                  return [...filtered, topicComponent];
                });
              }
            }
          }
        } catch (error) {
          console.error('Error analyzing AI response:', error);
          // Non blocchiamo il flusso se l'NLP fallisce
        }
      }
    } catch (error) {
      console.error('Errore nella comunicazione con l\'AI:', error);
      
      // Messaggio di errore
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Mi dispiace, ho avuto un problema nel processare la tua richiesta. Puoi riprovare?',
        timestamp: Date.now()
      }]);
    }
    
    setIsTyping(false);
  };
  
  // Gestione cambio input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };
  
  // Gestione tasto
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };
  
  // Gestione click suggerimento
  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    handleSendMessage();
  };
  
  // Gestione azione UI
  const handleUIAction = (action: string, payload: any) => {
    console.log(`UI Action: ${action}`, payload);
    
    // Gestione azioni standard
    if (action === 'view_item') {
      alert(`Visualizzazione dettagli per: ${payload.id}`);
    } else if (action === 'order_item') {
      alert(`Aggiunto al carrello: ${payload.id}`);
      
      // Aggiorna preferenze utente
      userService.updatePreference({
        itemId: payload.id,
        itemType: payload.type,
        rating: 4, // Valore iniziale
        timestamp: Date.now()
      });
    }
    // Gestione azioni NLP
    else if (action === 'intent_selected') {
      // Suggerisci un prompt basato sull'intento
      const prompt = `Vorrei ${payload.intent.name || payload.intent.category}`;
      setInputValue(prompt);
    }
    else if (action === 'topic_selected') {
      // Suggerisci un prompt basato sul topic
      const prompt = `Raccontami di più su ${payload.topic.name}`;
      setInputValue(prompt);
    }
  };
  
  // Ottieni configurazione business
  const businessConfig = configManager.getSection('business');
  
  return (
    <div className="chat-container">
      {/* Header */}
      <div className="chat-header">
        <h2>{businessConfig.name} AI</h2>
        <div className="provider-badge">
          Powered by {aiService.getProviderName()}
          {enableNLP && isNLPInitialized && <span className="nlp-badge">+ NLP</span>}
        </div>
      </div>
      
      <div className="chat-layout">
        {/* Area messaggi principale */}
        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div 
              key={index} 
              className={`message ${msg.role === 'user' ? 'user-message' : 'ai-message'}`}
            >
              <div className="message-content">{msg.content}</div>
              <div className="message-time">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="message ai-message typing">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          
          {/* Componenti UI inline */}
          {enableDynamicComponents && (
            <DynamicUIRenderer 
              components={uiComponents.filter(comp => comp.placement === 'inline')} 
              placement="inline"
              onAction={handleUIAction}
            />
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Sidebar per componenti UI */}
        {showSidebar && (
          <div className="chat-sidebar">
            {enableDynamicComponents && (
              <DynamicUIRenderer 
                components={uiComponents.filter(comp => comp.placement === 'sidebar')} 
                placement="sidebar"
                onAction={handleUIAction}
              />
            )}
          </div>
        )}
      </div>
      
      {/* Componenti UI bottom */}
      <div className="bottom-components-scroll-area">
        {enableDynamicComponents && (
          <div className="sidebar">
            <DynamicUIRenderer 
              components={uiComponents.filter(comp => comp.placement === 'bottom')} 
              placement="bottom"
              onAction={handleUIAction}
            />
          </div>
        )}
      </div>
      
      {/* Area input fissata in fondo - sempre visibile */}
      <div className="chat-controls-fixed">
        {/* Suggerimenti */}
        {enableSuggestions && suggestedPrompts.length > 0 && (
          <div className="suggested-prompts">
            {suggestedPrompts.map((prompt, index) => (
              <button 
                key={index} 
                className="suggestion-btn"
                onClick={() => handleSuggestionClick(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
        
        {/* Azioni disponibili */}
        {availableActions.length > 0 && (
          <div className="available-actions">
            {availableActions.map((action, index) => (
              <button 
                key={index}
                className="action-btn"
                onClick={() => handleUIAction(action.type, action.payload)}
              >
                {action.title}
              </button>
            ))}
          </div>
        )}
        
        {/* Area input */}
        <div className="chat-input-container">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Scrivi un messaggio..."
            disabled={isTyping}
            className="chat-input"
          />
          <button 
            onClick={handleSendMessage} 
            disabled={isTyping || inputValue.trim() === ''}
            className="send-button"
          >
            Invia
          </button>
        </div>
      </div>
      
      <SimpleConsentBanner 
        consentService={consentService}
        onConsentChange={handleConsentChange}
      />
    </div>
  );
};

export default EnhancedChatInterface;