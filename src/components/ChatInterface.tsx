import React, { useState, useEffect, useRef } from 'react';
import { Message } from '../types/Message';
import { UIComponent } from '../types/UI';
import { useServices } from '../contexts/ServiceContext';
import { DynamicUIRenderer } from './ui/DynamicUIRenderer';

/**
 * Main chat interface component
 */
const ChatInterface: React.FC = () => {
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [uiComponents, setUIComponents] = useState<UIComponent[]>([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [availableActions, setAvailableActions] = useState<any[]>([]);
  
  // Get services
  const { aiService, userService } = useServices();
  
  // Get user context
  const userContext = userService.getUserContext();
  
  // Reference to messages container for auto-scrolling
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  
  // Load initial welcome message
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
        
        // Update user context
        userService.addInteraction("Initial welcome message");
      } catch (error) {
        console.error('Error loading welcome message:', error);
        setMessages([{
          role: 'assistant',
          content: 'Benvenuto a CaféConnect! Come posso aiutarti oggi?',
          timestamp: Date.now()
        }]);
      }
      
      setIsTyping(false);
    };
    
    loadWelcomeMessage();
  }, [aiService]);
  
  // Auto-scroll when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, uiComponents]);
  
  // Send message handler
  const handleSendMessage = async () => {
    if (inputValue.trim() === '' || isTyping) return;
    
    const userMessage: Message = {
      role: 'user',
      content: inputValue,
      timestamp: Date.now()
    };
    
    // Update UI immediately with user message
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    
    // Update user interactions
    userService.addInteraction(inputValue);
    
    try {
      // Send message to AI
      const response = await aiService.sendMessage(
        inputValue, 
        userContext
      );
      
      // Update messages with AI response
      setMessages(prev => [...prev, response.message]);
      
      // Update UI components if present
      if (response.uiComponents) {
        setUIComponents(prev => [
          ...(response.uiComponents ?? []),
          ...prev.slice(0, 5) // Keep only the 5 most recent components
        ]);
      }
      
      // Update suggestions
      if (response.suggestedPrompts) {
        setSuggestedPrompts(response.suggestedPrompts);
      }
      
      // Update available actions
      if (response.availableActions) {
        setAvailableActions(response.availableActions);
      }
    } catch (error) {
      console.error('Error communicating with AI:', error);
      
      // Error message
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Mi dispiace, ho avuto un problema nel processare la tua richiesta. Puoi riprovare?',
        timestamp: Date.now()
      }]);
    }
    
    setIsTyping(false);
  };
  
  // Input change handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };
  
  // Key press handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };
  
  // Suggestion click handler
  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    handleSendMessage();
  };
  
  // UI action handler
  const handleUIAction = (action: string, payload: any) => {
    console.log(`UI Action: ${action}`, payload);
    
    // Example of handling item click or menu item
    if (action === 'view_item') {
      // Here you could open a modal or navigate to a detail page
      alert(`Viewing details for: ${payload.id}`);
    } else if (action === 'order_item') {
      // Here you could add to cart
      alert(`Added to cart: ${payload.id}`);
      
      // Update user preferences
      userService.updatePreference({
        itemId: payload.id,
        itemType: payload.type,
        rating: 4, // Initial value
        timestamp: Date.now()
      });
    }
  };
  
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
        {/* Main messages area */}
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
          
          {/* Inline UI components */}
          <DynamicUIRenderer 
            components={uiComponents} 
            placement="inline"
            onAction={handleUIAction}
          />
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Sidebar for UI components */}
        <div className="chat-sidebar">
          <DynamicUIRenderer 
            components={uiComponents} 
            placement="sidebar"
            onAction={handleUIAction}
          />
        </div>
      </div>
      
      {/* Bottom UI components */}
      <div className="components-bottom">
        <DynamicUIRenderer 
          components={uiComponents} 
          placement="bottom"
          onAction={handleUIAction}
        />
      </div>
      
      {/* Suggested prompts */}
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
      
      {/* Input area */}
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
      
      {/* Available actions */}
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