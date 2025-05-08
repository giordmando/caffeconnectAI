import React, { useState, useEffect, useRef } from 'react';
import { Message } from '../types/Message';
import { UIComponent } from '../types/UI';
import { DynamicUIRenderer } from './ui/DynamicUIRenderer';
import { IConversationTracker } from '../services/analytics/interfaces/IConversationTracker';
import { getConversationTracker } from '../services/analytics/setupAnalytics';
import { useServices } from '../contexts/RootServiceProvider';

export interface BaseChatInterfaceProps {
  welcomeMessage?: string;
  showSidebar?: boolean;
  enableSuggestions?: boolean;
  enableDynamicComponents?: boolean;
  enableNLP?: boolean;
  maxRecommendations?: number;
}

/**
 * Componente base per le interfacce di chat
 * Contiene la logica comune per gestire messaggi, input, UI dinamici e suggerimenti
 */
const BaseChatInterface: React.FC<BaseChatInterfaceProps> = ({
  welcomeMessage,
  showSidebar = true,
  enableSuggestions = true,
  enableDynamicComponents = true,
  enableNLP = false,
  maxRecommendations = 3
}) => {
  // Stati base comuni a tutte le implementazioni di chat
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [uiComponents, setUIComponents] = useState<UIComponent[]>([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Riferimenti
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const conversationTracker = useRef<IConversationTracker | null>(null);

  // Ottieni servizi dal contesto
  const { aiService, userService, suggestionService } = useServices();
  const userContext = userService.getUserContext();

  // Inizializza tracker conversazione
  useEffect(() => {
    const initializeTracker = async () => {
      try {
        const tracker = await getConversationTracker();
        conversationTracker.current = tracker;
        
        if (tracker) {
          const newConversationId = await tracker.startConversation();
          setConversationId(newConversationId);
          console.log(`Nuova conversazione inizializzata: ${newConversationId}`);
        }
      } catch (error) {
        console.error('Errore nell\'inizializzazione del conversation tracker:', error);
      }
    };
    
    initializeTracker();
    
    // Cleanup alla chiusura
    return () => {
      if (conversationId && conversationTracker.current) {
        conversationTracker.current.endConversation(conversationId)
          .catch(error => console.error('Errore nella chiusura conversazione:', error));
      }
    };
  }, []);

  // Auto-scroll quando arrivano nuovi messaggi
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, uiComponents]);

  // Carica messaggio di benvenuto iniziale
  useEffect(() => {
    const loadWelcomeMessage = async () => {
      setIsTyping(true);
      
      try {
        if (welcomeMessage) {
          // Crea messaggio assistente con il testo personalizzato
          const welcomeMsg: Message = {
            role: 'assistant',
            content: welcomeMessage,
            timestamp: Date.now()
          };
          
          setMessages([welcomeMsg]);
          
          // Ottieni suggerimenti iniziali se abilitati
          if (enableSuggestions) {
            const initialSuggestions = await suggestionService.getSuggestedPrompts(welcomeMsg, userContext);
            setSuggestedPrompts(initialSuggestions);
          }
        } else {
          // Chiedi all'IA un messaggio di benvenuto
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
        }
        
        // Aggiorna contesto utente
        userService.addInteraction(welcomeMessage || "Initial welcome message");
      } catch (error) {
        console.error('Errore nel caricamento del messaggio di benvenuto:', error);
        
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

  // Traccia i messaggi
  const trackMessage = async (message: any, role: 'user' | 'assistant') => {
    if (!conversationId || !conversationTracker.current) return;
    
    try {
      await conversationTracker.current.trackEvent({
        type: 'message',
        conversationId,
        data: {
          role,
          content: message
        },
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Errore nel tracciamento messaggio:', error);
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
      // Preparazione del contesto esteso
      let extendedContext: typeof userContext & { aiContext?: any } = { ...userContext };
      
      // Recupera contesto aggiuntivo se disponibile
      try {
        if (conversationTracker.current) {
          const aiContext = await conversationTracker.current.getUserContext();
          extendedContext = { ...extendedContext, aiContext };
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
      setMessages(prev => [...prev, response.message]);
      
      // Traccia risposta AI
      await trackMessage(response.message.content, 'assistant');
      
      // Aggiorna componenti UI se presenti e abilitati
      if (response.uiComponents && enableDynamicComponents) {
        setUIComponents(prev => [
          ...(response.uiComponents ?? []).slice(0, maxRecommendations),
          ...prev.slice(0, 5 - Math.min(maxRecommendations, response.uiComponents?.length || 0))
        ]);
      }
      
      // Aggiorna suggerimenti se abilitati
      if (response.suggestedPrompts && enableSuggestions) {
        setSuggestedPrompts(response.suggestedPrompts);
      } else {
        setSuggestedPrompts([]);
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

  // Gestione input utente
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
    
    // Logica di base per azioni comuni
    if (action === 'view_item') {
      alert(`Visualizzazione dettagli per: ${payload.id}`);
    } else if (action === 'order_item' || action === 'buy_item') {
      alert(`Aggiunto al carrello: ${payload.id}`);
      
      // Aggiorna preferenze utente
      userService.updatePreference({
        itemId: payload.id,
        itemType: payload.type,
        rating: 4, // Valore iniziale
        timestamp: Date.now()
      });
    }
    
    // Le implementazioni specifiche possono estendere questa logica
  };

  // Il rendering base è vuoto e deve essere sovrascritto dalle classi figlie
  // Questo serve solo come template per la struttura comune
  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>Chat AI</h2>
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
        {showSidebar && enableDynamicComponents && (
          <div className="chat-sidebar">
            <DynamicUIRenderer 
              components={uiComponents} 
              placement="sidebar"
              onAction={handleUIAction}
            />
          </div>
        )}
      </div>
      
      {/* Componenti UI bottom */}
      {enableDynamicComponents && (
        <div className="bottom-components-scroll-area">
          <DynamicUIRenderer 
            components={uiComponents} 
            placement="bottom"
            onAction={handleUIAction}
          />
        </div>
      )}
      
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
  );
};

// Esporta sia il componente base che i suoi hook e funzioni di utilità
export { 
  BaseChatInterface, 
  // Per condividere gli stati e la logica comune tra diversi componenti figli
  // possiamo usare hook personalizzati
  // Qui si potrebbero aggiungere in futuro
};

export default BaseChatInterface;