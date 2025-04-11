// Placeholder for ChatInterface component
import React, { useState, useEffect, useRef } from 'react';
import { Message } from '../types/Message';
import { UIComponent } from '../types/UI';
import { UserContext } from '../types/UserContext';
import { createDefaultAIService, EnhancedAIService } from '../services/enhancedAIService';
import { DynamicUIRenderer } from './DynamicUIFactory';
import { useLocalStorage } from '../hooks/useLocalStorage';


const ChatInterface: React.FC = () => {
  // Stato
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [uiComponents, setUIComponents] = useState<UIComponent[]>([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [availableActions, setAvailableActions] = useState<any[]>([]);
  
  // Stato per il servizio AI
  const [aiService, setAIService] = useState<EnhancedAIService>(() => {
    const defaultAIService = createDefaultAIService();
    return defaultAIService;
  });
  
  useEffect(() => {
    const savedConfig = localStorage.getItem('cafeconnect-ai-config');
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        const { provider, config } = parsedConfig;
  
        // Crea un nuovo servizio AI con la configurazione salvata
        const newAIService = new EnhancedAIService({
          provider,
          providerConfig: config,
          enableFunctionCalling: true,
        });
  
        setAIService(newAIService);
      } catch (error) {
        console.error('Errore nel parsing della configurazione salvata:', error);
      }
    }
  }, []);
  // Stato utente persistente
  const [userContext, setUserContext] = useLocalStorage<UserContext>('cafeconnect-user-context', {
    userId: `user-${Math.floor(Math.random() * 10000)}`,
    preferences: [],
    interactions: [],
    lastVisit: new Date().toISOString(),
    dietaryRestrictions: []
  });

  // Riferimento all'elemento della chat per lo scroll automatico
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'cafeconnect-ai-config' && event.newValue) {
        try {
          const parsedConfig = JSON.parse(event.newValue);
          const { provider, config } = parsedConfig;

          // Crea un nuovo servizio AI con la configurazione aggiornata
          const newAIService = new EnhancedAIService({
            provider,
            providerConfig: config,
            enableFunctionCalling: true,
          });

          setAIService(newAIService);
        } catch (error) {
          console.error('Errore nel parsing della configurazione aggiornata:', error);
        }
      }
  };

  // Aggiungi il listener
  window.addEventListener('storage', handleStorageChange);

  // Rimuovi il listener quando il componente viene smontato
  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
  }, []);

  // Effetto per caricare un messaggio di benvenuto iniziale
  useEffect(() => {
    const loadWelcomeMessage = async () => {
      setIsTyping(true);
      
      try {
        const response = await aiService.sendMessage(
          "Ciao! Sono nuovo qui.", 
          userContext
        );
        
        setMessages([response.message]);
        
        if (response.uiComponents) {
          setUIComponents(response.uiComponents);
        }
        
        if (response.suggestedPrompts) {
          setSuggestedPrompts(response.suggestedPrompts);
        }
        
        if (response.availableActions) {
          setAvailableActions(response.availableActions);
        }
      } catch (error) {
        console.error('Errore nel caricamento del messaggio di benvenuto:', error);
        setMessages([{
          role: 'assistant',
          content: 'Benvenuto a CaféConnect! Come posso aiutarti oggi?',
          timestamp: Date.now()
        }]);
      }
      
      setIsTyping(false);
      
      // Aggiorna le ultime interazioni dell'utente
      setUserContext({
        ...userContext,
        lastVisit: new Date().toISOString()
      });
    };
    
    loadWelcomeMessage();
  }, [aiService]);
  
  // Effetto per lo scrolling automatico quando arrivano nuovi messaggi
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, uiComponents]);
  
  // Gestione invio messaggio
  const handleSendMessage = async () => {
    if (inputValue.trim() === '' || isTyping) return;
    
    const userMessage: Message = {
      role: 'user',
      content: inputValue,
      timestamp: Date.now()
    };
    
    // Aggiorna la UI immediatamente con il messaggio dell'utente
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    
    // Aggiorna interazioni utente
    const updatedInteractions = [
      inputValue, 
      ...userContext.interactions
    ].slice(0, 10); // mantieni solo le ultime 10 interazioni
    
    setUserContext({
      ...userContext,
      interactions: updatedInteractions
    });
    
    try {
      // Invia messaggio all'AI
      const response = await aiService.sendMessage(
        inputValue, 
        userContext
      );
      
      // Aggiorna messaggi con la risposta dell'AI
      setMessages(prev => [...prev, response.message]);
      
      // Aggiorna componenti UI se presenti
      if (response.uiComponents) {
        setUIComponents(prev => [
          ...(response.uiComponents ?? []),
          ...prev.slice(0, 5) // Mantieni solo i 5 componenti più recenti
        ]);
      }
      
      // Aggiorna suggerimenti
      if (response.suggestedPrompts) {
        setSuggestedPrompts(response.suggestedPrompts);
      }
      
      // Aggiorna azioni disponibili
      if (response.availableActions) {
        setAvailableActions(response.availableActions);
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
  
  // Gestione input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };
  
  // Gestione pressione Invio
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };
  
  // Gestione click su suggerimento
  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    handleSendMessage();
  };
  
  // Gestione azioni UI
  const handleUIAction = (action: string, payload: any) => {
    console.log(`Azione UI: ${action}`, payload);
    
    // Esempio di gestione click su prodotto o menu item
    if (action === 'view_item') {
      // Qui potresti aprire una modal o navigare a una pagina dettaglio
      alert(`Visualizzazione dettagli per: ${payload.id}`);
    } else if (action === 'order_item') {
      // Qui potresti aggiungere al carrello
      alert(`Aggiunto al carrello: ${payload.id}`);
      
      // Aggiorna preferenze utente
      const updatedPreferences = [...userContext.preferences];
      const existingPrefIndex = updatedPreferences.findIndex(
        p => p.itemId === payload.id && p.itemType === payload.type
      );
      
      if (existingPrefIndex >= 0) {
        // Incrementa rating se esiste già
        updatedPreferences[existingPrefIndex].rating = 
          Math.min(5, updatedPreferences[existingPrefIndex].rating + 1);
      } else {
        // Aggiungi nuova preferenza
        updatedPreferences.push({
          itemId: payload.id,
          itemType: payload.type,
          rating: 4, // Valore iniziale
          timestamp: Date.now()
        });
      }
      
      setUserContext({
        ...userContext,
        preferences: updatedPreferences
      });
    }
  };
  
  // Rendering componente
  return (
    <div className="chat-container">
      {/* Header */}
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
          <DynamicUIRenderer 
            components={uiComponents} 
            placement="inline"
            onAction={handleUIAction}
          />
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Sidebar per componenti UI */}
        <div className="chat-sidebar">
          <DynamicUIRenderer 
            components={uiComponents} 
            placement="sidebar"
            onAction={handleUIAction}
          />
        </div>
      </div>
      
      {/* Componenti UI bottom */}
      <div className="components-bottom">
        <DynamicUIRenderer 
          components={uiComponents} 
          placement="bottom"
          onAction={handleUIAction}
        />
      </div>
      
      {/* Suggerimenti */}
      {suggestedPrompts.length > 0 && (
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
    </div>
  );
};

export default ChatInterface;