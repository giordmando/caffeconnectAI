import { Message } from "../../../types/Message";
import { IConversationService } from "./interfaces/IConversationService";

export class ConversationService implements IConversationService {
    private conversation: Message[] = [];
    
    constructor(systemPrompt?: string) {
      if (systemPrompt) {
        this.initializeWithSystemPrompt(systemPrompt);
      }
    }
    
    getConversationHistory(): Message[] {
      return this.conversation;
    }
    
    addMessage(message: Message): void {
      this.conversation.push(message);
    }
    
    resetConversation(): void {
      // Mantieni solo messaggi di sistema
      this.conversation = this.conversation.filter(m => m.role === 'system');
    }
    
    setConversation(messages: Message[]): void {
      const systemMessage = this.conversation.find(m => m.role === 'system');
      
      if (systemMessage) {
        this.conversation = [
          systemMessage,
          ...messages.filter(m => m.role !== 'system')
        ];
      } else {
        this.conversation = [...messages];
      }
    }
    
    formatMessagesForAI(): any[] {
      return this.conversation.map(msg => ({
        role: msg.role,
        content: msg.content,
        ...(msg.functionCall ? { function_call: { name: msg.functionCall.name, arguments: msg.functionCall.arguments } } : {}),
        ...(msg.functionResult ? { name: msg.functionResult.name, content: msg.functionResult.result } : {}),
        ...(msg.role === 'function' && msg.name ? { name: msg.name } : {})
      }));
    }
    
    private initializeWithSystemPrompt(prompt: string): void {
      this.conversation = [{
        role: 'system',
        content: prompt,
        timestamp: Date.now()
      }];
    }
  }
  