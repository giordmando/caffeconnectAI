import React from 'react';
import { UIComponent } from "../../../types/UI";
import { BaseComponentCreator } from "./BaseComponentCreator";
import { MenuCarousel } from '../../../components/ui/MenuCarousel';

export class MenuCarouselCreator extends BaseComponentCreator {
    componentType = 'menuCarousel';
    
    create(component: UIComponent, onAction?: (action: string, payload: any) => void): React.ReactElement {

        const data = this.validateData<{
            timeOfDay: string;
            recommendations: any[];
          }>(component.data || {}, ['timeOfDay', 'recommendations']);
          
          return React.createElement(MenuCarousel, {
            recommendations: data.recommendations || [],
            timeOfDay: data.timeOfDay || 'morning',
            id: component.id,
            onAction
        });
    }
  }