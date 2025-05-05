import { ICatalogService } from '../catalog/interfaces/ICatalogService';
import { IAIProvider } from '../ai/interfaces/IAIProvider';
import { IFunctionService } from '../function/interfaces/IFunctionService';
import { ISuggestionProvider } from './interfaces/ISuggestionProvider';
import { DynamicSuggestionProvider } from './providers/DynamicSuggestionProvider';

export class SuggestionProviderFactory {
    static createProvider(
      businessType: string,
      catalogService: ICatalogService,
      functionService: IFunctionService,
      aiProvider: IAIProvider
    ): ISuggestionProvider {
      // Possiamo creare provider diversi in base al tipo di business
      // o usare sempre il provider dinamico
      return new DynamicSuggestionProvider(
        catalogService,
        functionService,
        aiProvider
      );
    }
  }