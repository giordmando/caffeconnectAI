import { OpenAIAdapter } from '../adapters/OpenAIAdapter';
import { VADERAdapter } from '../adapters/VADERAdapter';
import { INLPProvider } from '../interfaces/INLPService';

export class NLPProviderFactory {
  async createProvider(providerType: string, config?: any): Promise<INLPProvider> {
    switch(providerType) {
      case 'OpenAI':
        const openaiAdapter = new OpenAIAdapter();
        await openaiAdapter.initialize(config);
        return openaiAdapter;
      
      case 'VADER':
        const vaderAdapter = new VADERAdapter();
        await vaderAdapter.initialize();
        return vaderAdapter;
        
      default:
        throw new Error(`Provider type ${providerType} not supported`);
    }
  }
}