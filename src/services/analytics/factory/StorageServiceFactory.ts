import { FirebaseStorageService } from '../../db/firebase/FirebaseStorageService';
import { IStorageService } from '../interfaces/IStorageService';
import { SimpleStorageService } from '../SimpleStorageService';
import { EnhancedStorageService } from '../EnhancedStorageService';

export enum StorageType {
  LOCAL = 'local',
  ENHANCED = 'enhanced',
  FIREBASE = 'firebase'
}

/**
 * Factory aggiornata che supporta anche il nuovo servizio di storage migliorato
 */
export class StorageServiceFactory {
  /**
   * Crea un'istanza del servizio di storage appropriato
   * @param type Tipo di storage da creare
   * @returns Istanza di IStorageService
   */
  static createStorageService(type: StorageType): IStorageService {
    switch (type) {
      case StorageType.FIREBASE:
        // Verifica se Firebase è configurato
        if (typeof window !== 'undefined' && 
            window.location.hostname !== 'localhost' && 
            window.location.hostname !== '127.0.0.1') {
          return new FirebaseStorageService();
        } else {
          console.warn('Firebase not configured for local development, using EnhancedStorageService instead');
          return new EnhancedStorageService();
        }
        
      case StorageType.ENHANCED:
        // Usa il servizio migliorato
        return new EnhancedStorageService();
        
      case StorageType.LOCAL:
      default:
        // Usa il servizio semplice per retrocompatibilità
        return new SimpleStorageService();
    }
  }
  
  /**
   * Determina il tipo di storage ottimale in base all'ambiente
   * @returns Tipo di storage consigliato
   */
  static getRecommendedStorageType(): StorageType {
    // Verifica se è un ambiente di produzione
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Verifica se è un dispositivo mobile (potrebbe avere limitazioni di storage)
    const isMobile = typeof window !== 'undefined' && 
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // In produzione, usa Firebase se possibile
    if (isProduction && !isMobile) {
      return StorageType.FIREBASE;
    }
    
    // Su mobile o in development, usa il servizio migliorato
    return StorageType.ENHANCED;
  }
}