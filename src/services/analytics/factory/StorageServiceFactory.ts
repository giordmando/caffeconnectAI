import { IStorageService } from '../interfaces/IStorageService';
import { EnhancedStorageService } from '../EnhancedStorageService';

export enum StorageType {
  LOCAL = 'enhanced',
  FIREBASE = 'firebase'
}

/**
 * Factory aggiornata che supporta anche il nuovo servizio di storage migliorato
 */
export class StorageServiceFactory {
  static createStorageService(type: StorageType): IStorageService {
    switch (type) {
      case StorageType.FIREBASE:
        // Verifica se Firebase è configurato
        if (typeof window !== 'undefined' && 
            window.location.hostname !== 'localhost' && 
            window.location.hostname !== '127.0.0.1') {
          return new EnhancedStorageService(); // TODO implementare storage su db forse supabase
        } else {
          console.warn('Firebase not configured for local development, using EnhancedStorageService instead');
          return new EnhancedStorageService();
        }
        
      case StorageType.LOCAL:
      default:
        // Usa sempre il servizio migliorato
        return new EnhancedStorageService();
    }
  }
  static getRecommendedStorageType(): StorageType {
    // Verifica se è un ambiente di produzione
    const isProduction = process.env.NODE_ENV === 'production';
    
    // In produzione, usa Firebase se possibile
    if (isProduction) {
      return StorageType.FIREBASE;
    }
    
    // Altrimenti usa il servizio locale migliorato
    return StorageType.LOCAL;
  }
}