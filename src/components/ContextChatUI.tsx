import React from 'react';
import { ChatProvider, useChatContext } from './ChatContext';
import { ChatConfig } from '../config/interfaces/IAppConfig';
import { DynamicUIRenderer } from './ui/DynamicUIRenderer';
import { SimpleConsentBanner } from './SimpleConsentBanner';
import { SimpleConsentService } from '../services/analytics/SimpleConsentService';
import MessageBubble from './MessageBubble';
import { useServices } from '../contexts/ServiceProvider';

const consentService = new SimpleConsentService();

const ChatInterface: React.FC = () => {
  const {
    messages,
    inputValue,
    isTyping,
    componentManager,
    uiComponentsUpdated,
    suggestedPrompts,
    config,
    availableActions,
    handleInputChange,
    handleKeyDown,
    handleSendMessage,
    handleSuggestionClick,
    handleUIAction,
    messagesEndRef
  } = useChatContext();

  const { appConfig } = useServices();
  const chatTitle = appConfig?.business?.name || 'CafeConnect AI';

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div>
          <h2>{chatTitle}</h2>
          <p>Assistente ordini e consigli</p>
        </div>
        <div className="provider-badge">AI concierge</div>
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
            placeholder="Scrivi cosa desideri ordinare o chiedere..."
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
        onConsentChange={() => undefined}
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
