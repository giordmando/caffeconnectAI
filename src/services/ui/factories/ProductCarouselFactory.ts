import { UIComponent } from '../../../types/UI';
import { IComponentFactory } from './IComponentFactory';

export class ProductCarouselFactory implements IComponentFactory {
  getComponentType(): string {
    return 'productCarousel';
  }
  
  createComponent(data: any, placement: string = 'sidebar'): UIComponent {
    return {
      type: 'productCarousel',
      data: {
        recommendations: data.recommendations || [],
        timeOfDay: data.timeOfDay || 'morning',
        category: data.category || 'all'
      },
      placement,
      id: `product-${data.timeOfDay || 'default'}-${data.category || 'all'}-${Date.now()}`,
      _updated: Date.now()
    };
  }
  
  shouldHandleFunction(functionName: string): boolean {
    return functionName === 'get_product_recommendations';
  }
  
  createFromFunctionResult(functionName: string, result: any): UIComponent | null {
    if (!this.shouldHandleFunction(functionName)) return null;
    
    const data = (result?.data?.data) || result?.data || result;
    return this.createComponent(data);
  }
}