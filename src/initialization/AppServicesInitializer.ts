import { configManager } from '../config/ConfigManager';
import { IConfigManager } from '../config/interfaces/IConfigManager';
import { themeService } from '../services/theme/ThemeService';
import { IThemeService } from '../services/theme/interfaces/IThemeService';
import { catalogService } from '../services/catalog/CatalogService';
import { ICatalogService } from '../services/catalog/interfaces/ICatalogService';
import { functionRegistry } from '../services/function/FunctionRegistry';
import { IFunctionService } from '../services/function/interfaces/IFunctionService';
import { userContextService } from '../services/user/UserContextService';
import { IUserContextService } from '../services/user/interfaces/IUserContextService';
import { retrievalService } from '../services/prompt/retrieval/RetrievalService';
import { InMemoryVectorStore } from '../services/prompt/retrieval/stores/InMemoryVectorStore';
import { setupPrompts } from '../services/prompt/setupPrompts';
import { promptService } from '../services/prompt/PromptService';
import { nlpIntegrationService, NLPIntegrationService as NLPIntegrationServiceClass } from '../services/analytics/nlp/NLPIntegrationService';
import { AnalyticsService } from '../services/analytics/AnalyticsService';
import { IAnalyticsService } from '../services/analytics/interfaces/IAnalyticsService';
import { SimpleConsentService } from '../services/analytics/SimpleConsentService';
import { IConsentService } from '../services/analytics/interfaces/IConsentService';
import { EnhancedAIServiceFactory } from '../services/ai/EnhancedAIServiceFactory';
import { IAIService } from '../services/ai/interfaces/IAIService';
import { ISuggestionService } from '../services/action/interfaces/ISuggestionService';
import { IActionService } from '../services/action/interfaces/IActionService';
import { AIProviderConfig } from '../types/AIProvider';
import { getConversationTracker } from '../services/analytics/setupAnalytics';
import { IConversationTracker } from '../services/analytics/interfaces/IConversationTracker';
import { AppConfig } from '../config/interfaces/IAppConfig';

export interface InitializedServices {
  configManager: IConfigManager;
  themeService: IThemeService;
  catalogService: ICatalogService;
  functionRegistry: IFunctionService;
  userService: IUserContextService;
  retrievalService: typeof retrievalService;
  promptService: typeof promptService;
  nlpService: NLPIntegrationServiceClass;
  analyticsService: IAnalyticsService;
  consentService: IConsentService;
  aiService: IAIService;
  suggestionService: ISuggestionService;
  actionService: IActionService;
  conversationTracker: IConversationTracker;
  currentAiProvider: string; // Manteniamo questo per coerenza con ServiceProvider
  appConfig: AppConfig;
}

export async function initializeAppServices(): Promise<InitializedServices> {
  console.log('Phase 1: Initializing ConfigManager...');
  await configManager.initialize(process.env.REACT_APP_CONFIG_URL);
  const appConfig = configManager.getConfig();
  console.log('ConfigManager initialized. App Name:', appConfig.business.name);

  console.log('Phase 2: Initializing core services...');
  await themeService.initialize();
  await catalogService.initialize();
  await functionRegistry.initialize();
   if (appConfig.functions.functionDataEndpoints) {
      functionRegistry.setFunctionDataEndpoints(appConfig.functions.functionDataEndpoints);
  }


  const consentServiceInstance = new SimpleConsentService();
  const analyticsServiceInstance = new AnalyticsService(consentServiceInstance);
  await analyticsServiceInstance.initialize();

  console.log('Phase 3: Initializing Prompt and Retrieval services...');
  retrievalService.setVectorStore(new InMemoryVectorStore());
  await retrievalService.initialize();
  await setupPrompts(); // Ora usa appConfig da configManager

  console.log('Phase 4: Initializing NLP services...');
  try {
    await nlpIntegrationService.initialize(); // Usa appConfig da configManager
    console.log('NLP Service initialized successfully.');
  } catch (nlpError) {
    console.warn('NLP Service initialization failed, continuing with limited NLP features:', nlpError);
  }

  console.log('Phase 5: Initializing AI Service and dependent services...');
  // La configurazione AI attiva è ora letta direttamente da appConfig
  const activeAIConfig: AIProviderConfig = {
    apiKey: appConfig.ai.apiKey,
    model: appConfig.ai.activeModel,
    options: appConfig.ai.activeOptions,
  };

  const { aiService, suggestionService, actionService } = EnhancedAIServiceFactory.createAIService({
    provider: appConfig.ai.activeProvider,
    providerConfig: activeAIConfig,
    functionService: functionRegistry,
    catalogService: catalogService,
    businessType: appConfig.business.type,
    configManager: configManager,
  });
  console.log(`AI Service created for provider: ${appConfig.ai.activeProvider}`);

  console.log('Phase 6: Initializing Conversation Tracker...');
  const conversationTrackerInstance = await getConversationTracker();
  console.log('Conversation Tracker initialized.');

  console.log('All application services initialized successfully!');

  return {
    configManager,
    themeService,
    catalogService,
    functionRegistry,
    userService: userContextService,
    retrievalService,
    promptService: promptService,
    nlpService: nlpIntegrationService,
    analyticsService: analyticsServiceInstance,
    consentService: consentServiceInstance,
    aiService,
    suggestionService,
    actionService,
    conversationTracker: conversationTrackerInstance,
    currentAiProvider: appConfig.ai.activeProvider, // Ottenuto da appConfig
    appConfig,
  };
}
