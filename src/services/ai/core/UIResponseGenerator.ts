import { Message } from "../../../types/Message";
import { UIComponent } from "../../../types/UI";
import { UserContext } from "../../../types/UserContext";
import { IActionService } from "../../action/interfaces/IActionService";
import { ISuggestionService } from "../../action/interfaces/ISuggestionService";
import { IUIResponseGenerator } from "./interfaces/IUIResponseGenerator";

export class UIResponseGenerator implements IUIResponseGenerator {
    constructor(
      private suggestionService: ISuggestionService,
      private actionService: IActionService,
    ) {}
    
    async generateUIComponents(
      message: Message, 
      userContext: UserContext, 
      history: Message[],
      functionContext?: {
        functionName?: string;
        functionResult?: any;
      }
    ): Promise<UIComponent[]> {
      const components: UIComponent[] = [];
      
      // PUNTO CRITICO: Se abbiamo un contesto di funzione, genera componenti specifici
      if (functionContext?.functionName && functionContext?.functionResult) {
        const { functionName, functionResult } = functionContext;
        const result = functionResult?.functionResult
        // Estrai i dati, gestendo le diverse strutture possibili
        let data = result.result?.data || result.result || result;
        data = data.data || data;
        // Genera componenti in base al tipo di funzione
        if (functionName === 'get_user_loyalty_points') {
          components.push({
            type: 'loyaltyCard',
            data: {
              points: data.points || 0,
              tier: data.tier || 'Bronze',
              nextTier: data.nextTier || { name: 'Silver', pointsNeeded: 100 },
              history: data.history || []
            },
            placement: 'sidebar',
            id: 'loyalty-card-' + Date.now()
          });
        } else if (functionName === 'get_menu_recommendations') {
          components.push({
            type: 'menuCarousel',
            data: {
              recommendations: data.recommendations || [],
              timeOfDay: data.timeOfDay || 'morning'
            },
            placement: 'sidebar',
            id: 'menu-recommendations-' + Date.now()
          });
        } else if (functionName === 'get_product_recommendations') {
          components.push({
            type: 'productCarousel',
            data: {
              recommendations: data.recommendations || []
            },
            placement: 'sidebar',
            id: 'product-recommendations-' + Date.now()
          });
        } else if (functionName === 'get_user_preferences') {
          components.push({
            type: 'preferencesCard',
            data: {
              preferences: data || {}
            },
            placement: 'sidebar',
            id: 'user-preferences-' + Date.now()
          });
        } else if (functionName === 'view_item_details') {
          
          const product = data.product ? data.product: data
          if (data.success && product) {
            // Genera component productDetail
            components.push({
              type: 'productDetail',
              data: {
                product: product
              },
              placement: 'sidebar', // Mostra in line nella chat
              id: 'product-detail-' + Date.now()
            });
          }
        }else if (functionName === 'search_product_by_name') {
          
            const products = Array.isArray(data.results) && data.results.length > 0 ? data.results : [];
            if (data.success && products.length > 0) {
              for (const product of products) {
              components.push({
                type: 'productDetail',
                data: {
                product: product
                },
                placement: 'sidebar', // Mostra in line nella chat
                id: 'product-detail-' + Date.now()
              });
              }
            }
        }
      }
      
      // Restituisci i componenti generati
      return components;
    }
    
    
    async generateSuggestions(message: Message, userContext: UserContext): Promise<string[]> {
      return this.suggestionService.getSuggestedPrompts(message, userContext);
    }
    
    async generateActions(message: Message, userContext: UserContext): Promise<any[]> {
      return this.actionService.generateAvailableActions(message, userContext);
    }
  }

  