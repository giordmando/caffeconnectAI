import { AIProviderConfig } from "../../types/AIProvider";
import { AIResponse } from "../../types/AIResponse";
import { Message } from "../../types/Message";
import { UIComponent } from "../../types/UI";
import { UserContext } from "../../types/UserContext";
import { IActionService } from "../action/interfaces/IActionService";
import { ISuggestionService } from "../action/interfaces/ISuggestionService";
import { IAIProvider } from "./interfaces/IAIProvider";
import { IAIService } from "./interfaces/IAIService";
import { IFunctionService } from "../function/interfaces/IFunctionService";
import { getTimeOfDay } from "../../utils/timeContext";
import { AIProviderService } from "./core/AIProviderService";
import { ConversationService } from "./core/ConversationService";
import { FunctionOrchestrator } from "./core/FunctionOrchestrator";
import { UIResponseGenerator } from "./core/UIResponseGenerator";
import { AIProviderHandler } from "./pipeline/handlers/AIProviderHandler";
import { FunctionExecutionHandler } from "./pipeline/handlers/FunctionExecutionHandler";
import { UIGenerationHandler } from "./pipeline/handlers/UIGenerationHandler";
import { UserMessageHandler } from "./pipeline/handlers/UserMessageHandler";
import { IMessageHandler } from "./pipeline/interfaces/IMessageHandler";
import { AdvancedFunctionExecutionStrategy } from "./strategies/AdvancedFunctionExecutionStrategy";
import { BasicFunctionExecutionStrategy } from "./strategies/BasicFunctionExecutionStrategy";

export class EnhancedAIService implements IAIService {
    private pipeline: IMessageHandler;
    private conversationService: ConversationService;
    private aiProviderService: AIProviderService;
    private uiResponseGenerator: UIResponseGenerator; // Aggiunta proprietà mancante
    private functionOrchestrator: FunctionOrchestrator; // Aggiunta proprietà mancante
    
    constructor(
      aiProvider: IAIProvider,
      functionService: IFunctionService,
      suggestionService: ISuggestionService,
      actionService: IActionService,
      options: { enableAdvancedFunctionSupport?: boolean } = {}
    ) {
      // Inizializza i servizi
      this.conversationService = new ConversationService();
      this.aiProviderService = new AIProviderService(aiProvider);

      const functions = functionService.getFunctionsForAI();
      console.log("Funzioni disponibili per l'AI:", functions);

      // Crea l'orchestratore di funzioni con la strategia appropriata
      const executionStrategy = options.enableAdvancedFunctionSupport
        ? new AdvancedFunctionExecutionStrategy(functionService)
        : new BasicFunctionExecutionStrategy(functionService);
        
      this.functionOrchestrator = new FunctionOrchestrator( // Memorizza l'istanza per uso futuro
        functionService, 
        executionStrategy
      );
      
      // Crea il generatore di UI
      this.uiResponseGenerator = new UIResponseGenerator( // Memorizza l'istanza per uso futuro
        suggestionService,
        actionService
      );
      
      // Costruisci la pipeline
      this.pipeline = new UserMessageHandler(this.conversationService);
      this.pipeline
        .setNext(new AIProviderHandler(this.aiProviderService, this.conversationService, functionService ))
        .setNext(new FunctionExecutionHandler(this.functionOrchestrator, this.conversationService, this.aiProviderService))
        .setNext(new UIGenerationHandler(this.uiResponseGenerator));
    }
    
    // Implementazione dell'interfaccia IAIService
    
    async sendMessage(message: string, userContext: UserContext): Promise<AIResponse> {
      return this.pipeline.handle({
        message,
        userContext,
        conversationHistory: this.getConversationHistory()
      });
    }
    
    getProviderName(): string {
      return this.aiProviderService.getProviderName();
    }
    
    changeProvider(provider: string, config: AIProviderConfig): void {
      // Delega al provider service
      this.aiProviderService.changeProvider(provider, config);
    }
    
    // Deleghe al servizio di conversazione
    getConversationHistory(): Message[] {
      return this.conversationService.getConversationHistory();
    }
    
    resetConversation(): void {
      this.conversationService.resetConversation();
    }
    
    addMessageToConversation(message: Message): void {
      this.conversationService.addMessage(message);
    }
    
    setConversation(messages: Message[]): void {
      this.conversationService.setConversation(messages);
    }
    
    // Implementazioni per supporto funzioni avanzato
    async sendMessageWithFunctionSupport(message: string, userContext: UserContext): Promise<AIResponse> {
      // Il supporto funzioni è già gestito nella pipeline
      return this.sendMessage(message, userContext);
    }
    
    async getCompletion(messages: Message[], userContext: UserContext): Promise<any> {
      // Delega direttamente al provider service
      return this.aiProviderService.sendCompletionRequest(messages, {
        functions: this.getFunctionsForAI(),
        context: {
          userId: userContext.userId,
          timeOfDay: getTimeOfDay(),
          userContext
        }
      });
    }
    
    async generateUIComponents(message: Message, userContext: UserContext, conversation: Message[]): Promise<UIComponent[]> {
      // Delega al generatore di UI
      return this.uiResponseGenerator.generateUIComponents(message, userContext, conversation);
    }
    
    // Metodi helper
    private getFunctionsForAI(): any[] {
      return this.functionOrchestrator.getFunctionsForAI();
    }
}