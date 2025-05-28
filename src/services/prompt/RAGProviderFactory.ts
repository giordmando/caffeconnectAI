import { IPromptProvider } from './interfaces/IPromptProvider';
import { StaticProvider } from './providers/StaticProvider';
import { VectorDBProvider } from './providers/VectorDBProvider';

export class RAGProviderFactory {
  static createProvider(type: string, config: any): IPromptProvider {
    switch (type) {
      case 'static':
        return new StaticProvider(config.knowledgeBase);
      case 'vectordb':
        return new VectorDBProvider(config);
      default:
        console.warn(`Unknown provider type: ${type}, falling back to static provider`);
        return new StaticProvider();
    }
  }
}