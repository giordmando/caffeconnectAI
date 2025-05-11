import { AIProviderConfig } from "../../../types/AIProvider";
import { Message } from "../../../types/Message";
import { AIProviderFactory } from "../AIProviderFactory";
import { IAIProvider } from "../interfaces/IAIProvider";
import { IAIProviderService } from "./interfaces/IAIProviderService";

export class AIProviderService implements IAIProviderService {
    private aiProvider: IAIProvider;
    
    constructor(provider: IAIProvider) {
      this.aiProvider = provider;
    }
    
    async sendMessage(prompt: string): Promise<string> {
      return this.aiProvider.sendMessage(prompt);
    }
    
    async sendCompletionRequest(messages: Message[], options?: any): Promise<any> {
      return this.aiProvider.sendCompletionRequest(messages, options);
    }
    
    getProviderName(): string {
      return this.aiProvider.providerName();
    }
    
    changeProvider(provider: string, config: AIProviderConfig): void {
      const newProvider = AIProviderFactory.createProvider(provider, config);
      this.aiProvider = newProvider;
    }
  }