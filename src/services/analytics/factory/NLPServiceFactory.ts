// src/services/analytics/factory/NLPServiceFactory.ts

import { INLPService } from '../interfaces/INLPService';
import { BasicNLPService } from '../NLPService';

export enum NLPServiceType {
  BASIC = 'basic',
  ADVANCED = 'advanced' // Per futura implementazione
}

export class NLPServiceFactory {
  static createNLPService(type: NLPServiceType): INLPService {
    switch (type) {
      case NLPServiceType.ADVANCED:
        // In futuro, potresti implementare un servizio NLP avanzato
        // return new AdvancedNLPService();
        console.log('Advanced NLP not yet implemented, falling back to basic');
        return new BasicNLPService();
      case NLPServiceType.BASIC:
      default:
        return new BasicNLPService();
    }
  }
}