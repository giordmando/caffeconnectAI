// src/services/analytics/factory/StorageServiceFactory.ts

import { FirebaseStorageService } from '../../db/firebase/FirebaseStorageService';
import { IStorageService } from '../interfaces/IStorageService';
import { SimpleStorageService } from '../SimpleStorageService';

export enum StorageType {
  LOCAL = 'local',
  FIREBASE = 'firebase'
}

export class StorageServiceFactory {
  static createStorageService(type: StorageType): IStorageService {
    switch (type) {
      case StorageType.FIREBASE:
        return new FirebaseStorageService();
      case StorageType.LOCAL:
      default:
        return new SimpleStorageService();
    }
  }
}