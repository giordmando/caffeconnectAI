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
        await trackConversationMessage(
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

  const isProductionTenant = useCallback((): boolean => {
    const environment = String(appConfig?.tenant?.environment || '').toLowerCase();
    const plan = String(appConfig?.tenant?.plan || '').toLowerCase();
    return environment === 'production' || plan === 'pro' || plan === 'enterprise';
  }, [appConfig?.tenant]);

  const shouldShareRuntimeCatalog = useCallback((type: 'menu' | 'products'): boolean => {
    if (appConfig?.catalog?.enableLocalData) return false;
    return type === 'menu'
      ? Boolean(appConfig?.catalog?.menuEndpoint)
      : Boolean(appConfig?.catalog?.productsEndpoint);
  }, [appConfig?.catalog]);

  const dataGovernance = appConfig?.dataGovernance;
  const shouldPersistCustomerProfile = dataGovernance?.customerProfileStorage !== 'disabled';
  const shouldLearnSensitiveProfile = Boolean(dataGovernance?.allowSensitiveInference);
  const shouldTrackTranscript = dataGovernance?.conversationTranscript !== 'none';
  const analyticsMode = dataGovernance?.analyticsEvents || 'gateway-aggregate';

  const governanceUserContext = useCallback((context: any): any => {
    if (dataGovernance?.customerProfileStorage === 'disabled') {
      return {
        userId: context?.userId || 'anonymous',
        preferences: [],
        interactions: [],
        dietaryRestrictions: []
      };
    }

    if (dataGovernance?.allowSensitiveInference === false) {
      return {
        ...context,
        dietaryRestrictions: []
      };
    }

    return context;
  }, [dataGovernance?.allowSensitiveInference, dataGovernance?.customerProfileStorage]);

  const containsSensitivePreference = useCallback((message: string): boolean => {
    const lower = String(message || '').toLowerCase();
    return [
      'allerg',
      'intoller',
      'lattosio',
      'glutine',
      'celiach',
      'diabet',
      'salute',
      'medic',
      'malatt',
      'gravid',
      'relig',
      'halal',
      'kosher'
    ].some(term => lower.includes(term));
  }, []);

  const shouldStoreUserInteraction = useCallback((message: string): boolean => {
    if (!shouldPersistCustomerProfile) return false;
    if (dataGovernance?.allowSensitiveInference === false && containsSensitivePreference(message)) {
      return false;
    }
    return true;
  }, [containsSensitivePreference, dataGovernance?.allowSensitiveInference, shouldPersistCustomerProfile]);

  const createPrivacyGovernanceResponse = useCallback((message: string): string | null => {
    const lower = String(message || '').toLowerCase();
    const asksToRemember = [
      'ricorda',
      'ricordati',
      'ricordatelo',
      'tienilo a mente',
      'tienilo presente',
      'per le prossime volte',
      'per la prossima volta'
    ].some(term => lower.includes(term));

    if (!asksToRemember) return null;

    const storageDisabled = dataGovernance?.customerProfileStorage === 'disabled';
    const sensitive = containsSensitivePreference(message);
    const sensitiveInferenceDisabled = dataGovernance?.allowSensitiveInference === false;

    if (!storageDisabled && !(sensitive && sensitiveInferenceDisabled)) {
      return null;
    }

    const scope = storageDisabled
      ? 'non memorizzero preferenze per le prossime volte'
      : 'non memorizzero questa informazione come preferenza futura';

    if (lower.includes('lattosio')) {
      return `Posso tenerne conto per questa conversazione, ma ${scope}. Per opzioni senza lattosio posso consigliarti il cappuccino con bevanda d'avena o le proposte indicate come senza lattosio.`;
    }

    if (sensitive) {
      return `Posso usarlo solo per aiutarti in questa richiesta, ma ${scope}. Se hai allergie o intolleranze importanti, segnalalo anche al personale prima dell'ordine.`;
    }

    return `Posso aiutarti in questa conversazione, ma ${scope} con le impostazioni privacy attuali.`;
  }, [
    containsSensitivePreference,
    dataGovernance?.allowSensitiveInference,
    dataGovernance?.customerProfileStorage
  ]);

  const trackBusinessEvent = useCallback((
    type: Parameters<typeof businessEventService.track>[0],
    payload: Record<string, any> = {}
  ) => {
    if (analyticsMode === 'disabled') return;

    const mirrorGateway = analyticsMode !== 'local-only';
    const safePayload = analyticsMode === 'gateway-detailed'
      ? payload
      : Object.keys(payload).reduce((nextPayload, key) => {
          if (key === 'trace') return nextPayload;
          nextPayload[key] = key === 'content' ? '[redacted]' : payload[key];
          return nextPayload;
        }, {} as Record<string, any>);

    businessEventService.track(type, safePayload, { mirrorGateway });
  }, [analyticsMode]);

  const trackConversationMessage = useCallback(async (
    message: Message,
    conversationId: string,
    userContext: any,
    nlpAnalysis?: any
  ) => {
    if (!shouldTrackTranscript) return;

    await messageService.trackMessage(
      message,
      conversationId,
      governanceUserContext(userContext),
      nlpAnalysis
    );
  }, [governanceUserContext, messageService, shouldTrackTranscript]);

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
            type: result.products ? 'product' : 'menuItem',
            item
          }
        });
      });
    });

    return actions.slice(0, 6);
  }, []);

  const createGatewayMessageMetadata = useCallback((gatewayResponse: AIGatewayChatResponse): Message['metadata'] => {
    const toolNames = (gatewayResponse.toolCalls || []).map(toolCall => toolCall.name);
    const hasKnowledge = toolNames.some(name => ['knowledge_search', 'runtime_knowledge_search'].includes(name));
    const hasCatalog = toolNames.some(name => ['search_menu', 'search_products', 'get_item_detail'].includes(name));
    const userContext = governanceUserContext(userService.getUserContext());
    const trace: NonNullable<Message['metadata']>['trace'] = [];

    if (gatewayResponse.agent?.label) {
      trace.push({ label: 'Agente', value: gatewayResponse.agent.label.replace(' Agent', '') });
    }
    if (hasKnowledge) {
      trace.push({ label: 'Fonti', value: 'knowledge merchant' });
    }
    if (hasCatalog) {
      trace.push({ label: 'Catalogo', value: 'menu/prodotti reali' });
    }
    if ((userContext.preferences || []).length > 0 || (userContext.dietaryRestrictions || []).length > 0) {
      trace.push({ label: 'Profilo', value: 'preferenze cliente' });
    }
    if (toolNames.length > 0) {
      const readableTools = Array.from(new Set(toolNames)).map(toolName => {
        const labels: Record<string, string> = {
          runtime_knowledge_search: 'ricerca fonti merchant',
          knowledge_search: 'ricerca knowledge',
          search_menu: 'ricerca menu',
          search_products: 'ricerca prodotti',
          get_item_detail: 'dettaglio articolo',
          customer_profile: 'profilo cliente',
          create_order_draft: 'bozza ordine'
        };
        return labels[toolName] || toolName;
      });
      trace.push({ label: 'Azione', value: readableTools.join(', ') });
    }

    return {
      agent: gatewayResponse.agent,
      trace: trace.slice(0, 4)
    };
  }, [governanceUserContext, userService]);

  const createRecommendationExplanation = useCallback((
    recommendedItems: any[],
    gatewayResponse: AIGatewayChatResponse
  ): string | undefined => {
    const reasons = Array.from(new Set(
      recommendedItems
        .flatMap(item => item?.personalization?.reasons || [])
        .filter(Boolean)
    ));
    const userContext = governanceUserContext(userService.getUserContext());
    const restrictions = userContext.dietaryRestrictions || [];
    const usedKnowledge = (gatewayResponse.toolCalls || []).some(toolCall =>
      ['knowledge_search', 'runtime_knowledge_search'].includes(toolCall.name)
      && ((toolCall.result as any)?.results || []).length > 0
    );

    const parts: string[] = [];
    if (reasons.length > 0) {
      parts.push(`Ho dato priorita a opzioni ${reasons.slice(0, 2).join(' e ')}.`);
    }
    if (restrictions.length > 0) {
      parts.push(`Ho filtrato il catalogo considerando ${restrictions.join(', ')}.`);
    }
    if (usedKnowledge) {
      parts.push('Ho usato anche le fonti configurate dal locale.');
    }

    return parts.length > 0 ? parts.join(' ') : undefined;
  }, [governanceUserContext, userService]);

  const createGatewayUIComponents = useCallback((gatewayResponse: AIGatewayChatResponse): UIComponent[] => {
    const components: UIComponent[] = [];

    (gatewayResponse.toolCalls || []).forEach((toolCall, toolIndex) => {
      const result: any = toolCall.result || {};
      const items = result.items || [];
      const products = result.products || [];

      if (toolCall.name === 'search_menu' && items.length > 0) {
        const visibleItems = items.slice(0, config.maxRecommendations || 4);
        components.push({
          type: 'menuCarousel',
          placement: 'inline',
          id: `gateway-menu-${Date.now()}-${toolIndex}`,
          data: {
            recommendations: visibleItems.map((item: any, index: number) => ({
              id: item.id,
              name: item.name,
              confidence: Math.max(0.75, 0.95 - index * 0.05),
              item
            })),
            explanation: createRecommendationExplanation(visibleItems, gatewayResponse),
            timeOfDay: toolCall.arguments && typeof toolCall.arguments === 'object'
              ? (toolCall.arguments as any).timeOfDay || 'all'
              : 'all',
            category: 'all'
          },
          _updated: Date.now()
        });
      }

      if (toolCall.name === 'search_products' && products.length > 0) {
        const visibleProducts = products.slice(0, config.maxRecommendations || 4);
        components.push({
          type: 'productCarousel',
          placement: 'inline',
          id: `gateway-products-${Date.now()}-${toolIndex}`,
          data: {
            recommendations: visibleProducts.map((product: any, index: number) => ({
              id: product.id,
              name: product.name,
              confidence: Math.max(0.75, 0.95 - index * 0.05),
              item: product
            })),
            explanation: createRecommendationExplanation(visibleProducts, gatewayResponse),
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
  }, [config.maxRecommendations, createRecommendationExplanation]);

  const sendMessageThroughGateway = useCallback(async (
    message: string,
    conversationId: string,
    userContext: any
  ): Promise<boolean> => {
    if (!shouldUseAIGateway()) return false;

    try {
      const [menuItems, products] = await Promise.all([
        shouldShareRuntimeCatalog('menu') ? catalogService.getAllMenuItems() : Promise.resolve([]),
        shouldShareRuntimeCatalog('products') ? catalogService.getProducts() : Promise.resolve([])
      ]);

      const gatewayResponse = await aiGatewayClient.sendMessage({
        message,
        conversationId,
        userContext: governanceUserContext(userContext),
        business: appConfig?.business
          ? {
              name: appConfig.business.name,
              type: appConfig.business.type
            }
          : undefined,
        tenant: appConfig?.tenant,
        dataGovernance: appConfig?.dataGovernance,
        agents: appConfig?.agents,
        integrations: appConfig?.integrations,
        knowledgeBase: appConfig?.knowledgeBase || [],
        knowledgeSources: appConfig?.knowledgeSources || { urls: [], inlineText: '' },
        merchantKnowledge: appConfig?.merchantKnowledge || { sources: [] },
        catalog: {
          menuItems: menuItems.slice(0, 100),
          products: products.slice(0, 100)
        }
      });

      (gatewayResponse.cartOperations || []).forEach(operation => {
        if (operation.action !== 'add' || !operation.item) return;
        addItem(operation.item, operation.itemType);
        trackBusinessEvent('add_to_cart', {
          id: operation.item.id,
          name: operation.item.name,
          type: operation.itemType,
          quantity: operation.quantity || 1,
          price: operation.item.price,
          reason: 'ai_gateway_cart_operation'
        });
      });

      const messageMetadata = createGatewayMessageMetadata(gatewayResponse);
      const assistantMessage = messageService.createAssistantMessage(
        gatewayResponse.message,
        messageMetadata
      );
      messageService.addMessage(assistantMessage);
      setMessages(messageService.getMessages());

      await trackConversationMessage(
        assistantMessage,
        conversationId,
        userService.getUserContext()
      );
      if (config.enableDynamicComponents) {
        uiComponentService.addComponents(createGatewayUIComponents(gatewayResponse));
      }

      setAvailableActions(createGatewayActions(gatewayResponse));
      trackBusinessEvent('gateway_result', {
        mode: gatewayResponse.mode,
        agent: gatewayResponse.agent?.id,
        trace: messageMetadata?.trace,
        toolCalls: (gatewayResponse.toolCalls || []).map(toolCall => toolCall.name),
        toolCallCount: gatewayResponse.toolCalls?.length || 0
      });
      return true;
    } catch (error) {
      console.warn('[ChatContext] AI Gateway unavailable:', error);
      const assistantMessage = messageService.createAssistantMessage(
        'Ho un problema temporaneo nel collegamento con l assistente AI. Riprova tra poco: preferisco non darti una risposta parziale o fuori contesto.'
      );
      messageService.addMessage(assistantMessage);
      setMessages(messageService.getMessages());
      await trackConversationMessage(assistantMessage, conversationId, userService.getUserContext());
      return true;
    }
  }, [
    aiGatewayClient,
    addItem,
    appConfig,
    config.enableDynamicComponents,
    createGatewayActions,
    createGatewayUIComponents,
    createGatewayMessageMetadata,
    messageService,
    shouldUseAIGateway,
    uiComponentService,
    catalogService,
    userService,
    shouldShareRuntimeCatalog,
    governanceUserContext,
    trackBusinessEvent,
    trackConversationMessage
  ]);
  const handleSendMessage = useCallback(async () => {
    const conversationId = conversationManager.getCurrentConversationId();
    if (inputValue.trim() === '' || isTyping || !conversationId) return;
    
    const userMessageContent = inputValue;
    trackBusinessEvent('message_sent', {
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
    await trackConversationMessage(
      userMessage,
      conversationId,
      userService.getUserContext(),
      nlpAnalysis
    );
    
    // Aggiungi interazione
    if (shouldStoreUserInteraction(userMessageContent)) {
      userService.addInteraction(userMessageContent);
    }
    if (shouldStoreUserInteraction(userMessageContent) && shouldLearnSensitiveProfile) {
      userService.learnFromInteraction(userMessageContent);
    }

    const privacyGovernanceResponse = createPrivacyGovernanceResponse(userMessageContent);
    if (privacyGovernanceResponse) {
      const assistantMessage = messageService.createAssistantMessage(privacyGovernanceResponse);
      messageService.addMessage(assistantMessage);
      setMessages(messageService.getMessages());
      await trackConversationMessage(assistantMessage, conversationId, userService.getUserContext());
      setIsTyping(false);
      return;
    }
    
    try {
      // Prepara contesto per AI
      const userCtx = userService.getUserContext();
      const aiContextForAnalytics = conversationTracker 
        ? await conversationTracker.getUserContext(userCtx.userId) 
        : {};
      const extendedContext = governanceUserContext({ ...userCtx, aiContext: aiContextForAnalytics });
      
      // Invia prima al nuovo AI Gateway; se non disponibile, usa il provider corrente.
      const handledByGateway = await sendMessageThroughGateway(
        userMessageContent,
        conversationId,
        extendedContext
      );

      if (!handledByGateway) {
        const assistantMessage = messageService.createAssistantMessage(
          'Il gateway AI centrale non e attivo. Per questa chat serve abilitarlo: non uso risposte locali o provider alternativi.'
        );
        messageService.addMessage(assistantMessage);
        setMessages(messageService.getMessages());
        await trackConversationMessage(assistantMessage, conversationId, userService.getUserContext());
        setAvailableActions([]);
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
    createPrivacyGovernanceResponse,
    sendMessageThroughGateway,
    governanceUserContext,
    shouldLearnSensitiveProfile,
    shouldStoreUserInteraction,
    trackBusinessEvent,
    trackConversationMessage
  ]);
  
  const handleSuggestionClick = useCallback((suggestion: string) => {
    setInputValue(suggestion);
  }, []);
  
  const handleUIAction = useCallback(async (action: string, payload: any) => {
    trackBusinessEvent('ui_action', {
      action,
      id: payload?.id,
      type: payload?.type,
      name: payload?.name
    });
    await actionHandler.handleAction(action, payload);
    setMessages(messageService.getMessages());
  }, [actionHandler, messageService, trackBusinessEvent]);
  
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






