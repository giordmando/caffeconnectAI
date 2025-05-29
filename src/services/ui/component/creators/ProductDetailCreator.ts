import React from 'react';

import { UIComponent } from '../../../../types/UI';
import { ProductDetailComponent } from '../../../../components/ui/ProductDetailComponent';
import { BaseComponentCreator } from './BaseComponentCreator';

export class ProductDetailCreator extends BaseComponentCreator {
  componentType = 'productDetail';
  functionNames = ['view_item_details', 'search_product_by_name'];
  
  createReactElement(component: UIComponent, onAction?: (action: string, payload: any) => void): React.ReactElement {
    const product = component.data?.product || component.data || {};
    
    return React.createElement(ProductDetailComponent, {
      product: product,
      id: component.id,
      onAction
    });
  }
  
  createUIComponent(data: any, placement: string = 'inline'): UIComponent {
    const product = data.product || data;
    
    return {
      type: this.componentType,
      data: { product },
      placement,
      id: this.generateComponentId('product-detail', product),
      _updated: Date.now()
    };
  }
  
  // Override per gestire risultati di ricerca multipli
  createFromFunctionResult(functionName: string, result: any): UIComponent | null {
    if (!this.canHandleFunctionResult(functionName)) return null;
    
    if (functionName === 'search_product_by_name' && result.results) {
      // Per la ricerca, crea un componente per ogni risultato
      // Nota: questo è un caso speciale, normalmente restituirebbe un singolo componente
      console.warn('Search results should be handled by a specialized component');
      return null;
    }
    
    return super.createFromFunctionResult(functionName, result);
  }
}