
import { UIComponent } from '../../../types/UI';
import { IComponentFactory } from './IComponentFactory';

export class PreferencesCardFactory implements IComponentFactory {
  getComponentType(): string {
    return 'preferencesCard';
  }
  
  createComponent(data: any, placement: string = 'sidebar'): UIComponent {
    return {
      type: 'preferencesCard',
      data: {
        preferences: data || [],
      },
      placement,
      id: `preferences-card-${Date.now()}`,
      _updated: Date.now()
    };
  }
  
  shouldHandleFunction(functionName: string): boolean {
    return functionName === 'get_user_preferences';
  }
  
  createFromFunctionResult(functionName: string, result: any): UIComponent | null {
    if (!this.shouldHandleFunction(functionName)) return null;
    
    const data = (result?.data?.data) || result?.data || result;
    return this.createComponent(data);
  }
}