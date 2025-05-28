import React from 'react';
import { UIComponent } from "../../../types/UI";
import { BaseComponentCreator } from "./BaseComponentCreator";
import { ProductCarousel } from '../../../components/ui/ProductCarousel';

export class ProductCarouselCreator extends BaseComponentCreator {
    componentType = 'productCarousel';
    
    create(component: UIComponent, onAction?: (action: string, payload: any) => void): React.ReactElement {

        const data = this.validateData<{
            recommendations: any[];
          }>(component.data || {}, ['recommendations']);
          
          return React.createElement(ProductCarousel, {
            recommendations: data.recommendations || [],
            id: component.id,
            onAction
        });
    }
  }