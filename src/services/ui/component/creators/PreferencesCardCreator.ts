import React from 'react';
import { UIComponent } from '../../../../types/UI';
import { PreferencesCard } from '../../../../components/ui/PreferencesCard';
import { BaseComponentCreator } from './BaseComponentCreator';

export class PreferencesCardCreator extends BaseComponentCreator {
  componentType = 'preferencesCard';
  functionNames = ['get_user_preferences'];
  protected isUniqueComponent = true;
  
  createReactElement(component: UIComponent, onAction?: (action: string, payload: any) => void): React.ReactElement {
    const { preferences } = component.data;
    
    return React.createElement(PreferencesCard, {
      preferences: preferences || {},
      id: component.id,
      onAction
    });
  }
  
  createUIComponent(data: any, placement: string = 'sidebar'): UIComponent {
    return {
      type: this.componentType,
      data: {
        preferences: data || {}
      },
      placement,
      id: this.generateComponentId('preferences-card', data),
      _updated: Date.now()
    };
  }
}