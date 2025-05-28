import { UIComponent } from '../../../types/UI';
import { IComponentFactory } from './IComponentFactory';

export class ProductDetailFactory implements IComponentFactory {
  getComponentType(): string {
    return 'productDetail';
  }
  
  createComponent(data: any, placement: string = 'inline'): UIComponent {
    return {
      type: 'productDetail',
      data: {
        product:data.product ? data.product : data
      },
      placement,
      id: `product-detail-${data.product?.id || 'default'}-${Date.now()}`,
      _updated: Date.now()
    };
  }
  
  shouldHandleFunction(functionName: string): boolean {
    return functionName === 'view_item_details';
  }
  
  createFromFunctionResult(functionName: string, result: any): UIComponent | null {
    if (!this.shouldHandleFunction(functionName)) return null;
    
    const data = (result?.data?.data) || result?.data || result;
    return this.createComponent(data);
  }
}