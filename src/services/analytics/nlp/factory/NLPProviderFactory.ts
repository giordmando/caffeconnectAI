// src/services/analytics/factory/NLPProviderFactory.ts

import { INLPProviderAdapter } from '../interfaces/INLPProviderAdapter';
import { NLPProviderOptions } from '../interfaces/INLPService';
import { VADERAdapter } from '../adapters/VADERAdapter';
import { OpenAIAdapter } from '../adapters/OpenAIAdapter';

export enum NLPProviderType {
  VADER = 'vader',
  OPENAI = 'openai'
}

export class NLPProviderFactory {
  static createProvider(type: NLPProviderType, options?: NLPProviderOptions): INLPProviderAdapter {
    switch (type) {
      case NLPProviderType.VADER:
        return new VADERAdapter();
        
      case NLPProviderType.OPENAI:
        const openAIAdapter = new OpenAIAdapter();
        openAIAdapter.initialize(options);
        return openAIAdapter;
        
      // Altre implementazioni...
      default:
        return new VADERAdapter();
    }
  }
}