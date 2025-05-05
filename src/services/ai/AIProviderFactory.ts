import { IAIProvider } from './interfaces/IAIProvider';
import { MockAIProvider } from './providers/MockAIProvider';
import { AIProviderConfig } from '../../types/AIProvider';
import { OpenAIProvider } from './providers/OpenAIProvider';

// Import other providers 
// import { OpenAIProvider } from './providers/OpenAIProvider';
// import { ClaudeProvider } from './providers/ClaudeProvider';
// import { GeminiProvider } from './providers/GeminiProvider';

/**
 * Factory for creating AI provider instances
 */
export class AIProviderFactory {
  /**
   * Create a provider instance based on type and configuration
   */
  static createProvider(type: string, config: AIProviderConfig): IAIProvider {
    switch(type.toLowerCase()) {
      // Uncomment when implementing these providers
      case 'openai':
         return new OpenAIProvider(config);
      // case 'claude':
      //   return new ClaudeProvider(config);
      // case 'gemini':
      //   return new GeminiProvider(config);
      case 'mockai':
        return new MockAIProvider(config);
      default:
        console.warn(`Provider ${type} not supported, using MockAI as fallback`);
        return new MockAIProvider(config);
    }
  }
}