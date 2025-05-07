import React, { useState, useEffect, useRef } from 'react';

import { DynamicUIFactory } from '../DynamicUIFactory';
import { Message } from '../../types/Message';
import { useServices } from '../../contexts/ServiceContext';
import { UIComponent } from '../../types/UI';
import { getConversationTracker } from '../../services/analytics/setupAnalytics';
import { IConversationTracker } from '../../services/analytics/interfaces/IConversationTracker';
import { nlpIntegrationService } from '../../services/analytics/nlp/NLPIntegrationService';
import { NLPInsightsPanel } from './nlp/NLPInsightsPanel';



interface ImprovedChatInterfaceProps {
  welcomeMessage?: string;
  showSidebar?: boolean;
  enableSuggestions?: boolean;
  enableNLP?: boolean;
}

// Componente principale per l'interfaccia di chat
function ImprovedChatInterface({ 
  welcomeMessage, 
  showSidebar = false,
  enableSuggestions = true,
  enableNLP = false
}: ImprovedChatInterfaceProps) {
  // Stati per gestire la conversazione e l'UI
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [uiComponents, setUIComponents] = useState<UIComponent[]>([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [isNLPInitialized, setIsNLPInitialized] = useState<boolean>(false);
  const [nlpComponents, setNLPComponents] = useState<UIComponent[]>([]);
  // Riferimenti per la gestione dello scroll
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  
  // Ottieni servizi dal contesto
  const { aiService, userService, suggestionService } = useServices();
  const userContext = userService.getUserContext();
  
  // Carica messaggio di benvenuto iniziale
  useEffect(() => {
    const loadWelcomeMessage = async () => {
      setIsTyping(true);
      
      try {
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
          const response = await aiService.sendMessage(
            "Ciao! Sono nuovo qui.", 
            userContext
          );
          
          setMessages([response.message]);
          
          if (response.uiComponents) {
            setUIComponents(response.uiComponents);
          }
          
          if (response.suggestedPrompts && enableSuggestions) {
            setSuggestedPrompts(response.suggestedPrompts);
          }
        }
        
        userService.addInteraction(welcomeMessage || "Initial welcome message");
      } catch (error) {
        console.error('Error loading welcome message:', error);
        
        setMessages([{
          role: 'assistant',
          content: welcomeMessage || 'Benvenuto! Come posso aiutarti oggi?',
          timestamp: Date.now()
        }]);
      }
      
      setIsTyping(false);
    };
    
    loadWelcomeMessage();
  }, [aiService, userService, userContext, welcomeMessage, enableSuggestions, suggestionService]);
  
  // Auto-scroll quando arrivano nuovi messaggi
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, uiComponents]);
  
  // Riferimento per il conversation tracker
  const conversationTracker = useRef<IConversationTracker>(null);

  useEffect(() => {
    const initialize = async () => {
      // Inizializza conversation tracker
      conversationTracker.current = await getConversationTracker();
      
      try {
        await nlpIntegrationService.initialize();
        setIsNLPInitialized(nlpIntegrationService.isServiceInitialized());
        console.log('NLP Service initialized successfully');
      } catch (error) {
        console.error('Error initializing NLP service:', error);
        setIsNLPInitialized(false);
      }
    }
    
    initialize();
  }, []);
  
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
    
    try {
      // Invia messaggio all'AI
      const response = await aiService.sendMessage(
        inputValue, 
        userContext
      );
      
      // Aggiorna messaggi con la risposta dell'AI
      setMessages(prev => [...prev, response.message]);
      
      // Aggiorna componenti UI
      if (response.uiComponents) {
        setUIComponents(prev => [
          ...(response.uiComponents || []),
          ...prev.slice(0, 5 - Math.min(5, response.uiComponents?.length || 0))
        ]);
      }
      
      // Aggiorna suggerimenti
      if (response.suggestedPrompts && enableSuggestions) {
        setSuggestedPrompts(response.suggestedPrompts);
      } else {
        setSuggestedPrompts([]);
      }
    } catch (error) {
      console.error('Errore nella comunicazione con l\'AI:', error);
      
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
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };
  
  // Gestione suggerimenti
  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    handleSendMessage();
  };
  
  // Gestione azioni UI
  const handleUIAction = (action: string, payload: any) => {
    console.log(`UI Action: ${action}`, payload);
    
    if (action === 'view_item') {
      alert(`Visualizzazione dettagli per: ${payload.id}`);
    } else if (action === 'order_item') {
      alert(`Aggiunto al carrello: ${payload.id}`);
      
      userService.updatePreference({
        itemId: payload.id,
        itemType: payload.type,
        rating: 4,
        timestamp: Date.now()
      });
    }
  };
  
  // Rendering dei componenti UI
  const renderUIComponents = (components: UIComponent[], placement: string) => {
    const filteredComponents = components.filter(comp => comp.placement === placement);
    
    if (filteredComponents.length === 0) {
      return null;
    }
    
    return (
      <div className={`dynamic-ui-${placement}`}>
        {filteredComponents.map((components) => (
          <div key={components.id} className="dynamic-ui-item">
            <DynamicUIFactory component={components} onAction={handleUIAction} />
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>CaféConnect AI</h2>
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
          {renderUIComponents(uiComponents, 'inline')}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Sidebar per componenti UI */}
        {showSidebar && (
          <div className="chat-sidebar">
            {renderUIComponents(uiComponents, 'sidebar')}
          </div>
        )}
      </div>
      
      {/* Componenti UI bottom */}
      {renderUIComponents(uiComponents, 'bottom')}
      
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
      {/* Pannello NLP e Insights */}
      {enableNLP && isNLPInitialized && nlpComponents.length > 0 && (
        <NLPInsightsPanel 
          components={nlpComponents}
          onAction={handleUIAction}
        />
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
}

export default ImprovedChatInterface;