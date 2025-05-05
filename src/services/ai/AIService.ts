import { IAIService } from './interfaces/IAIService';
import { IAIProvider } from './interfaces/IAIProvider';
import { AIProviderFactory } from './AIProviderFactory';
import { IUIComponentGenerator } from './interfaces/IUIComponentGenerator';
import { IFunctionService } from '../function/interfaces/IFunctionService';
import { Message } from '../../types/Message';
import { UserContext } from '../../types/UserContext';
import { AIResponse } from '../../types/AIResponse';
import { AIProviderConfig } from '../../types/AIProvider';
import { AIMessageFormatter } from './AIMessageFormatter';
import { AIResponseProcessor } from './AIResponseProcessor';
import { UIComponentGenerator } from '../ui/UIComponentGenerator';
import { getTimeOfDay } from '../../utils/timeContext';
import { ISuggestionService } from '../action/interfaces/ISuggestionService';
import { IActionService } from '../action/interfaces/IActionService';



/**
 * Main AI service implementation
 */
export class AIService implements IAIService {
  private provider: IAIProvider;
  private conversation: Message[] = [];
  private enableFunctionCalling: boolean;
  private functionService: IFunctionService;
  private uiComponentGenerator: IUIComponentGenerator;
  private messageFormatter: AIMessageFormatter;
  private responseProcessor: AIResponseProcessor;
  private suggestionService: ISuggestionService;
  private actionService: IActionService;

  constructor(
    provider: IAIProvider,
    functionService: IFunctionService,
    responseProcessor: AIResponseProcessor,
    uiComponentGenerator: IUIComponentGenerator,
    suggestionService: ISuggestionService,
    actionService: IActionService,
    options: {
      enableFunctionCalling?: boolean;
    } = {}
  ) {
    this.provider = provider;
    this.functionService = functionService;
    this.enableFunctionCalling = options.enableFunctionCalling ?? true;
    this.uiComponentGenerator = uiComponentGenerator || new UIComponentGenerator();
    this.messageFormatter = new AIMessageFormatter();
    this.responseProcessor = responseProcessor;
    this.suggestionService = suggestionService;
    this.actionService = actionService;
    
    // Initialize conversation with system prompt
    const functionDescriptions = this.functionService.getAllFunctions()
      .map(fn => `- ${fn.name}: ${fn.description}`)
      .join('\n');
      
    this.conversation = [
      this.messageFormatter.createSystemMessage(functionDescriptions)
    ];
    
    console.log(`AI service initialized with provider: ${this.provider.name}`);
  }

  
  /**
   * Get the current provider name
   */
  getProviderName(): string {
    return this.provider.providerName();
  }
  
  /**
   * Check if the current provider is a mock
   */
  private isMockProvider(): boolean {
    return this.provider.providerName() === 'Mock AI';
  }
  
  /**
   * Send a message to the AI and get a response
   */
  async sendMessage(message: string, userContext: UserContext): Promise<AIResponse> {
    // Add user message to conversation
    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: Date.now()
    };
    
    this.conversation.push(userMessage);
    
    // Prepare response
    let aiMessage: Message;
    
    try {
      // Send to AI provider
      if (this.enableFunctionCalling && 'sendCompletionRequest' in this.provider) {
        const functionCallingProvider = this.provider;
        const openAIResponse = await functionCallingProvider.sendCompletionRequest(
          this.conversation,
          {
            functions: this.functionService.getFunctionsForAI()
          }
        );
        
        // Check for function call
        if (openAIResponse.function_call) {
          // Process function call
          aiMessage = await this.responseProcessor.processFunctionCall(
            openAIResponse.function_call,
            this.conversation
          );
        } else {
          // Regular response
          aiMessage = {
            role: 'assistant',
            content: openAIResponse.content || openAIResponse.choices?.[0]?.message?.content || '',
            timestamp: Date.now()
          };
        }
      } else {
        // Use basic message provider
        const messageProvider = this.provider;
        const content = await messageProvider.sendMessage(message);
        
        aiMessage = {
          role: 'assistant',
          content,
          timestamp: Date.now()
        };
      }
      
      // Add AI response to conversation
      this.conversation.push(aiMessage);
      
      // Ottenimento parallelo di componenti UI, suggerimenti e azioni
      const [uiComponents, suggestedPrompts, availableActions] = await Promise.all([
        this.uiComponentGenerator.generateUIComponents(
          aiMessage, 
          userContext,
          this.conversation
        ),
        this.suggestionService.getSuggestedPrompts(aiMessage, userContext),
        this.actionService.generateAvailableActions(
          aiMessage, 
          userContext
        )
      ]);
      
      // Track user interaction
      this.responseProcessor.trackUserInteraction(
        message, 
        userContext.userId
      );
      
      return {
        message: aiMessage,
        uiComponents,
        suggestedPrompts,
        availableActions
      };
    } catch (error) {
      console.error('Error communicating with AI:', error);
      
      // Fallback response
      aiMessage = {
        role: 'assistant',
        content: 'Mi dispiace, ho avuto un problema nel processare la tua richiesta. Puoi riprovare?',
        timestamp: Date.now()
      };
      
      this.conversation.push(aiMessage);
      
      return {
        message: aiMessage,
        suggestedPrompts: ['Cosa c\'è nel menu?', 'Mostrami i prodotti', 'Quanti punti ho?']
      };
    }
  }
  
  /**
 * Basic implementation of function support that falls back to regular sendMessage
 * Subclasses can override this with more advanced implementations
 */
  async sendMessageWithFunctionSupport(message: string, userContext: UserContext): Promise<AIResponse> {
    // Implementazione base che riutilizza il metodo standard
    console.log("Using basic function support implementation");
    return this.sendMessage(message, userContext);
  }

 /**
 * Get a completion from the AI provider without processing
 * @param messages The conversation messages
 * @returns Promise resolving to the raw completion
 */
async getCompletion(messages: Message[], userContext: UserContext): Promise<any> {
  if (!this.provider || !('sendCompletionRequest' in this.provider)) {
    throw new Error('Current provider does not support completion requests');
  }
  
  // Ottieni il momento della giornata
  const timeOfDay = getTimeOfDay();
  
  // Crea l'oggetto contesto
  const context = {
    userId: userContext.userId,
    timeOfDay: timeOfDay,
    currentTime: new Date().toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'}),
    date: new Date().toLocaleDateString('it-IT'),
    userContext: userContext  // Passa l'intero oggetto UserContext
  };
  
  const functionCallingProvider = this.provider;
  return await functionCallingProvider.sendCompletionRequest(
    messages,
    {
      functions: this.functionService.getFunctionsForAI(),
      context: context
    }
  );
}

  /**
   * Get the conversation history
   */
  getConversationHistory(): Message[] {
    // Filter out system messages
    //return this.conversation.filter(m => m.role !== 'system');
    return this.conversation;
  }
  
  /**
   * Reset the conversation
   */
  resetConversation(): void {
    // Keep only the system message
    this.conversation = this.conversation.filter(m => m.role === 'system');
    console.log('Conversation reset');
  }
  
  /**
   * Change the AI provider
   */
  changeProvider(provider: string, config: AIProviderConfig): void {
    this.provider = AIProviderFactory.createProvider(provider, config);
    console.log(`AI provider changed to: ${this.provider.name}`);
  }

  /**
   * Add a message to the conversation
   * @param message The message to add
   */
  addMessageToConversation(message: Message): void {
    this.conversation.push(message);
  }

  /**
   * Set the entire conversation
   * @param messages The new conversation messages
   */
  setConversation(messages: Message[]): void {
    // Mantieni il messaggio di sistema se presente
    const systemMessage = this.conversation.find(m => m.role === 'system');
    
    if (systemMessage) {
      this.conversation = [systemMessage, ...messages.filter(m => m.role !== 'system')];
    } else {
      this.conversation = [...messages];
    }
  }

}