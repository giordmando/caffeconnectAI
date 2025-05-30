import { Message } from '../../types/Message';
import { IConversationTracker } from '../analytics/interfaces/IConversationTracker';
import { UserContext } from '../../types/UserContext';

export interface IMessageService {
  getMessages(): Message[];
  addMessage(message: Message): void;
  clearMessages(): void;
  createUserMessage(content: string): Message;
  createAssistantMessage(content: string): Message;
  trackMessage(message: Message, conversationId: string, userContext: UserContext, nlpAnalysis?: any): Promise<void>;
}

export class MessageService implements IMessageService {
  private messages: Message[] = [];
  private conversationTracker?: IConversationTracker;
  
  constructor(conversationTracker?: IConversationTracker) {
    this.conversationTracker = conversationTracker;
  }
  
  getMessages(): Message[] {
    return [...this.messages];
  }
  
  addMessage(message: Message): void {
    this.messages.push(message);
  }
  
  clearMessages(): void {
    this.messages = [];
  }
  
  createUserMessage(content: string): Message {
    return {
      role: 'user',
      content,
      timestamp: Date.now()
    };
  }
  
  createAssistantMessage(content: string): Message {
    return {
      role: 'assistant',
      content,
      timestamp: Date.now()
    };
  }
  
  async trackMessage(
    message: Message, 
    conversationId: string,
    userContext: UserContext,
    nlpAnalysis?: any
  ): Promise<void> {
    if (!this.conversationTracker || !conversationId) {
      return;
    }
    
    try {
      const eventData: any = {
        role: message.role,
        content: message.content,
        timestamp: message.timestamp
      };
      
      if (nlpAnalysis) {
        eventData.nlpData = {
          sentiment: nlpAnalysis.sentiment?.[0] || null,
          intents: nlpAnalysis.intent || [],
          topics: nlpAnalysis.topic || []
        };
      }
      
      await this.conversationTracker.trackEvent({
        type: 'message',
        conversationId,
        data: eventData,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('[MessageService] Error tracking message:', error);
    }
  }
}