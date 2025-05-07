import React, { useState, useEffect, useRef } from 'react';
import { SimpleConsentBanner } from './SimpleConsentBanner';
import MessageBubble from './MessageBubble';
import SuggestedPrompts from './SuggestedPrompts';

// Importiamo i componenti NLP

import { SimpleConsentService } from '../services/analytics/SimpleConsentService';
import { Message } from '../types/Message';
import { UIComponent } from '../types/UI';
import { useServices } from '../contexts/ServiceContext';
import { IConversationTracker } from '../services/analytics/interfaces/IConversationTracker';
import { getConversationTracker } from '../services/analytics/setupAnalytics';
import { nlpIntegrationService } from '../services/analytics/nlp/NLPIntegrationService';
import { AnalysisType } from '../services/analytics/nlp/interfaces/INLPService';
import { ConsentLevel } from '../services/analytics/types';
import { configManager } from '../config/ConfigManager';
import { NLPInsightsPanel } from './ui/nlp/NLPInsightsPanel';

/**
 * Versione migliorata dell'interfaccia di chat con supporto NLP
 * Separa chiaramente la chat dai componenti di analisi
 */
interface EnhancedChatInterfaceProps {
  welcomeMessage?: string;
  showSidebar?: boolean;
  enableSuggestions?: boolean;
  enableDynamicComponents?: boolean;
  enableNLP?: boolean;
  maxRecommendations?: number;
}

// Inizializza servizi
const consentService = new SimpleConsentService();

const EnhancedChatInterface: React.FC<EnhancedChatInterfaceProps> = ({
  welcomeMessage,
  showSidebar = true,
  enableSuggestions = true,
  enableDynamicComponents = true,
  enableNLP = true,
  maxRecommendations = 3
}) => {
  // Stati principali
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Stati componenti UI
  const [uiComponents, setUIComponents] = useState<UIComponent[]>([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [availableActions, setAvailableActions] = useState<any[]>([]);
  
  // Stato NLP
  const [isNLPInitialized, setIsNLPInitialized] = useState<boolean>(false);
  const [nlpComponents, setNLPComponents] = useState<UIComponent[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<any>(null);
  
  // Ottieni servizi
  const { aiService, userService, suggestionService } = useServices();

  // Ottieni contesto utente
  const [userContext, setUserContext] = useState(userService.getUserContext());

  // Riferimenti DOM
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  
  // Tracking conversazione
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
          console.log('NLP Service initialized successfully');
        } catch (error) {
          console.error('Error initializing NLP service:', error);
          setIsNLPInitialized(false);
        }
      }
    };
    
    initialize();
  }, [enableNLP]);

  // Carica messaggio di benvenuto
  useEffect(() => {
    const loadWelcomeMessage = async () => {
      setIsTyping(true);
      
      try {
        // Utilizza un messaggio personalizzato o chiedi all'AI
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
          // Ottieni messaggio di benvenuto dall'AI
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
        
        // Fallback per errori
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
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, uiComponents]);

  // Inizializza la conversazione
  useEffect(() => {
    const initConversation = async () => {
      try {
        if (conversationTracker.current) {
          const newConversationId = await conversationTracker.current.startConversation();
          setConversationId(newConversationId);
          console.log(`Conversation started with ID: ${newConversationId}`);
        } else {
          console.error('conversationTracker is not initialized.');
        }
      } catch (error) {
        console.error('Error initializing conversation:', error);
      }
    };
    
    initConversation();
    
    // Pulizia alla chiusura
    return () => {
      if (conversationId && conversationTracker.current) {
        conversationTracker.current.endConversation(conversationId)
          .catch(error => console.error('Error closing conversation:', error));
      }
    };
  }, []);

  // Traccia messaggi
  const trackMessage = async (message: any, role: 'user' | 'assistant', nlpAnalysis?: any) => {
    if (!conversationId) {
      console.error('Cannot track message: conversationId not defined');
      return;
    }
    
    try {
      if (conversationTracker.current) {
        // Prepara dati per il tracciamento
        const eventData = {
          role,
          content: message,
          timestamp: Date.now()
        };
        
        // Aggiungi analisi NLP se disponibile
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
          await conversationTracker.current.trackEvent({
            type: 'message',
            conversationId,
            data: enrichedData,
            timestamp: Date.now()
          });
        } else {
          // Traccia evento standard
          await conversationTracker.current.trackEvent({
            type: 'message',
            conversationId,
            data: eventData,
            timestamp: Date.now()
          });
        }
      } else {
        console.error('conversationTracker not initialized.');
      }
    } catch (error) {
      console.error('Error tracking message:', error);
    }
  };

  // Gestione consenso
  const handleConsentChange = async (level: ConsentLevel) => {
    console.log(`Consent updated: ${level}`);
    
    // Se cambiano di livello, aggiorna il welcomeMessage
    if (level === ConsentLevel.ANALYTICS) {
      try {
        const context = conversationTracker.current 
          ? await conversationTracker.current.getUserContext() 
          : null;
          
        if (context?.topTopics?.length > 0) {
          // Personalizzazione possibile in base al contesto
        }
      } catch (error) {
        console.error('Error retrieving user context:', error);
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
    
    // Aggiorna interfaccia subito con il messaggio utente
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    
    // Nascondi i suggerimenti dopo l'invio
    setSuggestedPrompts([]);
    
    // Aggiorna interazioni utente
    userService.addInteraction(inputValue);

    // Analizza il messaggio con NLP se abilitato
    let nlpAnalysis = null;
    if (enableNLP && isNLPInitialized && consentService.hasConsent(ConsentLevel.ANALYTICS)) {
      try {
        // Esegui analisi NLP
        nlpAnalysis = await nlpIntegrationService.analyzeUserMessage(inputValue);
        setCurrentAnalysis(nlpAnalysis);
        
        if (nlpAnalysis) {
          // Genera componenti UI basati sull'analisi NLP
          const newNLPComponents = nlpIntegrationService.generateNLPBasedComponents(userMessage, nlpAnalysis);
          
          // Aggiorna i componenti NLP (sostituisci quelli precedenti)
          setNLPComponents(newNLPComponents);
          
          // Arricchisci il contesto utente con i dati NLP
          const enrichedContext = nlpIntegrationService.enrichUserContext(userContext, nlpAnalysis);
          setUserContext(enrichedContext);
        }
      } catch (error) {
        console.error('Error in NLP analysis:', error);
      }
    }
    
    // Traccia messaggio utente con analisi NLP se disponibile
    await trackMessage(inputValue, 'user', nlpAnalysis);

    try {
      // Prepara il contesto per l'AI
      let aiContext = {};
      try {
        if (conversationTracker.current) {
          aiContext = await conversationTracker.current.getUserContext();
        }
      } catch (error) {
        console.error('Error retrieving context:', error);
      }
      
      // Unisci il contesto utente con il contesto AI e NLP
      const extendedContext = { 
        ...userContext, 
        aiContext,
        ...(nlpAnalysis && { nlpAnalysis })
      };

      // Invia messaggio all'AI con contesto arricchito
      const response = await aiService.sendMessage(
        inputValue, 
        extendedContext
      );
      
      // Aggiorna messaggi con la risposta dell'AI
      setMessages(prev => [...prev, response.message]);
      
      // Traccia risposta AI
      await trackMessage(response.message.content, 'assistant');
      
      // Gestione componenti UI standard
      if (response.uiComponents && enableDynamicComponents) {
        setUIComponents(prev => {
          // Ottieni solo componenti non NLP (separa i componenti standard da quelli NLP)
          const standardComponents = response.uiComponents?.filter(
            comp => !['sentimentIndicator', 'intentSuggestions', 'topicTags', 'nlpInsights'].includes(comp.type)
          ) || [];
          
          return [
            ...standardComponents.slice(0, maxRecommendations),
            ...prev.slice(0, 5 - Math.min(maxRecommendations, standardComponents.length))
          ];
        });
      }
      
      // Gestione suggerimenti
      if (response.suggestedPrompts && enableSuggestions) {
        setSuggestedPrompts(response.suggestedPrompts);
      }
      
      // Gestione azioni disponibili
      if (response.availableActions) {
        setAvailableActions(response.availableActions);
      } else {
        setAvailableActions([]);
      }
      
      // Analisi NLP della risposta dell'AI
      if (enableNLP && isNLPInitialized && consentService.hasConsent(ConsentLevel.ANALYTICS)) {
        try {
          // Analizza anche la risposta dell'AI
          const assistantAnalysis = await nlpIntegrationService.analyzeUserMessage(response.message.content);
          
          if (assistantAnalysis) {
            // Aggiorniamo i componenti NLP con l'analisi della risposta dell'AI
            // ma senza duplicare i componenti sentiment per evitare confusione
            const aiTopics = assistantAnalysis[AnalysisType.TOPIC];
            
            if (aiTopics?.length > 0) {
              // Aggiungiamo solo componenti di topic dall'AI
              const topicComponent: UIComponent = {
                type: 'topicTags',
                data: {
                  topics: aiTopics,
                  message: response.message.content,
                  isAI: true
                },
                placement: 'sidebar', // Mettiamoli nella sidebar per organizzazione
                id: `ai-topics-${Date.now()}`
              };
              
              // Aggiorna i componenti NLP senza duplicare
              setNLPComponents(prev => {
                // Rimuovi i vecchi componenti topic AI
                const filtered = prev.filter(comp => 
                  !(comp.type === 'topicTags' && comp.data.isAI)
                );
                
                return [...filtered, topicComponent];
              });
            }
          }
        } catch (error) {
          console.error('Error analyzing AI response:', error);
        }
      }
    } catch (error) {
      console.error('Error communicating with AI:', error);
      
      // Messaggio di errore in caso di problemi
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Mi dispiace, ho avuto un problema nel processare la tua richiesta. Puoi riprovare?',
        timestamp: Date.now()
      }]);
    }
    
    setIsTyping(false);
    
    // Focus sull'input dopo l'invio
    if (chatInputRef.current) {
      chatInputRef.current.focus();
    }
  };
  
  // Gestione cambiamento input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };
  
  // Gestione tasto invio
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
    
    if (action === 'view_item') {
      alert(`Visualizzazione dettagli per: ${payload.id}`);
    } else if (action === 'order_item') {
      alert(`Aggiunto al carrello: ${payload.id}`);
      
      // Aggiorna preferenze utente
      userService.updatePreference({
        itemId: payload.id,
        itemType: payload.type,
        rating: 4,
        timestamp: Date.now()
      });
    }
    // Gestione azioni NLP
    else if (action === 'intent_selected') {
      const prompt = `Vorrei ${payload.intent.name || payload.intent.category}`;
      setInputValue(prompt);
    }
    else if (action === 'topic_selected') {
      const prompt = `Raccontami di più su ${payload.topic.name}`;
      setInputValue(prompt);
    }
  };
  
  // Ottieni configurazione business
  const businessConfig = configManager.getSection('business');

  // Rendering principale
  return (
    <div className="enhanced-chat-container">
      {/* Header */}
      <div className="chat-header">
        <h2>{businessConfig.name} AI</h2>
        <div className="provider-badges">
          <div className="provider-badge">
            Powered by {aiService.getProviderName()}
          </div>
          {enableNLP && isNLPInitialized && 
            <div className="nlp-badge">NLP attivo</div>
          }
        </div>
      </div>
      
      <div className="chat-with-insights-layout">
        {/* Sezione principale chat */}
        <div className="main-chat-section">
          <div className="chat-messages-container">
            <div className="chat-messages">
              {messages.map((msg, index) => (
                <MessageBubble 
                  key={index}
                  message={msg}
                  isTyping={false}
                />
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
              
              {/* UI componenti inline (non NLP) */}
              {enableDynamicComponents && uiComponents.filter(comp => comp.placement === 'inline').length > 0 && (
                <div className="dynamic-ui-inline">
                  {uiComponents
                    .filter(comp => comp.placement === 'inline')
                    .map(component => (
                      <div key={component.id} className="dynamic-ui-item">
                        {/* Usa UIComponentRegistry per renderizzare il componente */}
                        {/* Questo utilizza uiComponentRegistry.createComponent(component, handleUIAction) */}
                      </div>
                    ))}
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>
          
          {/* Componenti UI bottom */}
          {enableDynamicComponents && uiComponents.filter(comp => comp.placement === 'bottom').length > 0 && (
            <div className="dynamic-ui-bottom">
              {uiComponents
                .filter(comp => comp.placement === 'bottom')
                .map(component => (
                  <div key={component.id} className="dynamic-ui-item">
                    {/* Usa UIComponentRegistry per renderizzare il componente */}
                    {/* Questo utilizza uiComponentRegistry.createComponent(component, handleUIAction) */}
                  </div>
                ))}
            </div>
          )}
          
          {/* Controlli di chat */}
          <div className="chat-controls">
            {/* Suggerimenti */}
            {enableSuggestions && suggestedPrompts.length > 0 && (
              <SuggestedPrompts 
                prompts={suggestedPrompts}
                onPromptClick={handleSuggestionClick}
              />
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
            
            {/* Input area */}
            <div className="chat-input-container">
              <input
                ref={chatInputRef}
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
        </div>
        
        {/* Sidebar NLP e Insights (separata dalla chat principale) */}
        {showSidebar && (
          <div className="insights-sidebar">
            {/* Panel dedicato alle analisi NLP */}
            {enableNLP && isNLPInitialized && nlpComponents.length > 0 && (
              <NLPInsightsPanel 
                components={nlpComponents} 
                onAction={handleUIAction}
              />
            )}
            
            {/* Altri componenti sidebar */}
            {enableDynamicComponents && uiComponents.filter(comp => comp.placement === 'sidebar').length > 0 && (
              <div className="dynamic-ui-sidebar">
                {uiComponents
                  .filter(comp => comp.placement === 'sidebar')
                  .map(component => (
                    <div key={component.id} className="dynamic-ui-item">
                      {/* Usa UIComponentRegistry per renderizzare il componente */}
                      {/* Questo utilizza uiComponentRegistry.createComponent(component, handleUIAction) */}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Banner consenso */}
      <SimpleConsentBanner 
        consentService={consentService}
        onConsentChange={handleConsentChange}
      />
    </div>
  );
};

export default EnhancedChatInterface;