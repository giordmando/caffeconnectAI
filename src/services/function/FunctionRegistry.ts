import { FunctionDefinition, FunctionCallResult } from '../../types/Function';
import { configManager } from '../../config/ConfigManager';
import { IFunctionService } from './interfaces/IFunctionService';
import { catalogService } from '../catalog/CatalogService';
import { getTimeOfDay } from '../../utils/timeContext';
import { userContextService } from '../user/UserContextService'; // Assicurati che sia importato


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

  getFunctionDefinition(functionName: string): FunctionDefinition | null {
    if (!this.hasFunction(functionName)) {
      return null;
    }
    const functionDef = this.functions.get(functionName)!;
    return functionDef;
  }

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
    if (this.isInitialized) return;
  
    // SEMPRE registra le funzioni core prima
    this.registerCoreFunctions();
    
    // POI prova a caricare quelle custom
    const functionsConfig = configManager.getSection('functions');
    if (functionsConfig.customFunctionEndpoint) {
      try {
        await this.loadCustomFunctions(functionsConfig.customFunctionEndpoint);
      } catch (error) {
        console.warn('Failed to load custom functions, using core functions only:', error);
      }
    }
    
    this.filterEnabledFunctions();
    this.isInitialized = true;
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
            enum: ['beverage', 'food', 'all', 'aperitivo', 'appetizer', 'dessert'], // Aggiungi sottocategorie rilevanti come enum
            description: "Filtra per categoria. Usa 'all' per tutte le categorie. Per 'aperitivo', l'AI dovrebbe considerare sia bevande ('beverage' con subcategory 'aperitivo') sia cibo da stuzzicare ('food' con subcategory 'appetizer'). Se l'utente non specifica, spesso 'all' è una buona scelta per il momento della giornata corrente."
          }
        },
        required: ['userId', 'timeOfDay', 'category']
      },
      handler: async (params) => {
        try {
          const allItems = await catalogService.getAllMenuItems(); //
          const timeOfDay = params.timeOfDay || getTimeOfDay(); // Usa getTimeOfDay se non specificato
          const categoryOrSubcategoryFilter = (params.category || 'all').toLowerCase();
          const dietaryPreference = params.dietaryPreference; // es. "vegan"

          console.log(`[get_menu_recommendations] Params received: timeOfDay=${timeOfDay}, categoryFilter=${categoryOrSubcategoryFilter}, dietaryPreference=${dietaryPreference}`);

          let filteredItems = allItems.filter(item => {
            const matchesTime = item.timeOfDay.includes(timeOfDay);
            
            let matchesCategoryLogic = false;
            if (categoryOrSubcategoryFilter === 'all') {
              matchesCategoryLogic = true;
            } else if (categoryOrSubcategoryFilter === 'aperitivo') {
              // Caso speciale per "aperitivo": include bevande 'aperitivo' e cibo 'appetizer'
              matchesCategoryLogic = (item.category?.toLowerCase() === 'beverage' && item.subcategory?.toLowerCase() === 'aperitivo') ||
                                    (item.category?.toLowerCase() === 'food' && item.subcategory?.toLowerCase() === 'appetizer');
            } else {
              // Cerca corrispondenza sia in category che in subcategory
              matchesCategoryLogic = item.category?.toLowerCase() === categoryOrSubcategoryFilter ||
                                    item.subcategory?.toLowerCase() === categoryOrSubcategoryFilter;
            }
            
            let matchesDietary = true;
            if (dietaryPreference && item.dietaryInfo && Array.isArray(item.dietaryInfo)) {
              matchesDietary = item.dietaryInfo.map(di => di.toLowerCase()).includes(dietaryPreference.toLowerCase());
            } else if (dietaryPreference && (!item.dietaryInfo || item.dietaryInfo.length === 0)) {
              matchesDietary = false; // Se si richiede una preferenza ma l'item non ha info, è un non-match
            }
            
            return matchesTime && matchesCategoryLogic && matchesDietary;
          });

          // Logica di ordinamento e slicing per le raccomandazioni
          const recommendations = filteredItems
            .sort((a, b) => {
              // Logica di priorità per "aperitivo" se il filtro è 'aperitivo' o 'all' in serata
              if (timeOfDay === 'evening' && (categoryOrSubcategoryFilter === 'all' || categoryOrSubcategoryFilter === 'aperitivo')) {
                const aIsAperitivoContext = a.subcategory?.toLowerCase() === 'aperitivo' || a.subcategory?.toLowerCase() === 'appetizer';
                const bIsAperitivoContext = b.subcategory?.toLowerCase() === 'aperitivo' || b.subcategory?.toLowerCase() === 'appetizer';
                if (aIsAperitivoContext && !bIsAperitivoContext) return -1; // 'a' ha priorità
                if (!aIsAperitivoContext && bIsAperitivoContext) return 1;  // 'b' ha priorità
              }
              // Altrimenti (o a parità di contesto aperitivo), ordina per popolarità
              return (b.popularity || 0) - (a.popularity || 0);
            })
            .slice(0, params.limit || configManager.getSection('ui').maxRecommendations || 3) //
            .map(item => ({
              id: item.id,
              name: item.name,
              // Non serve confidence qui, la UI prenderà i dettagli da CatalogService se necessario
            }));
    
        console.log(`[get_menu_recommendations] Filtered items for ${timeOfDay} & ${categoryOrSubcategoryFilter}: ${filteredItems.length}, Recommendations: ${recommendations.length}`);
        
        return { success: true, data: { recommendations, timeOfDay: timeOfDay } };
        } catch (error) {
          console.error('Error generating recommendations:', error);
          return { recommendations: [] };
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
        
        try {
          // Ottieni dati reali dal catalogo invece di valori hardcoded
          const allItems = await catalogService.getProducts();
          
          // Filtra per categoria E momento della giornata
          let filteredItems = allItems.filter(item => {
            const matchesCategory = !params.category || params.category === 'all' || 
                                   item.category === params.category;
            return matchesCategory;
          });
          
          // Limita a 3-5 risultati rilevanti
          const recommendations = filteredItems
            /*.slice(0, 5)
            .map(item => ({
              id: item.id,
              name: item.name,
              confidence: 0.9 // o calcola in base alla rilevanza
            }));*/
          
          return { recommendations, timeOfDay: params.timeOfDay };
        } catch (error) {
          console.error('Error generating recommendations:', error);
          return { recommendations: [] };
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
          itemName: { 
            type: 'string',
            description: "Nome dell'item correlato all'azione."
          },
          itemCategory: {
            type: 'string',
            description: "Categoria specifica dell'item (es. 'coffee', 'pastry', 'main_course', 'accessory')."
          },
          rating: {
            type: 'number',
            description: 'Valutazione (1-5)'
          }
        },
        required: ['userId', 'actionType', 'itemId', 'itemType', 'itemName', 'itemCategory']
      },
      handler: async (params: {
        userId: string;
        actionType: string;
        itemId: string;
        itemName: string;
        itemType: string; 
        itemCategory: string;
        rating?: number;
        metadata?: Record<string, any>;
      }) => {
        // Logica per tracciare l'azione.
        // Per ora, aggiorniamo solo le preferenze utente se l'azione è 'order', 'favorite', o 'rate'
        console.log(`Azione utente tracciata: ${params.actionType} per l'item ${params.itemName} (ID: ${params.itemId})`);

        if (['order', 'favorite', 'rate'].includes(params.actionType)) {
          userContextService.updatePreference({
            itemId: params.itemId,
            itemName: params.itemName,
            itemType: params.itemType,
            itemCategory: params.itemCategory,
            rating: params.rating || (params.actionType === 'favorite' ? 5 : 4), // Default rating per favorite/order
            timestamp: Date.now()
          });
          return {
            success: true,
            message: `Azione ${params.actionType} per '${params.itemName}' tracciata e preferenza aggiornata.`
          };
        }
        return {
          success: true,
          message: `Azione ${params.actionType} tracciata con successo`
        };
      }
    });

    this.registerFunction({
      name: 'view_item_details',
      description: 'Visualizza dettagli completi di un prodotto o elemento del menu',
      parameters: {
        type: 'object',
        properties: {
          itemId: {
            type: 'string',
            description: 'ID dell\'item'
          },
          itemType: {
            type: 'string',
            enum: ['menuItem', 'product'],
            description: 'Tipo di item'
          }
        },
        required: ['itemId', 'itemType']
      },
      handler: async (params) => {
        try {
          // Assicurati che itemId sia una stringa e non sia null/undefined prima di procedere
          if (typeof params.itemId !== 'string' || !params.itemId) {
            console.warn(`[FunctionRegistry] view_item_details: itemId non valido o mancante:`, params.itemId);
            return {
              success: false,
              error: `ID item non valido: ${params.itemId}`,
              message: `Non riesco a trovare i dettagli perché l'identificativo dell'articolo non è corretto. Potresti riformulare la tua richiesta?`
            };
          }
          // Recupera i dettagli completi in base al tipo
          const item = params.itemType === 'menuItem' 
            ? await catalogService.getMenuItemById(params.itemId)
            : await catalogService.getProductById(params.itemId);
          
          if (!item) {
            return {
              success: false,
              error: `Elemento ${params.itemId} non trovato`,
              message: `Non ho trovato l'elemento ${params.itemId}`
            };
          }
          
          // Restituisce dati + metadati per generare UI
          return {
            success: true,
            message: `Ecco i dettagli di ${item.name}:`,
            product: item,
            uiComponent: {
              type: 'productDetail',
              data: item,
              placement: 'inline'
            }
          };
        } catch (error) {
          console.error(`Errore nel recupero dettagli per ${params.itemId}:`, error);
          return {
            success: false,
            error: `Errore nel caricamento dei dettagli: ${error instanceof Error ? error.message : String(error)}`
          };
        }
      },
      uiMetadata: {
        displayType: 'detailed-view',
        cardTemplate: 'product-detail',
        refreshRate: 'on-demand'
      }
    });

    this.registerFunction({
      name: 'search_product_by_name',
      description: 'Cerca un prodotto o elemento menu per nome',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Nome o descrizione del prodotto da cercare'
          },
          type: {
            type: 'string',
            enum: ['menuItem', 'product', 'all'],
            description: 'Tipo di prodotto da cercare'
          }
        },
        required: ['query']
      },
      handler: async (params) => {
        try {
          let results: string | any[] = [];
          const query = Array.isArray(params.query) 
            ? params.query.map((q: string) => q.toLowerCase()).join(' ') 
            : params.query.toLowerCase();
          const itemTypes = Array.isArray(params.type) ? params.type : [params.type || 'all'];
          
          // Cerca nel menu
          if (itemTypes.includes('menuItem') || itemTypes.includes('all')) {
            const menuItems = await catalogService.getAllMenuItems();
            // Spezza la query in parole chiave, tutto minuscolo
            const keywords = query.split(' ').filter(Boolean); // <-- FIXED

            const matchingItems = menuItems.filter(item => {
                // Porta i campi a minuscolo
                const name = item.name.toLowerCase();
                const description = item.description.toLowerCase();

                // Verifica se almeno una parola chiave è presente in uno dei campi
                return keywords.some((key: string) =>
                    name.includes(key) || description.includes(key)
                );
            });
  
            results = [
              ...results, 
              ...matchingItems.map(item => ({
                id: item.id,
                name: item.name,
                category: item.category,
                subcategory: item.subcategory,
                type: 'menuItem',
                description: item.description,
                price: item.price
              }))
            ];
          }
          
          // Cerca nei prodotti
          if (itemTypes.includes('product') || itemTypes.includes('all')) {
            const products = await catalogService.getProducts();

            // Spezza la query in parole chiave, tutto minuscolo
            const keywords = query.split(' ').filter(Boolean); // <-- FIXED

            const matchingProducts = products.filter(item => {
                // Porta i campi a minuscolo
                const name = item.name.toLowerCase();
                const description = item.description.toLowerCase();

                // Verifica se almeno una parola chiave è presente in uno dei campi
                return keywords.some((key: string) =>
                    name.includes(key) || description.includes(key)
                );
            });

            results = [
              ...results, 
              ...matchingProducts.map(product => ({
                id: product.id,
                name: product.name,
                category: product.category,
                type: 'product',
                description: product.description,
                price: product.price
              }))
            ];
          }
          
          return {
            success: true,
            results,
            query,
            count: results.length
          };
        } catch (error) {
          console.error('Error searching products:', error);
          return {
            success: false,
            error: `Errore nella ricerca: ${error instanceof Error ? error.message : String(error)}`
          };
        }
      }
    });

  }
}

// Esporta l'istanza singleton
export const functionRegistry = FunctionRegistry.getInstance();