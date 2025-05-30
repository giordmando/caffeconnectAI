import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Message } from '../types/Message';
import { useServices } from '../contexts/ServiceProvider';
import { ChatConfig } from '../config/interfaces/IAppConfig';
import { useCart } from '../hooks/useCart';

// Import dei nuovi servizi
import { MessageService, IMessageService } from '../services/chat/MessageService';
import { SuggestionManagementService, ISuggestionManagementService } from '../services/chat/SuggestionManagementService';
import { UIComponentService, IUIComponentService } from '../services/chat/UIComponentService';
import { ActionHandlerService, IActionHandlerService } from '../services/chat/ActionHandlerService';
import { NLPAnalysisService, INLPAnalysisService } from '../services/chat/NLPAnalysisService';
import { ConversationManagerService, IConversationManagerService } from '../services/chat/ConversationManagerService';
import { ComponentManager } from '../services/ui/compstore/ComponentManager';

// Interfaccia del contesto semplificata
export interface ChatContextType {
  // Configurazione
  config: ChatConfig;
  updateConfig: (newConfig: Partial<ChatConfig>) => void;
  
  // Messaggi
  messages: Message[];
  
  // Input
  inputValue: string;
  setInputValue: (input: string) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleSendMessage: () => Promise<void>;
  
  // UI State
  isTyping: boolean;
  suggestedPrompts: string[];
  availableActions: any[];
  uiComponentsUpdated: number;
  componentManager: ComponentManager;
  
  // Handlers
  handleSuggestionClick: (suggestion: string) => void;
  handleUIAction: (action: string, payload: any) => void;
  
  // Utilities
  conversationId: string | null;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  
  // Metodi pubblici
  clearMessages: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{
  children: React.ReactNode;
  initialConfig?: Partial<ChatConfig>;
}> = ({ children, initialConfig = {} }) => {
  // Ottieni servizi dal provider
  const { 
    aiService, 
    userService, 
    suggestionService, 
    functionRegistry, 
    catalogService, 
    conversationTracker, 
    appConfig 
  } = useServices();
  const welcomeShown = useRef(false);
  const { addItem } = useCart();
  
  // Inizializza i servizi dedicati
  const messageService = useMemo<IMessageService>(
    () => new MessageService(conversationTracker),
    [conversationTracker]
  );
  
  const suggestionManagement = useMemo<ISuggestionManagementService>(
    () => new SuggestionManagementService(suggestionService),
    [suggestionService]
  );
  
  const componentManager = useMemo(() => {
    if (aiService && 'getComponentManager' in aiService) {
      return (aiService as any).getComponentManager();
    }
    return new ComponentManager();
  }, [aiService]);
  
  const uiComponentService = useMemo<IUIComponentService>(
    () => new UIComponentService(componentManager),
    [componentManager]
  );
  
  const actionHandler = useMemo<IActionHandlerService>(
    () => new ActionHandlerService(
      functionRegistry,
      catalogService,
      userService,
      messageService,
      uiComponentService
    ),
    [functionRegistry, catalogService, userService, messageService, uiComponentService]
  );
  
  const nlpAnalysisService = useMemo<INLPAnalysisService>(
    () => new NLPAnalysisService(),
    []
  );
  
  const conversationManager = useMemo<IConversationManagerService>(
    () => new ConversationManagerService(
      conversationTracker,
      userService,
      suggestionService
    ),
    [conversationTracker, userService, suggestionService]
  );
  
  // Stati locali (solo coordinamento)
  const [config, setConfig] = useState<ChatConfig>(() => ({
    showSidebar: appConfig?.ui?.showSidebar ?? true,
    enableSuggestions: appConfig?.ui?.enableSuggestions ?? true,
    enableDynamicComponents: appConfig?.ui?.enableDynamicComponents ?? true,
    enableNLP: appConfig?.ui?.enableNLP ?? false,
    maxRecommendations: appConfig?.ui?.maxRecommendations ?? 3,
    welcomeMessage: appConfig?.ui?.welcomeMessage || "Benvenuto! Come posso aiutarti?",
    ...initialConfig
  }));
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [availableActions, setAvailableActions] = useState<any[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null!);
  
  // Sincronizza stati con i servizi
  useEffect(() => {
    setMessages(messageService.getMessages());
  }, [messageService]);
  
  // Configura NLP
  useEffect(() => {
    nlpAnalysisService.setEnabled(config.enableNLP ?? false);
    if (config.enableNLP) {
      nlpAnalysisService.initialize();
    }
  }, [config.enableNLP, nlpAnalysisService]);
  
  // Inizializza conversazione
  useEffect(() => {
    conversationManager.initializeConversation();
  }, [conversationManager]);
  
  // Messaggio di benvenuto
  useEffect(() => {
    const loadWelcomeMessage = async () => {
      if (messages.length > 0 || !appConfig || welcomeShown.current) return;
      welcomeShown.current = true;
      setIsTyping(true);
      const { message, suggestions } = await conversationManager.loadWelcomeMessage(appConfig);
      
      messageService.addMessage(message);
      setMessages(messageService.getMessages());
      suggestionManagement.updateSuggestions(suggestions);
      
      // Track welcome message
      if (conversationManager.getCurrentConversationId()) {
        await messageService.trackMessage(
          message,
          conversationManager.getCurrentConversationId()!,
          userService.getUserContext()
        );
      }
      
      setIsTyping(false);
    };
    
    if (appConfig) {
      loadWelcomeMessage();
    }
  }, [appConfig, conversationManager, messageService, suggestionManagement, userService]);
  
  // Configura handlers
  useEffect(() => {
    actionHandler.setInputHandler(setInputValue);
    actionHandler.setCartHandler(addItem);
  }, [actionHandler, addItem]);
  
  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, uiComponentService.getUpdateCount()]);
  
  // Handlers
  const updateConfig = useCallback((newConfig: Partial<ChatConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);
  
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  }, []);
  
  const handleSendMessage = useCallback(async () => {
    const conversationId = conversationManager.getCurrentConversationId();
    if (inputValue.trim() === '' || isTyping || !conversationId) return;
    
    const userMessageContent = inputValue;
    setInputValue('');
    setIsTyping(true);
    suggestionManagement.clearSuggestions();
    
    // Crea e aggiungi messaggio utente
    const userMessage = messageService.createUserMessage(userMessageContent);
    messageService.addMessage(userMessage);
    setMessages(messageService.getMessages());
    
    // Analisi NLP se abilitata
    let nlpAnalysis = null;
    if (config.enableNLP) {
      nlpAnalysis = await nlpAnalysisService.analyzeMessage(userMessageContent);
      
      if (nlpAnalysis) {
        const nlpComponents = uiComponentService.createNLPComponents(userMessage, nlpAnalysis);
        uiComponentService.addComponents(nlpComponents);
      }
    }
    
    // Track messaggio utente
    await messageService.trackMessage(
      userMessage,
      conversationId,
      userService.getUserContext(),
      nlpAnalysis
    );
    
    // Aggiungi interazione
    userService.addInteraction(userMessageContent);
    
    try {
      // Prepara contesto per AI
      const userCtx = userService.getUserContext();
      const aiContextForAnalytics = conversationTracker 
        ? await conversationTracker.getUserContext(userCtx.userId) 
        : {};
      const extendedContext = { ...userCtx, aiContext: aiContextForAnalytics };
      
      // Invia messaggio all'AI
      const response = await aiService.sendMessage(userMessageContent, extendedContext);
      
      // Aggiungi risposta
      messageService.addMessage(response.message);
      setMessages(messageService.getMessages());
      
      // Track risposta
      await messageService.trackMessage(
        response.message,
        conversationId,
        userService.getUserContext()
      );
      
      // Gestisci componenti UI
      if (response.uiComponents && config.enableDynamicComponents) {
        uiComponentService.addComponents(response.uiComponents);
      }
      
      // Aggiorna suggerimenti
      if (response.suggestedPrompts && config.enableSuggestions) {
        suggestionManagement.updateSuggestions(response.suggestedPrompts);
      }
      
      // Aggiorna azioni disponibili
      setAvailableActions(response.availableActions || []);
      
    } catch (error) {
      console.error('[ChatContext] Error sending message:', error);
      const errorMessage = messageService.createAssistantMessage(
        'Mi dispiace, ho avuto un problema. Riprova.'
      );
      messageService.addMessage(errorMessage);
      setMessages(messageService.getMessages());
    }
    
    setIsTyping(false);
  }, [
    inputValue, 
    isTyping, 
    config,
    messageService,
    suggestionManagement,
    uiComponentService,
    nlpAnalysisService,
    conversationManager,
    userService,
    conversationTracker,
    aiService
  ]);
  
  const handleSuggestionClick = useCallback((suggestion: string) => {
    setInputValue(suggestion);
  }, []);
  
  const handleUIAction = useCallback(async (action: string, payload: any) => {
    await actionHandler.handleAction(action, payload);
    setMessages(messageService.getMessages());
  }, [actionHandler, messageService]);
  
  const clearMessages = useCallback(() => {
    messageService.clearMessages();
    setMessages([]);
    uiComponentService.clearComponents();
  }, [messageService, uiComponentService]);
  
  const contextValue: ChatContextType = {
    config,
    updateConfig,
    messages,
    inputValue,
    setInputValue,
    handleInputChange,
    handleKeyDown,
    handleSendMessage,
    isTyping,
    suggestedPrompts: suggestionManagement.getCurrentSuggestions(),
    availableActions,
    uiComponentsUpdated: uiComponentService.getUpdateCount(),
    componentManager,
    handleSuggestionClick,
    handleUIAction,
    conversationId: conversationManager.getCurrentConversationId(),
    messagesEndRef,
    clearMessages
  };
  
  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};