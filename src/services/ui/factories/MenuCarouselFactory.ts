// src/services/ui/factories/MenuCarouselFactory.ts
import { UIComponent } from '../../../types/UI';
import { IComponentFactory } from './IComponentFactory';

export class MenuCarouselFactory implements IComponentFactory {
  getComponentType(): string {
    return 'menuCarousel';
  }
  
  createComponent(data: any, placement: string = 'sidebar'): UIComponent {
    return {
      type: 'menuCarousel',
      data: {
        recommendations: data.recommendations || [],
        timeOfDay: data.timeOfDay || 'morning',
        category: data.category || 'all'
      },
      placement,
      id: `menu-${data.timeOfDay || 'default'}-${data.category || 'all'}-${Date.now()}`,
      _updated: Date.now()
    };
  }
  
  shouldHandleFunction(functionName: string): boolean {
    return functionName === 'get_menu_recommendations';
  }
  
  createFromFunctionResult(functionName: string, result: any): UIComponent | null {
    if (!this.shouldHandleFunction(functionName)) return null;
    
    const data = (result?.data?.data) || result?.data || result;
    return this.createComponent(data);
  }
}