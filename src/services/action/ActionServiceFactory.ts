import { IActionService } from './interfaces/IActionService';
import { ActionService } from './ActionService';
import { ICatalogService } from '../catalog/interfaces/ICatalogService';
import { IAIProvider } from '../ai/interfaces/IAIProvider';
import { ActionProviderFactory } from './ActionProviderFactory.ts';

export class ActionServiceFactory {
  static createService(
    businessType: string,
    catalogService: ICatalogService,
    aiProvider: IAIProvider
  ): IActionService {
    const provider = ActionProviderFactory.createProvider(
      businessType,
      catalogService,
      aiProvider
    );
    
    return new ActionService(provider);
  }
}