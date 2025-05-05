import { ISuggestionService } from './interfaces/ISuggestionService';
import { SuggestionService } from './SuggestionService';
import { ICatalogService } from '../catalog/interfaces/ICatalogService';
import { IFunctionService } from '../function/interfaces/IFunctionService';
import { IAIProvider } from '../ai/interfaces/IAIProvider';
import { SuggestionProviderFactory } from './SuggestionProviderFactory';

export class SuggestionServiceFactory {
  static createService(
    businessType: string,
    catalogService: ICatalogService,
    functionService: IFunctionService,
    aiProvider: IAIProvider
  ): ISuggestionService {
    const provider = SuggestionProviderFactory.createProvider(
      businessType,
      catalogService,
      functionService,
      aiProvider
    );
    
    return new SuggestionService(provider);
  }
}