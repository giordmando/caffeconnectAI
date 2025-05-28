import { IComponentCreator } from '../interfaces/IComponentCreator';
import { UIComponent } from '../../../types/UI';
import React from 'react';

export abstract class BaseComponentCreator implements IComponentCreator {
  abstract componentType: string;
  
  supports(type: string): boolean {
    return type === this.componentType;
  }
  
  abstract create(component: UIComponent, onAction?: (action: string, payload: any) => void): React.ReactElement;
  
  protected validateData<T>(data: any, requiredFields: string[]): T {
    const missingFields = requiredFields.filter(field => !(field in data));
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
    return data as T;
  }
}