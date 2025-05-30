import { IConversationTracker } from '../analytics/interfaces/IConversationTracker';
import { IUserContextService } from '../user/interfaces/IUserContextService';
import { ISuggestionService } from '../action/interfaces/ISuggestionService';
import { Message } from '../../types/Message';
import { AppConfig } from '../../config/interfaces/IAppConfig';

export interface IConversationManagerService {
  getCurrentConversationId(): string | null;
  initializeConversation(): Promise<void>;
  endConversation(): Promise<void>;
  loadWelcomeMessage(config: AppConfig): Promise<{ message: Message; suggestions: string[] }>;
}

export class ConversationManagerService implements IConversationManagerService {
  private currentConversationId: string | null = null;
  private conversationTracker?: IConversationTracker;
  private userService: IUserContextService;
  private suggestionService: ISuggestionService;
  
  constructor(
    conversationTracker: IConversationTracker | undefined,
    userService: IUserContextService,
    suggestionService: ISuggestionService
  ) {
    this.conversationTracker = conversationTracker;
    this.userService = userService;
    this.suggestionService = suggestionService;
  }
  
  getCurrentConversationId(): string | null {
    return this.currentConversationId;
  }
  
  async initializeConversation(): Promise<void> {
    if (this.conversationTracker && !this.currentConversationId) {
      try {
        const userId = this.userService.getUserContext().userId;
        const newConvId = await this.conversationTracker.startConversation(userId);
        this.currentConversationId = newConvId;
        console.log('[ConversationManagerService] Conversation started with ID:', newConvId);
      } catch (error) {
        console.error('[ConversationManagerService] Error starting conversation:', error);
      }
    }
  }
  
  async endConversation(): Promise<void> {
    if (this.conversationTracker && this.currentConversationId) {
      try {
        await this.conversationTracker.endConversation(this.currentConversationId);
        this.currentConversationId = null;
      } catch (error) {
        console.error('[ConversationManagerService] Error ending conversation:', error);
      }
    }
  }
  
  async loadWelcomeMessage(config: AppConfig): Promise<{ message: Message; suggestions: string[] }> {
    const welcomeContent = config.ui?.welcomeMessage || "Benvenuto! Come posso aiutarti?";
    
    // Sostituisci i placeholder
    const interpolatedContent = this.interpolateConfig(welcomeContent, config);
    
    const welcomeMessage: Message = {
      role: 'assistant',
      content: interpolatedContent,
      timestamp: Date.now()
    };
    
    // Carica suggerimenti iniziali
    let suggestions: string[] = [];
    if (config.ui?.enableSuggestions) {
      try {
        const userContext = this.userService.getUserContext();
        suggestions = await this.suggestionService.getSuggestedPrompts(
          welcomeMessage,
          userContext
        );
      } catch (e) {
        console.error('[ConversationManagerService] Error getting initial suggestions:', e);
        suggestions = [];
      }
    }
    
    // Aggiungi interazione
    this.userService.addInteraction(interpolatedContent);
    
    return { message: welcomeMessage, suggestions };
  }
  
  private interpolateConfig(text: string, config: AppConfig): string {
    if (!text || !config) return text || '';
    return text.replace(/\{business\.name\}/g, config.business?.name || 'il nostro locale');
  }
}