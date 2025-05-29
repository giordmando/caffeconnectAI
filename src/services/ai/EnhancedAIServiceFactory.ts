import { AIProviderConfig } from "../../types/AIProvider";
import { ActionServiceFactory } from "../action/ActionServiceFactory";
import { IActionService } from "../action/interfaces/IActionService";
import { ISuggestionService } from "../action/interfaces/ISuggestionService";
import { SuggestionServiceFactory } from "../action/SuggestionServiceFactory";
import { AIProviderFactory } from "./AIProviderFactory";
import { IAIService } from "./interfaces/IAIService";
import { registerAllProviders } from "./providers/registerAllProviders";
import { ICatalogService } from "../catalog/interfaces/ICatalogService";
import { IFunctionService } from "../function/interfaces/IFunctionService";
import { EnhancedAIService } from "./EnhancedAIService";
import { ComponentManager } from "../ui/compstore/ComponentManager";

export class EnhancedAIServiceFactory {
    static createAIService(params: {
      provider: string;
      providerConfig: AIProviderConfig;
      functionService: IFunctionService;
      catalogService: ICatalogService;
      businessType: string;
      configManager: any;
    }): {
      aiService: IAIService & { getComponentManager(): ComponentManager };
      suggestionService: ISuggestionService;
      actionService: IActionService;
    } {
      // Registra tutti i provider
      registerAllProviders();
      
      // Crea il provider AI
      const aiProvider = AIProviderFactory.createProvider(params.provider, params.providerConfig);
      
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
      
      // Crea il servizio AI migliorato
      const aiService = new EnhancedAIService(
        aiProvider,
        params.functionService,
        suggestionService,
        actionService
      );
      
      return {
        aiService,
        suggestionService,
        actionService
      };
    }
  }