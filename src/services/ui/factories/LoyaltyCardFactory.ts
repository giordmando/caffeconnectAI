import { UIComponent } from '../../../types/UI';
import { IComponentFactory } from './IComponentFactory';

export class LoyaltyCardFactory implements IComponentFactory {
  getComponentType(): string {
    return 'loyaltyCard';
  }
  
  createComponent(data: any, placement: string = 'sidebar'): UIComponent {
    return {
      type: 'loyaltyCard',
      data: {
        points: data.points || 0,
        tier: data.tier || 'Bronze',
        nextTier: data.nextTier || { name: 'Silver', pointsNeeded: 100 },
        history: data.history || []
      },
      placement,
      id: `loyalty-card-${Date.now()}`,
      _updated: Date.now()
    };
  }
  
  shouldHandleFunction(functionName: string): boolean {
    return functionName === 'get_user_loyalty_points';
  }
  
  createFromFunctionResult(functionName: string, result: any): UIComponent | null {
    if (!this.shouldHandleFunction(functionName)) return null;
    
    const data = (result?.data?.data) || result?.data || result;
    return this.createComponent(data);
  }
}