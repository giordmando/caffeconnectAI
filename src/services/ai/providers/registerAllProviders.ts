// src/services/ai/providers/registerOpenAI.ts
import { aiProviderRegistry } from '../AIProviderRegistry';
import { MockAIProvider } from './MockAIProvider';
import { OpenAIProvider } from './OpenAIProvider';

// src/services/ai/providers/registerProviders.ts
export function registerAllProviders(): void {
  registerMockAIProvider();
  registerOpenAIProvider();
  // Altri provider...
}

export function registerMockAIProvider(): void {
  aiProviderRegistry.registerProvider('mockai', (config) => new MockAIProvider(config));
}

export function registerOpenAIProvider(): void {
  aiProviderRegistry.registerProvider('openai', (config) => new OpenAIProvider(config));
}