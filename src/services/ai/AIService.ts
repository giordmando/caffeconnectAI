import { IAIService } from './interfaces/IAIService';
import { IAIProvider, IMessageProvider, IStreamProvider, IFunctionCallingProvider } from './interfaces/IAIProvider';
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
  
  constructor(
    provider: string,
    providerConfig: AIProviderConfig,
    functionService: IFunctionService,
    options: {
      enableFunctionCalling?: boolean;
    } = {}
  ) {
    this.provider = AIProviderFactory.createProvider(provider, providerConfig);
    this.functionService = functionService;
    this.enableFunctionCalling = options.enableFunctionCalling ?? true;
    this.uiComponentGenerator = new UIComponentGenerator();
    this.messageFormatter = new AIMessageFormatter();
    this.responseProcessor = new AIResponseProcessor(functionService);
    
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
   * Get suggested prompts based on the user context
   */
  async getSuggestedPrompts(userContext: UserContext): Promise<string[]> {
    try {
      // Generate suggested prompts using the UIComponentGenerator
      const suggestedPrompts = this.uiComponentGenerator.getSuggestedPrompts(userContext);

      // Return the generated prompts
      return suggestedPrompts;
    } catch (error) {
      console.error('Error generating suggested prompts:', error);

      // Fallback to default prompts in case of an error
      return ['Come posso aiutarti?', 'Mostrami i prodotti disponibili', 'Quali sono le tue funzionalità?'];
    }
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
        const functionCallingProvider = this.provider as IFunctionCallingProvider;
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
            this.conversation,
            this.isMockProvider()
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
        const messageProvider = this.provider as IMessageProvider;
        const content = await messageProvider.sendMessage(message);
        
        aiMessage = {
          role: 'assistant',
          content,
          timestamp: Date.now()
        };
      }
      
      // Add AI response to conversation
      this.conversation.push(aiMessage);
      
      // Generate UI components, suggestions and available actions
      const uiComponents = this.uiComponentGenerator.generateUIComponents(
        aiMessage, 
        userContext,
        this.conversation
      );
      const suggestedPrompts = this.uiComponentGenerator.getSuggestedPrompts(userContext);
      const availableActions = this.uiComponentGenerator.generateAvailableActions(
        aiMessage, 
        userContext
      );
      
      // Track user interaction
      this.responseProcessor.trackUserInteraction(
        message, 
        userContext.userId, 
        this.isMockProvider()
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
   * Get the conversation history
   */
  getConversationHistory(): Message[] {
    // Filter out system messages
    return this.conversation.filter(m => m.role !== 'system');
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
}