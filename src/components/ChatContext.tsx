// src/components/ChatContext.tsx - Versione aggiornata con sistema unificato
import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Message } from '../types/Message';
import { UIComponent } from '../types/UI';
import { IConversationTracker } from '../services/analytics/interfaces/IConversationTracker';
import { nlpIntegrationService } from '../services/analytics/nlp/NLPIntegrationService';
import { AnalysisType } from '../services/analytics/nlp/interfaces/INLPService';
import { useServices } from '../contexts/ServiceProvider';
import { AppConfig, ChatConfig } from '../config/interfaces/IAppConfig';
import { useCart } from '../hooks/useCart';
import { ComponentManager } from '../services/ui/compstore/ComponentManager';
import { componentFactory } from '../services/ui/component/ComponentFactory';

// Definizione del contesto della chat aggiornato
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
  handleSuggestionClick: (suggestion: string) => void;
  handleUIAction: (action: string, payload: any) => void;
  availableActions: any[];
  componentManager: ComponentManager; // Aggiornato al nuovo tipo
  uiComponentsUpdated: number;
  conversationId: string | null;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{
  children: React.ReactNode;
  initialConfig?: Partial<ChatConfig>;
}> = ({ children, initialConfig = {} }) => {
  const { 
    aiService, 
    userService, 
    suggestionService, 
    functionRegistry, 
    catalogService, 
    conversationTracker, 
    appConfig 
  } = useServices();
  
  const { addItem } = useCart();

  // Usa il nuovo component manager semplificato con regole custom
  const componentManager = useMemo(() => {
    // Verifica se aiService ha il metodo getComponentManager
    if (aiService && 'getComponentManager' in aiService) {
      return (aiService as any).getComponentManager();
    }
    // Fallback: crea un nuovo ComponentManager se l'AIService non lo fornisce
    console.warn('AIService does not provide ComponentManager, creating new instance');
    return new ComponentManager();
  }, [aiService]);

  // Cleanup periodico dei componenti vecchi
  useEffect(() => {
    const cleanup = setInterval(() => {
      componentManager.cleanupOldComponents(3600000); // 1 ora
    }, 300000); // ogni 5 minuti
    
    return () => clearInterval(cleanup);
  }, [componentManager]);

  const [config, setConfig] = useState<ChatConfig>(() => ({
    showSidebar: appConfig?.ui?.showSidebar ?? true,
    enableSuggestions: appConfig?.ui?.enableSuggestions ?? true,
    enableDynamicComponents: appConfig?.ui?.enableDynamicComponents ?? true,
    enableNLP: appConfig?.ui?.enableNLP ?? false,
    maxRecommendations: appConfig?.ui?.maxRecommendations ?? 3,
    welcomeMessage: appConfig?.ui?.welcomeMessage 
      ? interpolateConfig(appConfig.ui.welcomeMessage, appConfig as AppConfig) 
      : "Benvenuto! Come posso aiutarti?",
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
  const [uiComponentsUpdated, setUIComponentsUpdated] = useState<number>(0);

  const messagesEndRef = useRef<HTMLDivElement>(null!);

  const updateConfig = (newConfig: Partial<ChatConfig>) => {
    setConfig((prev: ChatConfig) => ({ ...prev, ...newConfig }));
  };

  // Inizializzazione conversazione
  useEffect(() => {
    const initializeConversation = async () => {
      if (conversationTracker && !currentConversationId) {
        try {
          const newConvId = await conversationTracker.startConversation(
            userService.getUserContext().userId
          );
          setCurrentConversationId(newConvId);
          console.log('[ChatContext] Conversation started with ID:', newConvId);
        } catch (error) {
          console.error('[ChatContext] Error starting conversation:', error);
        }
      }
    };
    initializeConversation();
  }, [conversationTracker, userService, currentConversationId]);

  // Inizializzazione NLP
  useEffect(() => {
    if (config.enableNLP && !isNLPInitialized) {
      nlpIntegrationService.initialize().then(() => {
        setIsNLPInitialized(nlpIntegrationService.isServiceInitialized());
        console.log('[ChatContext] NLP Service initialized.');
      }).catch(error => {
        console.error('[ChatContext] Error initializing NLP service:', error);
        setIsNLPInitialized(false);
      });
    }
  }, [config.enableNLP, isNLPInitialized]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, uiComponentsUpdated]);

  // Messaggio di benvenuto
  useEffect(() => {
    const loadWelcomeMessage = async () => {
      if (messages.length > 0 || !appConfig) return;
      
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
          const initialSuggestions = await suggestionService.getSuggestedPrompts(
            welcomeMsg, 
            userService.getUserContext()
          );
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
    componentManager.clearComponents();
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

  const trackMessage = useCallback(async (
    messageContent: string, 
    role: 'user' | 'assistant', 
    nlpAnalysis: any, 
    convId: string, 
    tracker: IConversationTracker
  ) => {
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
    const userMessage: Message = { 
      role: 'user', 
      content: userMessageContent, 
      timestamp: Date.now() 
    };

    addMessage(userMessage);
    setInputValue('');
    setIsTyping(true);
    setSuggestedPrompts([]);

    let nlpAnalysis = null;
    
    if (config.enableNLP) {
      nlpAnalysis = await analyzeMessage(userMessageContent);
      
      if (nlpAnalysis) {
        const newNLPComponents = nlpIntegrationService.generateNLPBasedComponents(
          userMessage, 
          nlpAnalysis
        );
        
        if (newNLPComponents.length > 0) {
          const nlpPanelComponent = componentFactory.createUIComponent(
            'nlpInsightsPanel',
            {
              components: newNLPComponents,
              analysis: nlpAnalysis,
              message: userMessage.content
            },
            'sidebar'
          );
          
          if (nlpPanelComponent) {
            componentManager.addComponent(nlpPanelComponent);
          }
        }
        
      }
    }

    await trackMessage(userMessageContent, 'user', nlpAnalysis, currentConversationId, conversationTracker);
    userService.addInteraction(userMessageContent);

    try {
      const userCtx = userService.getUserContext();
      const aiContextForAnalytics = conversationTracker 
        ? await conversationTracker.getUserContext(userCtx.userId) 
        : {};
      const extendedContext = { ...userCtx, aiContext: aiContextForAnalytics };

      const response = await aiService.sendMessage(userMessageContent, extendedContext);
      addMessage(response.message);
      await trackMessage(response.message.content, 'assistant', null, currentConversationId, conversationTracker);

      if (response.uiComponents && config.enableDynamicComponents) {
        console.log("[ChatContext] AI response included UI components:", response.uiComponents);
        
        // Usa il sistema unificato per aggiungere componenti
        response.uiComponents.forEach(comp => {
          componentManager.addComponent(comp);
        });
        
        setUIComponentsUpdated(prev => prev + 1);
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
    
    if (action === 'execute_function') {
      const { functionName, parameters } = payload;
      setIsTyping(true);
      try {
        const result = await functionRegistry.executeFunction(functionName, parameters);

        let assistantResponseContent = `Azione ${functionName} processata.`;

        if (result.message) {
          assistantResponseContent = result.message;
        } else if (result.success && result.data?.message) {
          assistantResponseContent = result.data.message;
        } else if (!result.success && result.error) {
          assistantResponseContent = `Errore nell'eseguire ${functionName}: ${result.error}`;
        }
        
        addMessage({ role: 'assistant', content: assistantResponseContent, timestamp: Date.now() });
        
        if (currentConversationId && conversationTracker) {
          await trackMessage(assistantResponseContent, 'assistant', null, currentConversationId, conversationTracker);
        }

        // Gestione componente UI dal risultato della funzione
        if (result.success && result.data?.uiComponent && config.enableDynamicComponents) {
          const uiComponentDataFromFunc = result.data.uiComponent;
          const componentDataForFactory = uiComponentDataFromFunc.data;

          if (uiComponentDataFromFunc.type === 'productDetail' && 
              (!componentDataForFactory || !componentDataForFactory.id || !componentDataForFactory.name || typeof componentDataForFactory.category !== 'string')) {
            console.warn('[ChatContext] Dati insufficienti per ProductDetailComponent:', componentDataForFactory);
          } else {
            const newComponentToAdd: UIComponent = {
              type: uiComponentDataFromFunc.type,
              data: componentDataForFactory,
              id: `${uiComponentDataFromFunc.type}-${componentDataForFactory.id}-${Date.now()}`,
              placement: uiComponentDataFromFunc.placement || 'inline',
              _updated: Date.now(),
            };
            console.log('[ChatContext] Aggiunta componente da risultato funzione:', newComponentToAdd);
            componentManager.addComponent(newComponentToAdd);
            setUIComponentsUpdated(prev => prev + 1);
          }
        }
      } catch (error) {
        console.error(`[ChatContext] Errore durante 'execute_function' per ${functionName}:`, error);
        const errorMsg = `Mi dispiace, si è verificato un errore durante l'elaborazione.`;
        addMessage({ role: 'assistant', content: errorMsg, timestamp: Date.now() });
        if (currentConversationId && conversationTracker) {
          await trackMessage(errorMsg, 'assistant', null, currentConversationId, conversationTracker);
        }
      } finally {
        setIsTyping(false);
      }
      return; 
    }
    // Gestione altre azioni UI
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

      if (itemDetails && config.enableDynamicComponents) {
        const productDetailComponent = componentFactory.createUIComponent(
          'productDetail',
          { product: itemDetails },
          'inline'
        );
        
        if (productDetailComponent) {
          console.log('[ChatContext] Creating ProductDetailComponent for view_item:', productDetailComponent);
          componentManager.addComponent(productDetailComponent);
          setUIComponentsUpdated(prev => prev + 1);
        }

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
      // Gestione carrello
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
          console.error("[ChatContext] Error fetching item details:", e);
          itemName = itemName || 'Item Sconosciuto';
          itemCategory = itemCategory || 'Categoria Sconosciuta';
        }
      }
      
      // Aggiungi al carrello
      addItem(payload, itemType);
      
      const confirmationMsg = `Ok, ${itemName} è stato aggiunto al tuo carrello!`;
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

    // Gestione azioni NLP
    if (action === 'topic_selected') {
      const topicMsg = `Parliamo di più di ${payload.topic.name}. Cosa vorresti sapere?`;
      setInputValue(topicMsg);
    } else if (action === 'intent_selected') {
      const intentMsg = `${payload.intent.name || payload.intent.category}`;
      setInputValue(intentMsg);
    }
  }, [config, currentConversationId, conversationTracker, userService, aiService, functionRegistry, catalogService, componentManager, addItem]);

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
    handleSuggestionClick,
    handleUIAction,
    availableActions,
    componentManager,
    uiComponentsUpdated,
    conversationId: currentConversationId,
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

function interpolateConfig(text: string, config: AppConfig | null): string {
  if (!text || !config) return text || '';
  return text.replace(/\{business\.name\}/g, config.business?.name || 'il nostro locale');
}