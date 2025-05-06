// src/services/function/FunctionRegistry.ts
import { FunctionDefinition, FunctionCallResult } from '../../types/Function';
import { configManager } from '../../config/ConfigManager';
import { IFunctionService } from './interfaces/IFunctionService';

/**
 * Registry per funzioni personalizzabili
 * Permette di registrare e gestire funzioni per interazioni con l'AI
 */
export class FunctionRegistry implements IFunctionService {
  private static instance: FunctionRegistry;
  private functions: Map<string, FunctionDefinition> = new Map();
  private isInitialized: boolean = false;
  // Aggiungi questa proprietà alla classe
  private functionDataEndpoints: Record<string, string> = {};
  // Aggiungi una proprietà per tracciare se le funzioni custom sono state caricate
  private customFunctionsLoaded: boolean = false;

  // Metodo per verificare se le funzioni custom sono state caricate
  public areCustomFunctionsLoaded(): boolean {
    return this.customFunctionsLoaded;
  }
  // Aggiungi questo metodo alla classe
  public setFunctionDataEndpoints(endpoints: Record<string, string>): void {
    this.functionDataEndpoints = endpoints;
    console.log('Function data endpoints configured:', endpoints);
  }

  public getFunctionDataEndpoints(functionName: string): any {
    if (this.functionDataEndpoints[functionName]){
      console.log('Function data endpoints configured:', functionName);
      return this.functionDataEndpoints[functionName];
    }
  }

  public setisInitialized(isInitialized: boolean): void {
    this.isInitialized = isInitialized; 
    console.log('Function registry initialized:', isInitialized);
  }
  /**
   * Ottiene l'istanza singleton
   */
  public static getInstance(): FunctionRegistry {
    if (!FunctionRegistry.instance) {
      FunctionRegistry.instance = new FunctionRegistry();
    }
    return FunctionRegistry.instance;
  }
  
  /**
   * Inizializza il registry con le funzioni base e quelle personalizzate
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('Function registry already initialized');
      return;
    }
    
    // Carica funzioni personalizzate se configurate
    const functionsConfig = configManager.getSection('functions');
    if (functionsConfig.customFunctionEndpoint) {
      await this.loadCustomFunctions(functionsConfig.customFunctionEndpoint);
    }else {
      // Registra le funzioni base
      this.registerCoreFunctions();
    }
    // Filtra le funzioni in base alla configurazione
    this.filterEnabledFunctions();
    
    this.isInitialized = true;
    console.log(`Function registry initialized with ${this.functions.size} functions`);
  }
  
  /**
   * Registra una funzione
   * @param functionDef Definizione della funzione
   */
  public registerFunction(functionDef: FunctionDefinition): void {
    this.functions.set(functionDef.name, functionDef);
    console.log(`Function registered: ${functionDef.name}`);
  }
  
  /**
   * Ottiene tutte le funzioni registrate
   * @returns Array di definizioni di funzioni
   */
  public getAllFunctions(): FunctionDefinition[] {
    return Array.from(this.functions.values());
  }
  
  /**
   * Ottiene le funzioni formattate per l'API AI
   * @returns Array di definizioni di funzioni in formato API
   */
  public getFunctionsForAI(): any[] {
    return this.getAllFunctions().map(fn => ({
      name: fn.name,
      description: fn.description,
      parameters: fn.parameters
    }));
  }

  /**
   * Verifica se una funzione esiste
   * @param functionName Nome della funzione
   * @returns true se la funzione esiste
   */
  public hasFunction(functionName: string): boolean {
    return this.functions.has(functionName);
  }
  
  /**
   * Esegue una funzione
   * @param functionName Nome della funzione
   * @param parameters Parametri della funzione
   * @returns Risultato dell'esecuzione della funzione
   */
  public async executeFunction(
    functionName: string, 
    parameters: any
  ): Promise<FunctionCallResult> {
    console.log(`Executing function: ${functionName}`, parameters);
    
    if (!this.hasFunction(functionName)) {
      console.error(`Function "${functionName}" not found`);
      return {
        success: false,
        error: `Function "${functionName}" not found.`
      };
    }
    
    // Controlla se esiste un endpoint esterno per questa funzione
    if (this.functionDataEndpoints[functionName]) {
      try {
        const response = await fetch(this.functionDataEndpoints[functionName], {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(parameters)
        });
        
        if (!response.ok) {
          throw new Error(`External data fetch failed: ${response.status}`);
        }
        
        const data = await response.json();
        return {
          success: true,
          data
        };
      } catch (error) {
        console.error(`Error fetching external data for "${functionName}":`, error);
        // Fallback alla funzione originale
      }
    }
    // Usa l'implementazione reale
    const functionDef = this.functions.get(functionName)!;
    
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
   * Ottiene metadati UI per una funzione
   * @param functionName Nome della funzione
   * @returns Metadati UI o null
   */
  public getFunctionUIMetadata(functionName: string): any {
    if (!this.hasFunction(functionName)) {
      return null;
    }
    
    const functionDef = this.functions.get(functionName)!;
    return functionDef.uiMetadata || null;
  }
  
  /**
   * Carica funzioni personalizzate da un endpoint
   * @param endpoint URL dell'endpoint
   */
  private async loadCustomFunctions(endpoint: string): Promise<void> {
    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Failed to load custom functions: ${response.status}`);
      }
      
      const customFunctions = await response.json();
      console.log(`Loaded ${customFunctions.functions}`);
      // Registra le funzioni personalizzate
      for (const funcDef of customFunctions.functions) {
        const url = new URL(endpoint);
        const host = url.origin;
        const functionEndpoint = `${host}${funcDef.endpoint}`;
        console.log(`Calling custom function endpoint: ${functionEndpoint}`);
        // Crea handler che chiama l'endpoint specificato
        const handler = async (params: any) => {
        const url = new URL(endpoint);
          const host = url.origin;
          const functionEndpoint = `${host}${funcDef.endpoint}`;
          console.log(`Calling custom function endpoint: ${functionEndpoint}`, params);
            const response = await fetch(functionEndpoint, {
            method: funcDef.method || 'POST',
            headers: {'Content-Type': 'application/json'},
            ...(funcDef.method === 'POST' && { body: JSON.stringify(params) }),
            ...(funcDef.method === 'GET' && { 
                body: undefined, 
                params: new URLSearchParams(params).toString() 
              })
            });
          
          if (!response.ok) {
            throw new Error(`Function execution failed: ${response.status}`);
          }
          
          return await response.json();
        };
        
        // Registra la funzione con l'handler remoto
        this.registerFunction({
          ...funcDef,
          handler
        });
      }
      this.customFunctionsLoaded = true;
      console.log(`Loaded ${customFunctions.length} custom functions`);
    } catch (error) {
      console.error('Error loading custom functions:', error);
    }
  }
  
  /**
   * Filtra le funzioni in base a quelle abilitate nella configurazione
   */
  private filterEnabledFunctions(): void {
    const functionsConfig = configManager.getSection('functions');
    const enabledFunctions = new Set(functionsConfig.enabledFunctions);
    
    // Se non ci sono funzioni specificate, mantieni tutte
    if (enabledFunctions.size === 0) return;
    
    // Filtra le funzioni
    for (const [name] of Array.from(this.functions)) {
      if (!enabledFunctions.has(name)) {
        this.functions.delete(name);
        console.log(`Function disabled: ${name}`);
      }
    }
  }
  
  /**
   * Registra le funzioni di base
   */
  private registerCoreFunctions(): void {
    // Funzione per i punti fedeltà
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
        // Simulazione di ritardo di rete
        await new Promise(resolve => setTimeout(resolve, 500));
        return {data:{
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
        }};
      },
      uiMetadata: {
        displayType: 'card',
        cardTemplate: 'loyalty-points',
        refreshRate: 'daily'
      }
    });
    
    // Funzione per le preferenze utente
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
    
    // Funzione per raccomandazioni menu
    this.registerFunction({
      name: 'get_menu_recommendations',
      description: 'Ottieni raccomandazioni dal menu consigliate dal locale.',
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
        
        // Raccomandazioni diverse in base al momento della giornata
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
    
    // Funzione per raccomandazioni prodotti
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
        
        // Raccomandazioni diverse in base alla categoria
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
    
    // Funzione per tracciamento azioni
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

// Esporta l'istanza singleton
export const functionRegistry = FunctionRegistry.getInstance();