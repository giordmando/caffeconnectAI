import React from 'react';
import { UIComponent } from '../../../types/UI';

export interface IComponentCreator {
  create(component: UIComponent, onAction?: (action: string, payload: any) => void): React.ReactElement;
  supports(type: string): boolean;
}