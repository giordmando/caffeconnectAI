import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Message } from '../types/Message';
import { UIComponent } from '../types/UI';
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
import { AIGatewayClient, AIGatewayChatResponse } from '../services/ai/gateway/AIGatewayClient';
import { businessEventService } from '../services/analytics/BusinessEventService';

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

  const aiGatewayClient = useMemo(() => new AIGatewayClient(), []);
  
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
  
  const shouldUseAIGateway = useCallback((): boolean => {
    return process.env.REACT_APP_ENABLE_AI_GATEWAY !== 'false';
  }, []);

  const createGatewayActions = useCallback((gatewayResponse: AIGatewayChatResponse): any[] => {
    const actions: any[] = [];

    (gatewayResponse.toolCalls || []).forEach(toolCall => {
      const result: any = toolCall.result || {};
      const items = result.items || result.products || [];

      items.forEach((item: any) => {
        if (!item || !item.id || !item.name) return;
        actions.push({
          type: 'view_item',
          title: `Vedi ${item.name}`,
          payload: {
            id: item.id,
            type: result.products ? 'product' : 'menuItem'
          }
        });
      });
    });

    return actions.slice(0, 6);
  }, []);

  const createGatewayUIComponents = useCallback((gatewayResponse: AIGatewayChatResponse): UIComponent[] => {
    const components: UIComponent[] = [];

    (gatewayResponse.toolCalls || []).forEach((toolCall, toolIndex) => {
      const result: any = toolCall.result || {};
      const items = result.items || [];
      const products = result.products || [];

      if (toolCall.name === 'search_menu' && items.length > 0) {
        components.push({
          type: 'menuCarousel',
          placement: 'inline',
          id: `gateway-menu-${Date.now()}-${toolIndex}`,
          data: {
            recommendations: items.slice(0, config.maxRecommendations || 4).map((item: any, index: number) => ({
              id: item.id,
              name: item.name,
              confidence: Math.max(0.75, 0.95 - index * 0.05),
              item
            })),
            timeOfDay: toolCall.arguments && typeof toolCall.arguments === 'object'
              ? (toolCall.arguments as any).timeOfDay || 'all'
              : 'all',
            category: 'all'
          },
          _updated: Date.now()
        });
      }

      if (toolCall.name === 'search_products' && products.length > 0) {
        components.push({
          type: 'productCarousel',
          placement: 'inline',
          id: `gateway-products-${Date.now()}-${toolIndex}`,
          data: {
            recommendations: products.slice(0, config.maxRecommendations || 4).map((product: any, index: number) => ({
              id: product.id,
              name: product.name,
              confidence: Math.max(0.75, 0.95 - index * 0.05),
              item: product
            })),
            category: 'all'
          },
          _updated: Date.now()
        });
      }

      if (toolCall.name === 'get_item_detail' && result.item) {
        components.push({
          type: 'productDetail',
          placement: 'inline',
          id: `gateway-detail-${result.item.id}-${Date.now()}`,
          data: { product: result.item },
          _updated: Date.now()
        });
      }
    });

    return components;
  }, [config.maxRecommendations]);

  const sendMessageThroughGateway = useCallback(async (
    message: string,
    conversationId: string,
    userContext: any
  ): Promise<boolean> => {
    if (!shouldUseAIGateway()) return false;

    try {
      const [menuItems, products] = await Promise.all([
        catalogService.getAllMenuItems(),
        catalogService.getProducts()
      ]);

      const gatewayResponse = await aiGatewayClient.sendMessage({
        message,
        conversationId,
        userContext,
        business: appConfig?.business
          ? {
              name: appConfig.business.name,
              type: appConfig.business.type
            }
          : undefined,
        tenant: appConfig?.tenant,
        agents: appConfig?.agents,
        integrations: appConfig?.integrations,
        knowledgeBase: appConfig?.knowledgeBase || [],
        knowledgeSources: appConfig?.knowledgeSources || { urls: [], inlineText: '' },
        catalog: {
          menuItems: menuItems.slice(0, 100),
          products: products.slice(0, 100)
        }
      });

      const assistantMessage = messageService.createAssistantMessage(gatewayResponse.message);
      messageService.addMessage(assistantMessage);
      setMessages(messageService.getMessages());

      await messageService.trackMessage(
        assistantMessage,
        conversationId,
        userService.getUserContext()
      );
      if (config.enableDynamicComponents) {
        uiComponentService.addComponents(createGatewayUIComponents(gatewayResponse));
      }

      setAvailableActions(createGatewayActions(gatewayResponse));
      businessEventService.track('gateway_result', {
        mode: gatewayResponse.mode,
        agent: gatewayResponse.agent?.id,
        toolCalls: (gatewayResponse.toolCalls || []).map(toolCall => toolCall.name),
        toolCallCount: gatewayResponse.toolCalls?.length || 0
      });
      return true;
    } catch (error) {
      console.warn('[ChatContext] AI Gateway unavailable, falling back to current provider:', error);
      return false;
    }
  }, [
    aiGatewayClient,
    appConfig,
    config.enableDynamicComponents,
    createGatewayActions,
    createGatewayUIComponents,
    messageService,
    shouldUseAIGateway,
    uiComponentService,
    catalogService,
    userService
  ]);
  const handleSendMessage = useCallback(async () => {
    const conversationId = conversationManager.getCurrentConversationId();
    if (inputValue.trim() === '' || isTyping || !conversationId) return;
    
    const userMessageContent = inputValue;
    businessEventService.track('message_sent', {
      content: userMessageContent,
      length: userMessageContent.length
    });
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
      
      // Invia prima al nuovo AI Gateway; se non disponibile, usa il provider corrente.
      const handledByGateway = await sendMessageThroughGateway(
        userMessageContent,
        conversationId,
        extendedContext
      );

      if (!handledByGateway) {
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
      }
      
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
    aiService,
    sendMessageThroughGateway
  ]);
  
  const handleSuggestionClick = useCallback((suggestion: string) => {
    setInputValue(suggestion);
  }, []);
  
  const handleUIAction = useCallback(async (action: string, payload: any) => {
    businessEventService.track('ui_action', {
      action,
      id: payload?.id,
      type: payload?.type,
      name: payload?.name
    });
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






