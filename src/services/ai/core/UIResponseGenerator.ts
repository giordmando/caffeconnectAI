import { Message } from "../../../types/Message";
import { UIComponent } from "../../../types/UI";
import { UserContext } from "../../../types/UserContext";
import { IActionService } from "../../action/interfaces/IActionService";
import { ISuggestionService } from "../../action/interfaces/ISuggestionService";
import { IUIResponseGenerator } from "./interfaces/IUIResponseGenerator";

export class UIResponseGenerator implements IUIResponseGenerator {
  private componentRegistry: Map<string, UIComponent> = new Map();
  private keyCounters: Record<string, number> = {};
  
  // Registro di mappature da funzioni a componenti UI
  private functionToComponentMap: Record<string, {
    componentType: string,
    getKey: (data: any) => string,
    getData: (data: any) => any,
    getPlacement: (data: any) => string,
    isUnique: boolean // Aggiunto flag per componenti unici
  }> = {};

  constructor(
    private suggestionService: ISuggestionService,
    private actionService: IActionService,
  ) {
    // Inizializza le mappature tra funzioni e componenti
    this.registerFunctionComponentMappings();
  }
  
  // Registra le mappature tra funzioni e componenti UI
  private registerFunctionComponentMappings(): void {
    // Registrazione per get_user_loyalty_points - COMPONENTE UNICO
    this.registerFunctionComponentMapping(
      'get_user_loyalty_points',
      'loyaltyCard',
      (data) => 'loyalty-card', // chiave fissa - sarà gestita internamente
      (data) => ({
        points: data.points || 0,
        tier: data.tier || 'Bronze',
        nextTier: data.nextTier || { name: 'Silver', pointsNeeded: 100 },
        history: data.history || []
      }),
      () => 'sidebar',
      true // Questo è un componente unico
    );

    // Registrazione per get_menu_recommendations
    this.registerFunctionComponentMapping(
      'get_menu_recommendations',
      'menuCarousel',
      (data) => `menu-${data.timeOfDay || 'default'}-${data.category || 'all'}`,
      (data) => ({
        recommendations: data.recommendations || [],
        timeOfDay: data.timeOfDay || 'morning',
        category: data.category || 'all'
      }),
      () => 'sidebar',
      false // Non è un componente unico
    );
    
    // Registrazione per get_product_recommendations
    this.registerFunctionComponentMapping(
      'get_product_recommendations',
      'productCarousel',
      (data) => `product-${data.category || 'all'}`,
      (data) => ({
        recommendations: data.recommendations || [],
        category: data.category || 'all'
      }),
      () => 'sidebar',
      false
    );
    
    // Registrazione per get_user_preferences - COMPONENTE UNICO
    this.registerFunctionComponentMapping(
      'get_user_preferences',
      'preferencesCard',
      (data) => 'preferences-card', // chiave fissa - sarà gestita internamente
      (data) => ({
        preferences: data || {}
      }),
      () => 'sidebar',
      true // Questo è un componente unico
    );
    
    // Registrazione per view_item_details
    this.registerFunctionComponentMapping(
      'view_item_details',
      'productDetail',
      (data) => {
        const product = data.product ? data.product : data;
        return `product-detail-${product.id || 'default'}`;
      },
      (data) => ({
        product: data.product ? data.product : data
      }),
      () => 'inline',
      false
    );
  }

  // Registra una nuova mappatura tra una funzione e un componente UI
  public registerFunctionComponentMapping(
    functionName: string,
    componentType: string,
    getKey: (data: any) => string,
    getData: (data: any) => any,
    getPlacement: (data: any) => string = () => 'sidebar',
    isUnique: boolean = false // Nuovo parametro
  ): void {
    this.functionToComponentMap[functionName] = {
      componentType,
      getKey,
      getData,
      getPlacement,
      isUnique
    };
    console.log(`Registered UI component mapping for function: ${functionName}`);
  }

  async generateUIComponents(
    message: Message, 
    userContext: UserContext, 
    history: Message[],
    functionContext?: {
      functionName?: string;
      functionResult?: any;
    }
  ): Promise<UIComponent[]> {
    // Pulizia preventiva dei componenti duplicati
    this.cleanupDuplicateComponents();
    
    // Array temporaneo per i nuovi componenti o componenti aggiornati
    const newOrUpdatedComponents: UIComponent[] = [];
    
    // Se abbiamo un contesto di funzione, genera componenti appropriati
    if (functionContext?.functionName && functionContext?.functionResult) {
      const { functionName, functionResult } = functionContext;
      
      // Estrai i dati dal risultato della funzione
      let data = this.extractDataFromFunctionResult(functionResult);
      
      // Gestione speciale per search_product_by_name (risultati multipli)
      if (functionName === 'search_product_by_name') {
        return this.handleSearchProductResults(data);
      }
      
      // Cerca una mappatura registrata per questa funzione
      const mapping = this.functionToComponentMap[functionName];
      if (mapping) {
        // Ottieni i dati formattati per il componente
        const componentData = mapping.getData(data);
        
        // Ottieni il posizionamento del componente
        const placement = mapping.getPlacement(data);
        
        if (mapping.isUnique) {
          // Per componenti unici, usa una logica speciale
          this.updateOrCreateUniqueComponent(
            mapping.componentType,
            componentData,
            placement,
            newOrUpdatedComponents
          );
        } else {
          // Per componenti normali, usa l'approccio standard
          const componentKey = mapping.getKey(data);
          this.updateOrCreateComponent(
            componentKey,
            mapping.componentType,
            componentData,
            placement,
            newOrUpdatedComponents
          );
        }
      } else {
        console.warn(`No UI component mapping found for function: ${functionName}`);
      }
    }
    
    // Restituisci i componenti ordinati e deduplicati
    return this.getOrderedAndDeduplicatedComponents(newOrUpdatedComponents);
  }
  
  // Estrae i dati dal risultato della funzione
  private extractDataFromFunctionResult(functionResult: any): any {
    let data = functionResult?.functionResult
      ? functionResult.functionResult.result?.data || functionResult.functionResult.result || functionResult.functionResult
      : functionResult?.data || functionResult;
    
    return data?.data || data;
  }
  
  // Gestisce i risultati di ricerca prodotto
  private handleSearchProductResults(data: any): UIComponent[] {
    // Prima pulisci i componenti esistenti di tipo productDetail
    this.cleanComponentsByType('productDetail');
    
    const components: UIComponent[] = [];
    const products = Array.isArray(data.results) && data.results.length > 0 ? data.results : [];
    
    if (data.success && products.length > 0) {
      for (const product of products) {
        const componentKey = `product-detail-${product.id}-${Date.now()}`;
        const component: UIComponent = {
          type: 'productDetail',
          data: { product },
          placement: 'sidebar',
          id: componentKey,
          _updated: Date.now()
        };
        // Registra il componente
        this.componentRegistry.set(componentKey, component);
        components.push(component);
      }
    }
    
    return [...components, ...this.getExistingComponents('productDetail')];
  }
  
  // Metodo per pulire componenti di un certo tipo
  private cleanComponentsByType(type: string): void {
    for (const [key, component] of Array.from(this.componentRegistry.entries())) {
      if (component.type === type) {
        this.componentRegistry.delete(key);
      }
    }
  }
  
  // Metodo per aggiornare o creare componenti standard
  private updateOrCreateComponent(
    key: string,
    type: string,
    data: any,
    placement: string,
    outputArray: UIComponent[]
  ): void {
    if (this.componentRegistry.has(key)) {
      // Aggiorna componente esistente
      const existingComponent = this.componentRegistry.get(key)!;
      const updatedComponent = {
        ...existingComponent,
        data,
        placement,
        _updated: Date.now()
      };
      this.componentRegistry.set(key, updatedComponent);
      outputArray.push(updatedComponent);
    } else {
      // Crea nuovo componente
      const newComponent: UIComponent = {
        type,
        data,
        placement,
        id: key,
        _updated: Date.now()
      };
      this.componentRegistry.set(key, newComponent);
      outputArray.push(newComponent);
    }
  }

  // Metodo per aggiornare o creare componenti di tipo "unico"
  private updateOrCreateUniqueComponent(
    type: string,
    data: any,
    placement: string,
    outputArray: UIComponent[]
  ): void {
    // Prima rimuovi tutti i componenti esistenti di questo tipo nella stessa posizione
    this.removeExistingUniqueComponents(type, placement);
    
    // Crea un nuovo componente con un ID univoco basato sul tempo
    const uniqueKey = `${type}-${placement}-${Date.now()}`;
    const newComponent: UIComponent = {
      type,
      data,
      placement,
      id: uniqueKey,
      _updated: Date.now()
    };
    
    this.componentRegistry.set(uniqueKey, newComponent);
    outputArray.push(newComponent);
  }
  
  // Metodo per rimuovere componenti unici esistenti
  private removeExistingUniqueComponents(type: string, placement: string): void {
    const keysToRemove: string[] = [];
    
    for (const [key, comp] of Array.from(this.componentRegistry.entries())) {
      if (comp.type === type && comp.placement === placement) {
        keysToRemove.push(key);
      }
    }
    
    // Rimuovi tutti i componenti identificati
    keysToRemove.forEach(key => {
      this.componentRegistry.delete(key);
    });
  }
  
  // Pulisce componenti duplicati
  private cleanupDuplicateComponents(): void {
    // Mappa per tenere traccia dei componenti unici per tipo e posizione
    const uniqueComponents = new Map<string, string[]>();
    const keysToRemove: string[] = [];
    
    // Prima identifica tutti i componenti unici
    for (const [functionName, mapping] of Object.entries(this.functionToComponentMap)) {
      if (mapping.isUnique) {
        const type = mapping.componentType;
        
        // Per ogni tipo di componente unico, identifica tutti i componenti nel registro
        for (const [key, comp] of Array.from(this.componentRegistry.entries())) {
          if (comp.type === type) {
            // Raggruppa per posizione
            const positionKey = `${type}-${comp.placement}`;
            
            if (!uniqueComponents.has(positionKey)) {
              uniqueComponents.set(positionKey, []);
            }
            
            uniqueComponents.get(positionKey)!.push(key);
          }
        }
      }
    }
    
    // Per ogni gruppo di componenti unici, mantieni solo il più recente
    for (const [positionKey, keys] of Array.from(uniqueComponents.entries())) {
      if (keys.length <= 1) continue;
      
      // Ordina per timestamp (_updated)
      keys.sort((a, b) => {
        const compA = this.componentRegistry.get(a)!;
        const compB = this.componentRegistry.get(b)!;
        return (compB._updated as number) - (compA._updated as number);
      });
      
      // Mantieni solo il più recente, marca gli altri per la rimozione
      for (let i = 1; i < keys.length; i++) {
        keysToRemove.push(keys[i]);
      }
    }
    
    // Rimuovi tutti i componenti marcati
    keysToRemove.forEach(key => {
      this.componentRegistry.delete(key);
    });
  }
  
  // Ottiene tutti i componenti esistenti, opzionalmente filtrando per tipo
  private getExistingComponents(excludeType?: string): UIComponent[] {
    return Array.from(this.componentRegistry.values())
      .filter(comp => !excludeType || comp.type !== excludeType);
  }
  
  // Restituisce componenti ordinati e deduplicati
  private getOrderedAndDeduplicatedComponents(recentlyUpdated: UIComponent[]): UIComponent[] {
    // Ottieni i componenti esistenti che non sono stati appena aggiornati
    const otherComponents = this.getExistingComponents()
      .filter(comp => !recentlyUpdated.some(updated => updated.id === comp.id));
    
    // Unisci tutti i componenti
    const allComponents = [...recentlyUpdated, ...otherComponents];
    
    // Deduplicazione aggressiva: per i tipi che dovrebbero essere unici,
    // mantieni solo il componente più recente per ogni tipo e posizione
    const uniqueTypesMap = new Map<string, UIComponent>();
    const nonUniqueComponents: UIComponent[] = [];
    
    for (const comp of allComponents) {
      // Controlla se è un tipo che dovrebbe essere unico
      const isUniqueType = Object.values(this.functionToComponentMap)
        .some(mapping => mapping.componentType === comp.type && mapping.isUnique);
      
      if (isUniqueType) {
        const key = `${comp.type}-${comp.placement}`;
        
        if (!uniqueTypesMap.has(key) || 
            (uniqueTypesMap.get(key)!._updated || 0) < (comp._updated || 0)) {
          uniqueTypesMap.set(key, comp);
        }
      } else {
        nonUniqueComponents.push(comp);
      }
    }
    
    // Unisci i componenti unici e non unici
    const deduplicatedComponents = [
      ...Array.from(uniqueTypesMap.values()),
      ...nonUniqueComponents
    ];
    
    // Ordina per timestamp di aggiornamento (decrescente)
    return deduplicatedComponents.sort((a, b) => {
      const aTime = a._updated || 0;
      const bTime = b._updated || 0;
      return bTime - aTime;
    });
  }
  
  // Metodo per pulire i componenti vecchi
  public cleanupComponents(maxAgeMs: number = 30 * 60 * 1000): void {
    const now = Date.now();
    for (const [key, component] of Array.from(this.componentRegistry.entries())) {
      if (component._updated && (now - (component._updated as number)) > maxAgeMs) {
        this.componentRegistry.delete(key);
      }
    }
  }
    
  async generateSuggestions(message: Message, userContext: UserContext): Promise<string[]> {
    return this.suggestionService.getSuggestedPrompts(message, userContext);
  }
  
  async generateActions(message: Message, userContext: UserContext): Promise<any[]> {
    return this.actionService.generateAvailableActions(message, userContext);
  }
}