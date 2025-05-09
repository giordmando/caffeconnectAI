// src/services/ai/AIService.ts
import { IAIService } from './interfaces/IAIService';
import { IAIProvider } from './interfaces/IAIProvider';
import { AIProviderFactory } from './AIProviderFactory';
import { IUIComponentGenerator } from './interfaces/IUIComponentGenerator';
import { IFunctionService } from '../function/interfaces/IFunctionService';
import { Message } from '../../types/Message';
import { UserContext } from '../../types/UserContext';
import { AIResponse } from '../../types/AIResponse';
import { AIProviderConfig } from '../../types/AIProvider';
import { AIResponseProcessor } from './AIResponseProcessor';
import { getTimeOfDay } from '../../utils/timeContext';
import { ISuggestionService } from '../action/interfaces/ISuggestionService';
import { IActionService } from '../action/interfaces/IActionService';
import { ConversationManager } from './ConversationManager';
import { configManager } from '../../config/ConfigManager';
import { UIComponent } from '../../types/UI';

export class AIService implements IAIService {
  private conversationManager: ConversationManager;
  private enableFunctionCalling: boolean;
  
  constructor(
    private provider: IAIProvider,
    private functionService: IFunctionService,
    private responseProcessor: AIResponseProcessor,
    private uiComponentGenerator: IUIComponentGenerator,
    private suggestionService: ISuggestionService,
    private actionService: IActionService,
    options: { enableFunctionCalling?: boolean } = {}
  ) {
    // Carica il system prompt dalla configurazione
    const aiConfig = configManager.getSection('ai');
    const systemPrompt = aiConfig.systemPrompt;
    
    this.conversationManager = new ConversationManager(systemPrompt);
    this.enableFunctionCalling = options.enableFunctionCalling ?? true;
    
    console.log(`AI service initialized with provider: ${this.provider.name}`);
  }
  
  getProviderName(): string {
    return this.provider.providerName();
  }
  
  async sendMessage(message: string, userContext: UserContext): Promise<AIResponse> {
    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: Date.now()
    };
    
    this.addMessageToConversation(userMessage);
    let aiMessage: Message;
    
    try {
      // Gestisci possibili chiamate di funzione
      if (this.enableFunctionCalling && 'sendCompletionRequest' in this.provider) {
        aiMessage = await this.handleFunctionCapableProvider(message, userContext);
      } else {
        // Semplice provider di messaggi
        const content = await this.provider.sendMessage(message);
        aiMessage = {
          role: 'assistant',
          content,
          timestamp: Date.now()
        };
      }
      
      this.addMessageToConversation(aiMessage);
      
      // Genera componenti UI, suggerimenti e azioni in parallelo
      const [uiComponents, suggestedPrompts, availableActions] = await Promise.all([
        this.uiComponentGenerator.generateUIComponents(
          aiMessage, 
          userContext,
          this.getConversationHistory()
        ),
        this.suggestionService.getSuggestedPrompts(aiMessage, userContext),
        this.actionService.generateAvailableActions(
          aiMessage, 
          userContext
        )
      ]);
      
      // Traccia l'interazione
      this.trackUserInteraction(message, userContext.userId);
      
      return {
        message: aiMessage,
        uiComponents,
        suggestedPrompts,
        availableActions
      };
    } catch (error) {
      console.error('Error communicating with AI:', error);
      
      // Fallback su errore
      aiMessage = {
        role: 'assistant',
        content: 'Mi dispiace, ho avuto un problema nel processare la tua richiesta. Puoi riprovare?',
        timestamp: Date.now()
      };
      
      this.addMessageToConversation(aiMessage);
      
      return {
        message: aiMessage,
        suggestedPrompts: ['Cosa c\'è nel menu?', 'Mostrami i prodotti', 'Quanti punti ho?']
      };
    }
  }
  
  private async handleFunctionCapableProvider(message: string, userContext: UserContext): Promise<Message> {
    const functionCallingProvider = this.provider;
    const response = await functionCallingProvider.sendCompletionRequest(
      this.getConversationHistory(),
      {
        functions: this.functionService.getFunctionsForAI()
      }
    );
    
    if (response.function_call) {
      return await this.responseProcessor.processFunctionCall(
        response.function_call,
        this.getConversationHistory()
      );
    } else {
      return {
        role: 'assistant',
        content: response.content || response.choices?.[0]?.message?.content || '',
        timestamp: Date.now()
      };
    }
  }
  
  async sendMessageWithFunctionSupport(message: string, userContext: UserContext): Promise<AIResponse> {
    return this.sendMessage(message, userContext);
  }
  
  async getCompletion(messages: Message[], userContext: UserContext): Promise<any> {
    if (!this.provider || !('sendCompletionRequest' in this.provider)) {
      throw new Error('Current provider does not support completion requests');
    }
    
    const timeOfDay = getTimeOfDay();
    
    const context = {
      userId: userContext.userId,
      timeOfDay: timeOfDay,
      currentTime: new Date().toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'}),
      date: new Date().toLocaleDateString('it-IT'),
      userContext: userContext
    };
    
    return await this.provider.sendCompletionRequest(
      messages,
      {
        functions: this.functionService.getFunctionsForAI(),
        context: context
      }
    );
  }
  async generateUIComponents(message: Message, userContext: UserContext, conversation: Message[]): Promise<UIComponent[]> {
    return this.uiComponentGenerator.generateUIComponents(message, userContext, conversation);
  }
  changeProvider(provider: string, config: AIProviderConfig): void {
    const currentOptions = this.provider.getConfig?.() || {};
    
    this.provider = AIProviderFactory.createProvider(provider, {
      ...config,
      options: {
        ...config.options,
        useMockFunctions: config.options?.useMockFunctions !== undefined 
          ? config.options.useMockFunctions 
          : currentOptions.useMockFunctions
      }
    });
    console.log(`AI provider changed to: ${this.provider.name}`);
  }
  
  getConversationHistory(): Message[] {
    return this.conversationManager.getConversationHistory();
  }
  
  resetConversation(): void {
    this.conversationManager.resetConversation();
  }
  
  addMessageToConversation(message: Message): void {
    this.conversationManager.addMessageToConversation(message);
  }
  
  setConversation(messages: Message[]): void {
    this.conversationManager.setConversation(messages);
  }
  
  private trackUserInteraction(message: string, userId: string): void {
    this.responseProcessor.trackUserInteraction(message, userId);
  }
}