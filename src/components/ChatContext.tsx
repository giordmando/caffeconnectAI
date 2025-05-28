import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Message } from '../types/Message';
import { UIComponent } from '../types/UI';
import { IConversationTracker } from '../services/analytics/interfaces/IConversationTracker';
import { nlpIntegrationService } from '../services/analytics/nlp/NLPIntegrationService';
import { AnalysisType } from '../services/analytics/nlp/interfaces/INLPService';
import { useServices } from '../contexts/ServiceProvider';
import { ComponentManager } from '../services/ui/ComponentManager';
import { AppConfig, ChatConfig } from '../config/interfaces/IAppConfig'; // Importa ChatConfig da IAppConfig

// Definizione del contesto della chat
export interface ChatContextType {
  config: ChatConfig;
  updateConfig: (newConfig: Partial<ChatConfig>) => void;
  messages: Message[];
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  inputValue: string;
  setInputValue: (input: string) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleSendMessage: () => Promise<void>;
  isTyping: boolean;
  suggestedPrompts: string[];
  nlpComponents: UIComponent[];
  handleSuggestionClick: (suggestion: string) => void;
  handleUIAction: (action: string, payload: any) => void;
  availableActions: any[];
  componentManager: ComponentManager;
  uiComponentsUpdated: number;
  conversationId: string | null;
  isNLPInitialized: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{
  children: React.ReactNode;
  initialConfig?: Partial<ChatConfig>; // Usa Partial<ChatConfig> per initialConfig
}> = ({ children, initialConfig = {} }) => {
  const { aiService, userService, suggestionService, functionRegistry, catalogService, conversationTracker, appConfig } = useServices();

  const [config, setConfig] = useState<ChatConfig>(() => ({
    showSidebar: appConfig?.ui?.showSidebar ?? true,
    enableSuggestions: appConfig?.ui?.enableSuggestions ?? true,
    enableDynamicComponents: appConfig?.ui?.enableDynamicComponents ?? true,
    enableNLP: appConfig?.ui?.enableNLP ?? false,
    maxRecommendations: appConfig?.ui?.maxRecommendations ?? 3,
    welcomeMessage: appConfig?.ui?.welcomeMessage ? interpolateConfig(appConfig.ui.welcomeMessage, appConfig as AppConfig) : "Benvenuto! Come posso aiutarti?",
    ...initialConfig
  }));

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [nlpComponents, setNLPComponents] = useState<UIComponent[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isNLPInitialized, setIsNLPInitialized] = useState<boolean>(false);
  const [availableActions, setAvailableActions] = useState<any[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null!);

  const componentManager = useMemo(() => new ComponentManager(), []);
  const [uiComponentsUpdated, setUIComponentsUpdated] = useState<number>(0);

  const updateConfig = (newConfig: Partial<ChatConfig>) => {
    setConfig((prev: ChatConfig) => ({ ...prev, ...newConfig })); // Tipo esplicito per prev
  };

  useEffect(() => {
    const initializeConversation = async () => {
      if (conversationTracker && !currentConversationId) {
        try {
          const newConvId = await conversationTracker.startConversation(userService.getUserContext().userId);
          setCurrentConversationId(newConvId);
          console.log('[ChatContext] Conversation started with ID:', newConvId);
        } catch (error) {
          console.error('[ChatContext] Error starting conversation:', error);
        }
      }
    };
    initializeConversation();
  }, [conversationTracker, userService, currentConversationId]);


  useEffect(() => {
    if (config.enableNLP && !isNLPInitialized) {
      nlpIntegrationService.initialize().then(() => {
        setIsNLPInitialized(nlpIntegrationService.isServiceInitialized());
        console.log('[ChatContext] NLP Service initialized via ChatContext effect.');
      }).catch(error => {
        console.error('[ChatContext] Error initializing NLP service via ChatContext effect:', error);
        setIsNLPInitialized(false);
      });
    }
  }, [config.enableNLP, isNLPInitialized]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, uiComponentsUpdated]);

  useEffect(() => {
    const loadWelcomeMessage = async () => {
      if (messages.length > 0 || !appConfig) return; // Non caricare se ci sono già messaggi o appConfig non è pronto
      setIsTyping(true);
      const welcomeMsgContent = config.welcomeMessage || "Benvenuto! Come posso aiutarti?";
      const welcomeMsg: Message = {
        role: 'assistant',
        content: welcomeMsgContent,
        timestamp: Date.now()
      };
      setMessages([welcomeMsg]);
      if (config.enableSuggestions) {
        try {
            const initialSuggestions = await suggestionService.getSuggestedPrompts(welcomeMsg, userService.getUserContext());
            setSuggestedPrompts(initialSuggestions);
        } catch (e) {
            console.error("Error getting initial suggestions:", e);
            setSuggestedPrompts([]);
        }
      }
      userService.addInteraction(welcomeMsgContent);
      if (currentConversationId && conversationTracker) {
        await trackMessage(welcomeMsgContent, 'assistant', null, currentConversationId, conversationTracker);
      }
      setIsTyping(false);
    };
    if (appConfig) {
        loadWelcomeMessage();
    }
  }, [appConfig, userService, suggestionService, config.welcomeMessage, config.enableSuggestions, currentConversationId, conversationTracker, messages.length]);


  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  const clearMessages = () => {
    setMessages([]);
    componentManager.getAllComponents().forEach(c => componentManager.removeComponent(c.id));
    setUIComponentsUpdated(prev => prev + 1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const trackMessage = useCallback(async (messageContent: string, role: 'user' | 'assistant', nlpAnalysis: any, convId: string, tracker: IConversationTracker) => {
    if (!convId || !tracker) {
      console.warn('[ChatContext] trackMessage: conversationId or tracker not available.');
      return;
    }
    try {
      const eventData: any = { role, content: messageContent, timestamp: Date.now() };
      if (nlpAnalysis && config.enableNLP) {
        eventData.nlpData = {
          sentiment: nlpAnalysis[AnalysisType.SENTIMENT]?.[0] || null,
          intents: nlpAnalysis[AnalysisType.INTENT] || [],
          topics: nlpAnalysis[AnalysisType.TOPIC] || [],
        };
      }
      await tracker.trackEvent({
        type: 'message',
        conversationId: convId,
        data: eventData,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('[ChatContext] Error tracking message:', error);
    }
  }, [config.enableNLP]);

  const analyzeMessage = useCallback(async (message: string): Promise<any> => {
    if (!isNLPInitialized || !config.enableNLP || !nlpIntegrationService) {
      return null;
    }
    try {
      return await nlpIntegrationService.analyzeUserMessage(message);
    } catch (error) {
      console.error('[ChatContext] Error analyzing NLP message:', error);
      return null;
    }
  }, [isNLPInitialized, config.enableNLP]);

  const handleSendMessage = async () => {
    if (inputValue.trim() === '' || isTyping || !currentConversationId || !conversationTracker) return;

    const userMessageContent = inputValue;
    const userMessage: Message = { role: 'user', content: userMessageContent, timestamp: Date.now() };

    addMessage(userMessage);
    setInputValue('');
    setIsTyping(true);
    setSuggestedPrompts([]);

    let nlpAnalysis = null;
    if (config.enableNLP) {
      nlpAnalysis = await analyzeMessage(userMessageContent);
      if (nlpAnalysis) {
        const newNLPComponents = nlpIntegrationService.generateNLPBasedComponents(userMessage, nlpAnalysis);
        setNLPComponents(newNLPComponents);
      }
    }

    await trackMessage(userMessageContent, 'user', nlpAnalysis, currentConversationId, conversationTracker);
    userService.addInteraction(userMessageContent);

    try {
      const userCtx = userService.getUserContext();
      const aiContextForAnalytics = conversationTracker ? await conversationTracker.getUserContext(userCtx.userId) : {};
      const extendedContext = { ...userCtx, aiContext: aiContextForAnalytics };

      const response = await aiService.sendMessage(userMessageContent, extendedContext);
      addMessage(response.message);
      await trackMessage(response.message.content, 'assistant', null, currentConversationId, conversationTracker);

      if (response.uiComponents && config.enableDynamicComponents) {
        console.log("[ChatContext] AI response included UI components:", response.uiComponents);
        response.uiComponents.forEach(comp => {
            if (comp.type === 'productDetail' && comp.data?.product?.id) {
                comp.id = `product-detail-${comp.data.product.id}`;
            } else if (!comp.id) {
                comp.id = `${comp.type}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
            }
            comp._updated = Date.now();
            componentManager.addComponent(comp);
        });
        setUIComponentsUpdated(prev => prev + 1);
      } else {
        console.log("[ChatContext] AI response did not include UI components or dynamic components are disabled.");
      }

      if (response.suggestedPrompts && config.enableSuggestions) {
        setSuggestedPrompts(response.suggestedPrompts);
      }
      if (response.availableActions) {
        setAvailableActions(response.availableActions);
      } else {
        setAvailableActions([]);
      }

    } catch (error) {
      console.error('[ChatContext] Error sending message to AI:', error);
      addMessage({
        role: 'assistant',
        content: 'Mi dispiace, ho avuto un problema. Riprova.',
        timestamp: Date.now()
      });
    }
    setIsTyping(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
  };

  const handleUIAction = useCallback(async (action: string, payload: any) => {
    console.log(`[ChatContext] UI Action received: ${action}`, payload);
    const currentConfig = config;

    if (action === 'execute_function') {
      const { functionName, parameters } = payload;
      setIsTyping(true);
      try {
        const result = await functionRegistry.executeFunction(functionName, parameters);

        let assistantResponseContent = `Azione ${functionName} processata.`; // Default message

        if (result.message) { // Usa sempre il messaggio fornito dalla funzione se disponibile
            assistantResponseContent = result.message;
        } else if (result.success && result.data?.message) { // Vecchio fallback
            assistantResponseContent = result.data.message;
        } else if (!result.success && result.error) {
            assistantResponseContent = `Errore nell'eseguire ${functionName}: ${result.error}`;
        }
        
        addMessage({ role: 'assistant', content: assistantResponseContent, timestamp: Date.now() });
        if (currentConversationId && conversationTracker) {
            await trackMessage(assistantResponseContent, 'assistant', null, currentConversationId, conversationTracker);
        }

        // Aggiungi il componente UI SOLO se la funzione ha avuto successo E ha fornito i dati uiComponent
        if (result.success && result.data?.uiComponent) {
          const uiComponentDataFromFunc = result.data.uiComponent; // Prendi direttamente l'oggetto uiComponent
          if (config.enableDynamicComponents) { // Usa config dallo stato di ChatContext
            const componentDataForFactory = uiComponentDataFromFunc.data; // Questo è l'oggetto 'item'

            // Valida che i dati per ProductDetailComponent siano sufficienti
            if (uiComponentDataFromFunc.type === 'productDetail' && 
                (!componentDataForFactory || !componentDataForFactory.id || !componentDataForFactory.name || typeof componentDataForFactory.category !== 'string')) {
              console.warn('[ChatContext] Dati insufficienti o non validi per creare ProductDetailComponent da risultato funzione:', componentDataForFactory);
              // Non creare il componente se i dati essenziali mancano
            } else {
              const newComponentToAdd: UIComponent = {
                type: uiComponentDataFromFunc.type,
                data: componentDataForFactory, // Passa direttamente l'oggetto item (prodotto/menu)
                // Assicura un ID univoco per il componente UI, anche se l'item viene mostrato più volte
                id: `${uiComponentDataFromFunc.type}-${componentDataForFactory.id}-${Date.now()}`,
                placement: uiComponentDataFromFunc.placement || 'inline',
                _updated: Date.now(),
              };
              console.log('[ChatContext] Aggiunta componente da risultato funzione a ComponentManager:', newComponentToAdd);
              componentManager.addComponent(newComponentToAdd);
              setUIComponentsUpdated(prev => prev + 1);
            }
          }
        } else if (!result.success) {
            console.warn(`[ChatContext] La funzione ${functionName} non ha avuto successo o non ha fornito uiComponent. Dettagli:`, result);
        }

      } catch (error) {
        console.error(`[ChatContext] Errore critico durante 'execute_function' per ${functionName}:`, error);
        const errorMsg = `Mi dispiace, si è verificato un errore imprevisto durante l'elaborazione della tua azione.`;
        addMessage({ role: 'assistant', content: errorMsg, timestamp: Date.now() });
        if (currentConversationId && conversationTracker) {
            await trackMessage(errorMsg, 'assistant', null, currentConversationId, conversationTracker);
        }
      } finally {
        setIsTyping(false);
      }
      return; 
    }

    if (action === 'view_item') {
        const itemType = payload.type as 'menuItem' | 'product';
        let itemDetails = null;
        try {
            itemDetails = itemType === 'menuItem'
            ? await catalogService.getMenuItemById(payload.id)
            : await catalogService.getProductById(payload.id);
        } catch (e) {
            console.error("Error fetching item details for view_item:", e);
        }

        if (itemDetails && currentConfig.enableDynamicComponents) {
            const productDetailComponentData = {
                type: 'productDetail',
                data: { product: itemDetails },
                id: `product-detail-${itemDetails.id}`,
                placement: 'inline',
                _updated: Date.now(),
            };
            console.log('[ChatContext] Creating ProductDetailComponent for view_item:', productDetailComponentData);
            componentManager.addComponent(productDetailComponentData);
            setUIComponentsUpdated(prev => prev + 1);

            const detailMsg = `Ecco i dettagli per ${itemDetails.name}.`;
            addMessage({ role: 'assistant', content: detailMsg, timestamp: Date.now() });
            if (currentConversationId && conversationTracker) {
                await trackMessage(detailMsg, 'assistant', null, currentConversationId, conversationTracker);
            }

        } else {
            const errorMsg = `Non ho trovato i dettagli per l'item selezionato.`;
            addMessage({ role: 'assistant', content: errorMsg, timestamp: Date.now() });
            if (currentConversationId && conversationTracker) {
                await trackMessage(errorMsg, 'assistant', null, currentConversationId, conversationTracker);
            }
        }
    } else if (['order_item', 'buy_item', 'add_to_cart'].includes(action)) {
        let itemName = payload.name;
        let itemCategory = payload.category;
        const itemType = payload.type as 'menuItem' | 'product';

        if (!itemName || !itemCategory) {
            try {
                const itemDetails = itemType === 'menuItem'
                ? await catalogService.getMenuItemById(payload.id)
                : await catalogService.getProductById(payload.id);
                if (itemDetails) {
                itemName = itemDetails.name;
                itemCategory = itemDetails.category;
                } else {
                itemName = itemName || 'Item Sconosciuto';
                itemCategory = itemCategory || 'Categoria Sconosciuta';
                }
            } catch (e) {
                console.error("[ChatContext] Errore nel recuperare dettagli item per tracking/preferenza:", e);
                itemName = itemName || 'Item Sconosciuto';
                itemCategory = itemCategory || 'Categoria Sconosciuta';
            }
        }
        const confirmationMsg = `Ok, ${itemName} è stato aggiunto al tuo ordine!`;
        addMessage({ role: 'assistant', content: confirmationMsg, timestamp: Date.now() });
        if (currentConversationId && conversationTracker) {
            await trackMessage(confirmationMsg, 'assistant', null, currentConversationId, conversationTracker);
        }

        userService.updatePreference({
            itemId: payload.id,
            itemName: itemName,
            itemType: itemType,
            itemCategory: itemCategory,
            rating: 4,
            timestamp: Date.now()
        });
    }

    if (action === 'topic_selected') {
      const topicMsg = `Parliamo di più di ${payload.topic.name}. Cosa vorresti sapere?`;
      setInputValue(topicMsg);
    } else if (action === 'intent_selected') {
      const intentMsg = `${payload.intent.name || payload.intent.category}`;
      setInputValue(intentMsg);
    }
  }, [config, currentConversationId, conversationTracker, userService, aiService, functionRegistry, catalogService, componentManager, analyzeMessage, trackMessage, addMessage]);


  const contextValue: ChatContextType = {
    config,
    updateConfig,
    messages,
    addMessage,
    clearMessages,
    inputValue,
    setInputValue,
    handleInputChange,
    handleKeyDown,
    handleSendMessage,
    isTyping,
    suggestedPrompts,
    nlpComponents,
    handleSuggestionClick,
    handleUIAction,
    availableActions,
    componentManager,
    uiComponentsUpdated,
    conversationId: currentConversationId,
    isNLPInitialized,
    messagesEndRef,
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

function interpolateConfig(text: string, config: AppConfig | null): string { // Accetta AppConfig | null
    if (!text || !config) return text || ''; // Gestisce config null
    return text.replace(/\{business\.name\}/g, config.business?.name || 'il nostro locale');
}
