import React from 'react';
import { UIComponent } from "../../../types/UI";
import { BaseComponentCreator } from "./BaseComponentCreator";
import { PreferencesCard } from '../../../components/ui/PreferencesCard';

export class PreferencesCardCreator extends BaseComponentCreator {
    componentType = 'preferencesCard';
    
    create(component: UIComponent, onAction?: (action: string, payload: any) => void): React.ReactElement {

        const data = this.validateData<{
            preferences: any;
          }>(component.data || {}, ['preferences']);
          
          return React.createElement(PreferencesCard, {
            preferences: data.preferences,
            id: component.id,
            onAction
        });
    }
  }