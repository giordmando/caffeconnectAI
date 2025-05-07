// src/services/ui/UIComponentGenerator.ts
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
      try {
        const functionName = lastFunctionCall.functionCall!.name;
        const functionResult = JSON.parse(lastFunctionResult.functionResult!.result);
        
        console.log(`Function result for ${functionName}:`, functionResult);
        
        if (functionResult.success) {
          // Estrai i dati dalla risposta correttamente, 
          // assicurandoti che siano strutturati nel modo corretto per i componenti
          const resultData = functionResult.data || {};
          
          if (functionName === 'get_user_loyalty_points') {
            // Assicuriamoci che tutti i campi necessari siano presenti
            components.push({
              type: 'loyaltyCard',
              data: {
                points: resultData.data.points || 0,
                tier: resultData.data.tier || 'Bronze',
                nextTier: resultData.data.nextTier || { name: 'Silver', pointsNeeded: 100 },
                history: resultData.data.history || []
              },
              placement: 'sidebar',
              id: 'loyalty-card-' + Date.now()
            });
          }
          else if (functionName === 'get_menu_recommendations') {
            components.push({
              type: 'menuCarousel',
              data: {
                recommendations: resultData.recommendations || [],
                timeOfDay: JSON.parse(lastFunctionCall.functionCall!.arguments).timeOfDay || 'morning'
              },
              placement: 'sidebar',
              id: 'menu-recommendations-' + Date.now()
            });
          }
          else if (functionName === 'get_product_recommendations') {
            components.push({
              type: 'productCarousel',
              data: {
                recommendations: resultData.recommendations || []
              },
              placement: 'sidebar',
              id: 'product-recommendations-' + Date.now()
            });
          }
          else if (functionName === 'get_user_preferences') {
            components.push({
              type: 'preferencesCard',
              data: {
                preferences: resultData || {}
              },
              placement: 'sidebar',
              id: 'user-preferences-' + Date.now()
            });
          }
        }
      } catch (error) {
        console.error('Error generating UI components:', error);
      }
    }
    
    return components;
  }
}