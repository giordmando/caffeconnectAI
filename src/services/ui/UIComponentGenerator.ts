import { IUIComponentGenerator } from '../ai/interfaces/IUIComponentGenerator';
import { Message } from '../../types/Message';
import { UserContext } from '../../types/UserContext';
import { UIComponent } from '../../types/UI';
import { getTimeOfDay } from '../../utils/timeContext';

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
        const data = functionResult.data;
        
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
  
  /**
   * Get suggested prompts based on user context and time of day
   */
  getSuggestedPrompts(userContext: UserContext): string[] {
    const timeOfDay = getTimeOfDay();
    const suggestions: string[] = [];
    
    if (timeOfDay === 'morning') {
      suggestions.push('Cosa mi consigli per colazione?');
      suggestions.push('Quali caffè posso acquistare?');
    } else if (timeOfDay === 'afternoon') {
      suggestions.push('Cosa c\'è di buono per pranzo?');
      suggestions.push('Hai opzioni leggere per pranzo?');
    } else {
      suggestions.push('Consigli per l\'aperitivo?');
      suggestions.push('Avete dolci disponibili?');
    }
    
    // Add suggestions based on user context
    if (userContext.preferences.length > 0) {
      suggestions.push('Quali sono le mie preferenze?');
    }
    
    suggestions.push('Quanti punti fedeltà ho?');
    
    // Return maximum 4 suggestions
    return suggestions.slice(0, 4);
  }
  
  /**
   * Generate available actions based on AI response content
   */
  generateAvailableActions(response: Message, userContext: UserContext): any[] {
    const actions: any[] = [];
    
    // Check for mentions of specific menu items/products
    const messageContent = response.content.toLowerCase();
    
    if (messageContent.includes('cappuccino')) {
      actions.push({
        type: 'view_item',
        title: 'Vedi Cappuccino',
        payload: { id: 'coffee-2', type: 'menuItem' }
      });
    }
    
    if (messageContent.includes('cornetto')) {
      actions.push({
        type: 'view_item',
        title: 'Vedi Cornetto',
        payload: { id: 'pastry-2', type: 'menuItem' }
      });
    }
    
    if (messageContent.includes('specialty etiopia') || messageContent.includes('yirgacheffe')) {
      actions.push({
        type: 'view_item',
        title: 'Vedi Caffè Specialty Etiopia',
        payload: { id: 'coffee-bag-2', type: 'product' }
      });
    }
    
    // Add generic options if no specific actions
    if (actions.length === 0) {
      const timeOfDay = getTimeOfDay();
      
      if (timeOfDay === 'morning') {
        actions.push({
          type: 'view_category',
          title: 'Menù colazione',
          payload: { category: 'breakfast', type: 'menuCategory' }
        });
      } else if (timeOfDay === 'afternoon') {
        actions.push({
          type: 'view_category',
          title: 'Menù pranzo',
          payload: { category: 'lunch', type: 'menuCategory' }
        });
      } else {
        actions.push({
          type: 'view_category',
          title: 'Menù aperitivo',
          payload: { category: 'aperitivo', type: 'menuCategory' }
        });
      }
      
      actions.push({
        type: 'view_category',
        title: 'Prodotti acquistabili',
        payload: { category: 'all', type: 'productCategory' }
      });
    }
    
    return actions;
  }
}