import { IUIComponentGenerator } from '../ai/interfaces/IUIComponentGenerator';
import { Message } from '../../types/Message';
import { UserContext } from '../../types/UserContext';
import { UIComponent } from '../../types/UI';

/**
 * Service responsible for generating UI components based on AI responses
 */
export class UIComponentGenerator implements IUIComponentGenerator {
  /**
   * Generate UI components based on function calls and results
   */
  generateUIComponents(response: Message, userContext: UserContext, conversation: Message[]): UIComponent[] {
    const components: UIComponent[] = [];
    
    // Find the last function call and result
    const lastFunctionCall = conversation
      .filter(m => m.functionCall)
      .pop();
      
    const lastFunctionResult = conversation
      .filter(m => m.functionResult)
      .pop();
    
    if (lastFunctionCall && lastFunctionResult) {
      const functionName = lastFunctionCall.functionCall!.name;
      const functionResult = JSON.parse(lastFunctionResult.functionResult!.result);
      
      if (functionResult.success) {
        const data = functionResult.data?.data ?? functionResult.data;
        if (functionName === 'get_user_loyalty_points') {
          components.push({
            type: 'loyaltyCard',
            data: {
              points: data.points,
              tier: data.tier,
              nextTier: data.nextTier,
              history: data.history
            },
            placement: 'inline',
            id: 'loyalty-card-' + Date.now()
          });
        }
        else if (functionName === 'get_menu_recommendations') {
          components.push({
            type: 'menuCarousel',
            data: {
              recommendations: data.recommendations,
              timeOfDay: JSON.parse(lastFunctionCall.functionCall!.arguments).timeOfDay
            },
            placement: 'bottom',
            id: 'menu-recommendations-' + Date.now()
          });
        }
        else if (functionName === 'get_product_recommendations') {
          components.push({
            type: 'productCarousel',
            data: {
              recommendations: data.recommendations
            },
            placement: 'bottom',
            id: 'product-recommendations-' + Date.now()
          });
        }
        else if (functionName === 'get_user_preferences') {
          components.push({
            type: 'preferencesCard',
            data: {
              preferences: data
            },
            placement: 'sidebar',
            id: 'user-preferences-' + Date.now()
          });
        }
      }
    }
    
    return components;
  }
  
}