import React from 'react';
import { UIComponent } from '../../../../types/UI';
import { ProductCarousel } from '../../../../components/ui/ProductCarousel';
import { BaseComponentCreator } from './BaseComponentCreator';

export class ProductCarouselCreator extends BaseComponentCreator {
  componentType = 'productCarousel';
  functionNames = ['get_product_recommendations'];
  
  createReactElement(component: UIComponent, onAction?: (action: string, payload: any) => void): React.ReactElement {
    const { recommendations, explanation } = component.data;
    
    return React.createElement(ProductCarousel, {
      recommendations: recommendations || [],
      explanation,
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
        category: data.category || 'all',
        explanation: data.explanation
      },
      placement,
      id: this.generateComponentId('product-carousel', {
        timeOfDay: data.timeOfDay,
        category: data.category
      }),
      _updated: Date.now()
    };
  }
}
