// src/components/ContextChatUI.tsx
import React, { useEffect } from 'react'; // Rimosso useState non utilizzato qui
import { ChatProvider, useChatContext } from './ChatContext';
import { AppConfig, ChatConfig } from '../config/interfaces/IAppConfig'; // Importa AppConfig e ChatConfig
import { DynamicUIRenderer } from './ui/DynamicUIRenderer';
import { NLPInsightsPanel } from './ui/nlp/NLPInsightsPanel';
import { SimpleConsentBanner } from './SimpleConsentBanner';
import { SimpleConsentService } from '../services/analytics/SimpleConsentService';
import { ConsentLevel } from '../services/analytics/types';
import MessageBubble from './MessageBubble';
import { useServices } from '../contexts/ServiceProvider'; // Importa useServices per accedere ad appConfig

// Inizializza consentService (può rimanere qui se usato solo da questo banner)
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
    config, // Contiene già le configurazioni UI della chat
    availableActions,
    handleInputChange,
    handleKeyDown,
    handleSendMessage,
    handleSuggestionClick,
    handleUIAction,
    messagesEndRef,
    isNLPInitialized
  } = useChatContext();

  // Ottieni appConfig da useServices per il nome del business, se necessario.
  // ServiceProvider assicura che appConfig sia disponibile quando isInitialized è true.
  const { appConfig } = useServices();

  const handleConsentChange = (level: ConsentLevel) => {
    console.log(`[ContextChatUI] Consenso aggiornato a: ${level}`);
  };

  // Determina il titolo della chat
  const chatTitle = appConfig?.business?.name || 'CaféConnect AI';

  return (
    <div className="chat-container">
      <div className="chat-header">
        {/* Usa il nome del business da appConfig se disponibile, altrimenti un default */}
        <h2>{chatTitle}</h2>
        <div className="provider-badge">Powered by AI</div>
      </div>

      <div className="chat-layout">
        <div className="chat-messages">
          {messages.map((msg, index) => (
            <MessageBubble
              key={`${msg.timestamp}-${index}-${msg.role}`} // Chiave più robusta
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
              components={[]}
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
                components={[]}
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
            components={[]}
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
