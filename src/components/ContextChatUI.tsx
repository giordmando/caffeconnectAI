// src/components/ContextChatUI.tsx - Versione aggiornata
import React from 'react';
import { ChatProvider, useChatContext } from './ChatContext';
import { ChatConfig } from '../config/interfaces/IAppConfig';
import { DynamicUIRenderer } from './ui/DynamicUIRenderer';
import { NLPInsightsPanel } from './ui/nlp/NLPInsightsPanel';
import { SimpleConsentBanner } from './SimpleConsentBanner';
import { SimpleConsentService } from '../services/analytics/SimpleConsentService';
import { ConsentLevel } from '../services/analytics/types';
import MessageBubble from './MessageBubble';
import { useServices } from '../contexts/ServiceProvider';

// Inizializza consentService
const consentService = new SimpleConsentService();

const ChatInterface: React.FC = () => {
  const {
    messages,
    inputValue,
    isTyping,
    componentManager,
    uiComponentsUpdated,
    suggestedPrompts,
    nlpComponents,
    config,
    availableActions,
    handleInputChange,
    handleKeyDown,
    handleSendMessage,
    handleSuggestionClick,
    handleUIAction,
    messagesEndRef,
    isNLPInitialized
  } = useChatContext();

  const { appConfig } = useServices();

  const handleConsentChange = (level: ConsentLevel) => {
    console.log(`[ContextChatUI] Consenso aggiornato a: ${level}`);
  };

  const chatTitle = appConfig?.business?.name || 'CaféConnect AI';

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>{chatTitle}</h2>
        <div className="provider-badge">Powered by AI</div>
      </div>

      <div className="chat-layout">
        <div className="chat-messages">
          {messages.map((msg, index) => (
            <MessageBubble
              key={`${msg.timestamp}-${index}-${msg.role}`}
              message={msg}
            />
          ))}

          {isTyping && (
            <MessageBubble
              message={{ role: 'assistant', content: '', timestamp: Date.now() }}
              isTyping={true}
            />
          )}

          {config.enableDynamicComponents && (
            <DynamicUIRenderer
              placement="inline"
              onAction={handleUIAction}
              componentManager={componentManager}
              key={`inline-${uiComponentsUpdated}`}
            />
          )}

          <div ref={messagesEndRef} />
        </div>

        {config.showSidebar && (
          <div className="chat-sidebar">
            {config.enableDynamicComponents && (
              <DynamicUIRenderer
                placement="sidebar"
                onAction={handleUIAction}
                componentManager={componentManager}
                key={`sidebar-${uiComponentsUpdated}`}
              />
            )}
            
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

      {config.enableDynamicComponents && (
        <div className="bottom-components-scroll-area">
          <DynamicUIRenderer
            placement="bottom"
            onAction={handleUIAction}
            componentManager={componentManager}
            key={`bottom-${uiComponentsUpdated}`}
          />
        </div>
      )}

      <div className="chat-controls-fixed">
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

        {availableActions && availableActions.length > 0 && (
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

export const CompleteChatInterface: React.FC<{
  initialConfig?: Partial<ChatConfig>;
}> = ({ initialConfig }) => {
  return (
    <ChatProvider initialConfig={initialConfig}>
      <ChatInterface />
    </ChatProvider>
  );
};

export default CompleteChatInterface;