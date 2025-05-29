import React from 'react';

import { UIComponent } from '../../../../types/UI';
import { MenuCarousel } from '../../../../components/ui/MenuCarousel';
import { BaseComponentCreator } from './BaseComponentCreator';

export class MenuCarouselCreator extends BaseComponentCreator {
  componentType = 'menuCarousel';
  functionNames = ['get_menu_recommendations'];
  
  createReactElement(component: UIComponent, onAction?: (action: string, payload: any) => void): React.ReactElement {
    const { recommendations, timeOfDay } = component.data;
    
    return React.createElement(MenuCarousel, {
      recommendations: recommendations || [],
      timeOfDay: timeOfDay || 'morning',
      id: component.id,
      onAction
    });
  }
  
  createUIComponent(data: any, placement: string = 'sidebar'): UIComponent {
    return {
      type: this.componentType,
      data: {
        recommendations: data.recommendations || [],
        timeOfDay: data.timeOfDay || 'morning',
        category: data.category || 'all'
      },
      placement,
      id: this.generateComponentId('menu-carousel', { 
        timeOfDay: data.timeOfDay, 
        category: data.category 
      }),
      _updated: Date.now()
    };
  }
}