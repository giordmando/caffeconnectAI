import { IAIService } from './interfaces/IAIService';
import { AIService } from './AIService';
import { AIConversationManager } from './AIConversationManager';
import { AIProviderFactory } from './AIProviderFactory';
import { IFunctionService } from '../function/interfaces/IFunctionService';
import { AIResponseProcessor } from './AIResponseProcessor';
import { UIComponentGenerator } from '../ui/UIComponentGenerator';
import { AIProviderConfig } from '../../types/AIProvider';
import { registerAllProviders } from './providers/registerAllProviders';
import { FunctionExecutionStrategyFactory } from '../function/FunctionExecutionStrategyFactory';
import { ICatalogService } from '../catalog/interfaces/ICatalogService';
import { SuggestionServiceFactory } from '../action/SuggestionServiceFactory';
import { ActionServiceFactory } from '../action/ActionServiceFactory';
import { ISuggestionService } from '../action/interfaces/ISuggestionService';
import { IActionService } from '../action/interfaces/IActionService';

export class AIServiceFactory {
  /**
   * Crea un servizio AI completo con tutte le dipendenze
   */
  static createAIService(params: {
    provider: string;
    providerConfig: AIProviderConfig;
    functionService: IFunctionService;
    catalogService: ICatalogService;
    businessType: string;
    configManager: any;
  }): { 
    aiService: IAIService; 
    suggestionService: ISuggestionService; 
    actionService: IActionService; 
  } {
    // Assicurati che i provider siano registrati
    registerAllProviders();
    
    // Crea il provider AI
    const aiProvider = AIProviderFactory.createProvider(
      params.provider, 
      params.providerConfig
    );
    
    // Crea la strategia di esecuzione
    const executionStrategy = FunctionExecutionStrategyFactory.createStrategy(
      aiProvider,
      params.functionService
    );
    
    // Crea il processor
    const responseProcessor = new AIResponseProcessor(
      params.functionService,
      executionStrategy
    );
    
    // Crea i componenti UI
    const uiComponentGenerator = new UIComponentGenerator();
    
    // Crea i servizi di suggerimento e azione
    const suggestionService = SuggestionServiceFactory.createService(
      params.businessType,
      params.catalogService,
      params.functionService,
      aiProvider
    );
    
    const actionService = ActionServiceFactory.createService(
      params.businessType,
      params.catalogService,
      aiProvider
    );
    let aIService: IAIService;
    // Crea il servizio AI base
    const baseAIService = new AIService(
      aiProvider,
      params.functionService,
      responseProcessor,
      uiComponentGenerator,
      suggestionService,
      actionService,
      {
        enableFunctionCalling: true
      }
    );

    // Determina se usare il manager avanzato
    const enableAdvancedFunctionSupport = params.providerConfig.options?.enableAdvancedFunctionSupport || false;
    
    // Restituisci il servizio appropriato
    if (enableAdvancedFunctionSupport) {
      aIService = new AIConversationManager(
        baseAIService,
        params.functionService,
        suggestionService,
        actionService
      );
    }else{
      aIService = baseAIService;

    }
    
    return {
      aiService: aIService,
      suggestionService,
      actionService
    };
  }
}