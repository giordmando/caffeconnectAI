import React, { useState, useEffect, useRef } from 'react';
  import { Message } from '../types/Message';
  import { UIComponent } from '../types/UI';
  import { useServices } from '../contexts/ServiceContext';
  import { DynamicUIRenderer } from './ui/DynamicUIRenderer';
  import { configManager } from '../config/ConfigManager';
import { SimpleConsentService } from '../services/analytics/SimpleConsentService';
import { ConsentLevel } from '../services/analytics/types';
import { SimpleConsentBanner } from './SimpleConsentBanner';
import { getConversationTracker } from '../services/analytics/setupAnalytics';
import { IConversationTracker } from '../services/analytics/interfaces/IConversationTracker';

  interface ChatInterfaceProps {
    welcomeMessage?: string;
    showSidebar?: boolean;
    enableSuggestions?: boolean;
    enableDynamicComponents?: boolean;
    maxRecommendations?: number;
  }

  // Inizializza servizi
  const consentService = new SimpleConsentService();
  
  /**
   * Interfaccia di chat principale
   */
  const ChatInterface: React.FC<ChatInterfaceProps> = ({
    welcomeMessage,
    showSidebar = true,
    enableSuggestions = true,
    enableDynamicComponents = true,
    maxRecommendations = 3
  }) => {
    // Stato
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [uiComponents, setUIComponents] = useState<UIComponent[]>([]);
    const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
    const [availableActions, setAvailableActions] = useState<any[]>([]);
    
    // Ottieni servizi
    const { aiService, userService, suggestionService } = useServices();
    
    // Ottieni contesto utente
    const userContext = userService.getUserContext();
    
    // Riferimento al container dei messaggi per l'auto-scroll
    const messagesEndRef = useRef<null | HTMLDivElement>(null);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const conversationTracker = useRef<IConversationTracker | null>(null);

    useEffect(() => {
      const initializeTracker = async () => {
        conversationTracker.current = await getConversationTracker();
      };
      initializeTracker();
    }, []);
  
    // Carica messaggio di benvenuto iniziale
    useEffect(() => {
      const loadWelcomeMessage = async () => {
        setIsTyping(true);
        
        try {
          // Se è fornito un messaggio di benvenuto personalizzato, usalo
          if (welcomeMessage) {
            // Crea messaggio assistente con il testo personalizzato
            const welcomeMsg: Message = {
              role: 'assistant',
              content: welcomeMessage,
              timestamp: Date.now()
            };
            
            setMessages([welcomeMsg]);
            
            // Ottieni suggerimenti iniziali
            if (enableSuggestions) {
              const initialSuggestions = await suggestionService.getSuggestedPrompts(messages[messages.length - 1], userContext);
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
  const trackMessage = async (message: any, role: 'user' | 'assistant') => {
    if (!conversationId) return;
    
    try {
      if (conversationTracker.current) {
        await conversationTracker.current.trackEvent({
          type: 'message',
          conversationId,
          data: {
            role,
            content: message
          },
          timestamp: Date.now()
        });
      } else {
        console.error('conversationTracker is not initialized.');
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
      
      // Traccia messaggio utente
    await trackMessage(inputValue, 'user');
  
    // Aggiorna interazioni utente
    userService.addInteraction(inputValue);
    
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
      
      // Extend UserContext to include aiContext
      const extendedContext = { ...userContext, aiContext };
      // Invia messaggio all'AI
      const response = await aiService.sendMessage(
        inputValue, 
        extendedContext
      );
      
      // Aggiorna messaggi con la risposta dell'AI
      setMessages(prev => [...prev, response.message]);
      
      // Traccia risposta AI
      await trackMessage(response.message.content, 'assistant');
        // Aggiorna componenti UI se presenti e abilitati
      if (response.uiComponents && enableDynamicComponents) {
        setUIComponents(prev => [
          ...(response.uiComponents ?? []).slice(0, maxRecommendations),
          ...prev.slice(0, 5 - Math.min(maxRecommendations, response.uiComponents?.length || 0)) // Mantieni solo i più recenti
        ]);
      }
        
        // Aggiorna suggerimenti se abilitati
        if (response.suggestedPrompts && enableSuggestions) {
          setSuggestedPrompts(response.suggestedPrompts);
        } else {
          setSuggestedPrompts([]);
        }
        
        // Aggiorna azioni disponibili
        if (response.availableActions) {
          setAvailableActions(response.availableActions);
        } else {
          setAvailableActions([]);
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
      
      // Esempio di gestione click su item o elemento menu
      if (action === 'view_item') {
        // Qui potresti aprire un modale o navigare a una pagina di dettaglio
        alert(`Visualizzazione dettagli per: ${payload.id}`);
      } else if (action === 'order_item') {
        // Qui potresti aggiungere al carrello
        alert(`Aggiunto al carrello: ${payload.id}`);
        
        // Aggiorna preferenze utente
        userService.updatePreference({
          itemId: payload.id,
          itemType: payload.type,
          rating: 4, // Valore iniziale
          timestamp: Date.now()
        });
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
                components={uiComponents} 
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
                  components={uiComponents} 
                  placement="sidebar"
                  onAction={handleUIAction}
                />
              )}
            </div>
          )}
        </div>
        
        {/* Componenti UI bottom, mosse in un contenitore a parte */}
        <div className="bottom-components-scroll-area">
          {enableDynamicComponents && (
            <div className="sidebar">
              <DynamicUIRenderer 
                components={uiComponents} 
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

  // Alla fine del file ChatInterface.tsx, dopo la definizione del componente
export default ChatInterface;