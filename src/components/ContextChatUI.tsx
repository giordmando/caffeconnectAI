import React from 'react';
import { ChatProvider, useChatContext, ChatConfig } from './ChatContext';
import { DynamicUIRenderer } from './ui/DynamicUIRenderer';
import { NLPInsightsPanel } from './ui/nlp/NLPInsightsPanel';
import { SimpleConsentBanner } from './SimpleConsentBanner';
import { SimpleConsentService } from '../services/analytics/SimpleConsentService';
import { ConsentLevel } from '../services/analytics/types';

// Inizializza servizi
const consentService = new SimpleConsentService();

/**
 * Interfaccia di chat che utilizza il contesto
 * Implementazione pulita e focalizzata solo sul rendering
 */
const ChatInterface: React.FC = () => {
  // Utilizzo del contesto
  const {
    messages,
    inputValue,
    isTyping,
    uiComponents,
    suggestedPrompts,
    nlpComponents,
    config,
    handleInputChange,
    handleKeyDown,
    handleSendMessage,
    handleSuggestionClick,
    handleUIAction,
    messagesEndRef,
    isNLPInitialized
  } = useChatContext();
  
  // Gestione consenso
  const handleConsentChange = async (level: ConsentLevel) => {
    console.log(`Consenso aggiornato: ${level}`);
  };
  
  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>CaféConnect AI</h2>
        <div className="provider-badge">Powered by AI</div>
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
          {config.enableDynamicComponents && (
            <DynamicUIRenderer 
              components={uiComponents} 
              placement="inline"
              onAction={handleUIAction}
            />
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Sidebar per componenti UI */}
        {config.showSidebar && config.enableDynamicComponents && (
          <div className="chat-sidebar">
            <DynamicUIRenderer 
              components={uiComponents} 
              placement="sidebar"
              onAction={handleUIAction}
            />
            {/* Componenti NLP */}
            {config.enableNLP && isNLPInitialized && nlpComponents.length > 0 && (
              <NLPInsightsPanel 
                components={nlpComponents}
                placement="sidebar"
                onAction={handleUIAction}
              />
            )}
          </div>
        )}
        
      </div>
      
      {/* Componenti UI bottom */}
      {config.enableDynamicComponents && (
        <div className="bottom-components-scroll-area">
          <DynamicUIRenderer 
            components={uiComponents} 
            placement="bottom"
            onAction={handleUIAction}
          />
        </div>
      )}
      
      {/* Suggerimenti */}
      {config.enableSuggestions && suggestedPrompts.length > 0 && (
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
      
      {/* Banner consenso */}
      <SimpleConsentBanner 
        consentService={consentService}
        onConsentChange={handleConsentChange}
      />
    </div>
  );
};

/**
 * Wrapper componente con provider
 * Questo è il componente da utilizzare nell'applicazione
 */
export const CompleteChatInterface: React.FC<{
  initialConfig?: ChatConfig;
}> = ({ initialConfig }) => {
  return (
    <ChatProvider initialConfig={initialConfig}>
      <ChatInterface />
    </ChatProvider>
  );
};

export default CompleteChatInterface;