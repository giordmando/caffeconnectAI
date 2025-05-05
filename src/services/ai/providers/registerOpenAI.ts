// src/services/ai/providers/registerOpenAI.ts
import { aiProviderRegistry } from '../AIProviderRegistry';
import { OpenAIProvider } from './OpenAIProvider';

/**
 * Registra il provider OpenAI nel registry dei provider AI
 */
export function registerOpenAIProvider(): void {
  aiProviderRegistry.registerProvider('openai', (config) => new OpenAIProvider(config));
  console.log('OpenAI provider registered');
}
