import { IFunctionService } from './interfaces/IFunctionService';
import { FunctionDefinition, FunctionCallResult } from '../../types/Function';

/**
 * Service for managing and executing functions
 * Follows the singleton pattern for global availability
 */
export class FunctionService implements IFunctionService {
  private availableFunctions: Map<string, FunctionDefinition> = new Map();
  private static instance: FunctionService;
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): FunctionService {
    if (!FunctionService.instance) {
      FunctionService.instance = new FunctionService();
      FunctionService.instance.registerDefaultFunctions();
    }
    return FunctionService.instance;
  }
  
  /**
   * Register a new function
   */
  registerFunction(functionDef: FunctionDefinition): void {
    this.availableFunctions.set(functionDef.name, functionDef);
    console.log(`Function "${functionDef.name}" registered.`);
  }
  
  /**
   * Get all registered functions
   */
  getAllFunctions(): FunctionDefinition[] {
    return Array.from(this.availableFunctions.values());
  }
  
  /**
   * Get functions formatted for AI
   */
  getFunctionsForAI(): any[] {
    return this.getAllFunctions().map(fn => ({
      name: fn.name,
      description: fn.description,
      parameters: fn.parameters
    }));
  }
  
  /**
   * Check if a function exists
   */
  hasFunction(functionName: string): boolean {
    return this.availableFunctions.has(functionName);
  }
  
  /**
   * Execute a function with parameters
   */
  async executeFunction(functionName: string, parameters: any): Promise<FunctionCallResult> {
    console.log(`Executing function: ${functionName}`, parameters);
    
    if (!this.hasFunction(functionName)) {
      return {
        success: false,
        error: `Function "${functionName}" not found.`
      };
    }
    
    const functionDef = this.availableFunctions.get(functionName)!;
    
    try {
      const result = await functionDef.handler(parameters);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error(`Error executing "${functionName}":`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Get UI metadata for a function
   */
  getFunctionUIMetadata(functionName: string): any {
    if (!this.hasFunction(functionName)) {
      return null;
    }
    
    const functionDef = this.availableFunctions.get(functionName)!;
    return functionDef.uiMetadata || null;
  }
  
  /**
   * Register all default functions
   */
  private registerDefaultFunctions(): void {
    // Register loyalty points function
    this.registerFunction({
      name: 'get_user_loyalty_points',
      description: 'Ottieni i punti fedeltà dell\'utente',
      parameters: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'ID dell\'utente'
          }
        },
        required: ['userId']
      },
      handler: async (params) => {
        // Simulate a real API
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
          points: 1250,
          tier: 'Gold',
          nextTier: {
            name: 'Platinum',
            pointsNeeded: 250
          },
          history: [
            { date: '2023-03-15', points: 50, reason: 'Acquisto Cappuccino' },
            { date: '2023-03-10', points: 100, reason: 'Acquisto French Press' }
          ]
        };
      },
      uiMetadata: {
        displayType: 'card',
        cardTemplate: 'loyalty-points',
        refreshRate: 'daily'
      }
    });
    
    // Register user preferences function
    this.registerFunction({
      name: 'get_user_preferences',
      description: 'Ottieni le preferenze dell\'utente',
      parameters: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'ID dell\'utente'
          }
        },
        required: ['userId']
      },
      handler: async (params) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
          favoriteDrinks: ['Cappuccino', 'Espresso'],
          favoriteFood: ['Cornetto Integrale', 'Pain au Chocolat'],
          dietaryRestrictions: ['low-sugar'],
          usualVisitTime: 'morning',
          lastOrderedItems: [
            { name: 'Cappuccino', date: '2023-03-15' },
            { name: 'Cornetto Integrale', date: '2023-03-15' },
            { name: 'Tè Verde', date: '2023-03-10' }
          ]
        };
      },
      uiMetadata: {
        displayType: 'section',
        sectionTemplate: 'user-preferences',
        refreshRate: 'on-demand'
      }
    });
    
    // Register menu recommendations function
    this.registerFunction({
      name: 'get_menu_recommendations',
      description: 'Ottieni raccomandazioni dal menu in base alle preferenze dell\'utente',
      parameters: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'ID dell\'utente'
          },
          timeOfDay: {
            type: 'string',
            enum: ['morning', 'afternoon', 'evening'],
            description: 'Momento della giornata'
          },
          category: {
            type: 'string',
            enum: ['beverage', 'food', 'all'],
            description: 'Categoria di prodotti'
          }
        },
        required: ['userId', 'timeOfDay']
      },
      handler: async (params) => {
        await new Promise(resolve => setTimeout(resolve, 700));
        
        // Different recommendations based on time of day
        if (params.timeOfDay === 'morning') {
          return {
            recommendations: [
              { id: 'coffee-2', name: 'Cappuccino', confidence: 0.95 },
              { id: 'pastry-2', name: 'Cornetto Integrale', confidence: 0.88 },
              { id: 'pastry-3', name: 'Pain au Chocolat', confidence: 0.75 }
            ]
          };
        } else if (params.timeOfDay === 'afternoon') {
          return {
            recommendations: [
              { id: 'sandwich-1', name: 'Panino Veggie', confidence: 0.85 },
              { id: 'salad-1', name: 'Insalata Caesar', confidence: 0.82 },
              { id: 'tea-1', name: 'Tè Verde', confidence: 0.78 }
            ]
          };
        } else {
          return {
            recommendations: [
              { id: 'aperitivo-1', name: 'Aperol Spritz', confidence: 0.92 },
              { id: 'aperitivo-2', name: 'Tagliere Misto', confidence: 0.90 },
              { id: 'dessert-1', name: 'Tiramisù', confidence: 0.85 }
            ]
          };
        }
      },
      uiMetadata: {
        displayType: 'carousel',
        carouselTemplate: 'menu-items',
        refreshRate: 'per-session'
      }
    });
    
    // Register product recommendations function
    this.registerFunction({
      name: 'get_product_recommendations',
      description: 'Ottieni raccomandazioni di prodotti acquistabili',
      parameters: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'ID dell\'utente'
          },
          category: {
            type: 'string',
            enum: ['coffee', 'tea', 'accessory', 'food', 'gift', 'all'],
            description: 'Categoria di prodotti'
          }
        },
        required: ['userId']
      },
      handler: async (params) => {
        await new Promise(resolve => setTimeout(resolve, 600));
        
        // Different recommendations based on category
        if (params.category === 'coffee' || !params.category) {
          return {
            recommendations: [
              { id: 'coffee-bag-2', name: 'Caffè Specialty Etiopia Yirgacheffe', confidence: 0.92 },
              { id: 'coffee-bag-1', name: 'Caffè Arabica - Miscela Premium', confidence: 0.88 },
              { id: 'accessory-3', name: 'Moka Express 3 tazze', confidence: 0.75 }
            ]
          };
        } else if (params.category === 'accessory') {
          return {
            recommendations: [
              { id: 'accessory-2', name: 'French Press Premium', confidence: 0.89 },
              { id: 'accessory-1', name: 'Tazza in Ceramica CaféConnect', confidence: 0.82 },
              { id: 'accessory-3', name: 'Moka Express 3 tazze', confidence: 0.78 }
            ]
          };
        } else {
          return {
            recommendations: [
              { id: 'gift-1', name: 'Gift Box Caffè del Mondo', confidence: 0.94 },
              { id: 'food-2', name: 'Cioccolato Fondente 70%', confidence: 0.85 },
              { id: 'food-1', name: 'Biscotti alle Mandorle', confidence: 0.80 }
            ]
          };
        }
      },
      uiMetadata: {
        displayType: 'carousel',
        carouselTemplate: 'shop-products',
        refreshRate: 'per-session'
      }
    });
    
    // Register action tracking function
    this.registerFunction({
      name: 'track_user_action',
      description: 'Traccia azioni dell\'utente per migliorare le raccomandazioni',
      parameters: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'ID dell\'utente'
          },
          actionType: {
            type: 'string',
            enum: ['view', 'click', 'order', 'favorite', 'rate'],
            description: 'Tipo di azione'
          },
          itemId: {
            type: 'string',
            description: 'ID dell\'item'
          },
          itemType: {
            type: 'string',
            enum: ['menuItem', 'product'],
            description: 'Tipo di item'
          },
          rating: {
            type: 'number',
            description: 'Valutazione (1-5)'
          }
        },
        required: ['userId', 'actionType', 'itemId', 'itemType']
      },
      handler: async (params) => {
        await new Promise(resolve => setTimeout(resolve, 300));
        return {
          success: true,
          message: `Azione ${params.actionType} tracciata con successo`
        };
      }
    });
  }
}

// Create and export singleton instance
export const functionService = FunctionService.getInstance();