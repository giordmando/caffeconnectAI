import { Message } from '../../types/Message';
import { IConversationManager } from './interfaces/IConversationManager';

export class ConversationManager implements IConversationManager {
  private conversation: Message[] = [];
  
  constructor(systemPrompt?: string) {
    if (systemPrompt) {
      this.initializeWithSystemPrompt(systemPrompt);
    }
  }
  
  getConversationHistory(): Message[] {
    return this.conversation;
  }
  
  resetConversation(): void {
    // Mantieni solo il messaggio di sistema
    this.conversation = this.conversation.filter(m => m.role === 'system');
    console.log('Conversation reset');
  }
  
  addMessageToConversation(message: Message): void {
    this.conversation.push(message);
  }
  
  setConversation(messages: Message[]): void {
    // Mantieni il messaggio di sistema se presente
    const systemMessage = this.conversation.find(m => m.role === 'system');
    
    if (systemMessage) {
      this.conversation = [systemMessage, ...messages.filter(m => m.role !== 'system')];
    } else {
      this.conversation = [...messages];
    }
  }

  private initializeWithSystemPrompt(prompt: string): void {
    const systemMessage: Message = {
      role: 'system',
      content: prompt,
      timestamp: Date.now()
    };
    
    this.conversation = [systemMessage];
  }
  
}