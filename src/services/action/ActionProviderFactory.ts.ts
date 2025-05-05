import { ICatalogService } from '../catalog/interfaces/ICatalogService';
import { IAIProvider } from '../ai/interfaces/IAIProvider';
import { DynamicActionProvider } from './providers/DynamicActionProvider';
import { IActionProvider } from './interfaces/IActionProvider';

export class ActionProviderFactory {
  static createProvider(
    businessType: string,
    catalogService: ICatalogService,
    aiProvider: IAIProvider
  ): IActionProvider {
    // Possiamo creare provider diversi in base al tipo di business
    // o usare sempre il provider dinamico
    return new DynamicActionProvider(
      catalogService,
      aiProvider
    );
  }
}