import { Message } from "../../../types/Message";
import { UIComponent } from "../../../types/UI";
import { UserContext } from "../../../types/UserContext";
import { IActionService } from "../../action/interfaces/IActionService";
import { ISuggestionService } from "../../action/interfaces/ISuggestionService";
import { ComponentManager } from "../../ui/ComponentManager";
import { componentFactoryRegistry } from "../../ui/factories/ComponentFactoryRegistry";
import { IUIResponseGenerator } from "./interfaces/IUIResponseGenerator";

export class UIResponseGenerator implements IUIResponseGenerator {
  private componentManager: ComponentManager;
  
  constructor(
    private suggestionService: ISuggestionService,
    private actionService: IActionService,
  ) {
    this.componentManager = new ComponentManager();
  }

  async generateUIComponents(
    message: Message, 
    userContext: UserContext, 
    history: Message[],
    functionContext?: any[]
  ): Promise<UIComponent[]> {
    // Se abbiamo un contesto di funzione, usa quello per generare componenti
    if (functionContext && functionContext.length > 0) {
      // Processa ogni risultato di funzione
      for (const context of functionContext) {
        const { functionName, functionResult } = context;
        
        // Gestione speciale per risultati di ricerca prodotti
        if (functionName === 'search_product_by_name') {
          // Chiama il metodo di gestione ricerca
          this.handleSearchProductResults(functionResult);
          continue; // Passa al prossimo context
        }

        // Usa le factory per generare componenti
        const component = componentFactoryRegistry.createFromFunctionResult(
          functionName, 
          this.extractDataFromFunctionResult(functionResult)
        );
        
        if (component) {
          // Aggiungi il componente al manager
          this.componentManager.addComponent(component);
        } else {
          console.warn(`No component factory found for function: ${functionName}`);
        }
      }
    }
    
    // Ritorna tutti i componenti gestiti dal manager
    return this.componentManager.getAllComponents();
  }
  
  // Estrae i dati dal risultato della funzione
  private extractDataFromFunctionResult(functionResult: any): any {
    let data = functionResult?.functionResult
      ? functionResult.functionResult.result?.data || functionResult.functionResult.result || functionResult.functionResult
      : functionResult?.data || functionResult;
    
    return data?.data || data;
  }
  
  private handleSearchProductResults(result: any): void {
    console.log('Handling search product results:', result);
    
    if (!result || !result.success) {
      console.warn('No search results to display');
      return;
    }
    
    const products = result.results || result.data.results || [result.data] || [];
    
    // Crea e aggiungi un componente per ogni prodotto trovato
    for (const product of products) {
      const productDetailFactory = componentFactoryRegistry.getFactory('productDetail');
      
      if (productDetailFactory) {
        // Crea un componente con ID univoco per ogni prodotto
        const component = productDetailFactory.createComponent(
          { product }, 
          'inline' // Cambia placement da 'sidebar' a 'inline' per renderli nella chat
        );
        
        // Assicurati che ogni componente abbia un ID univoco basato sul prodotto
        component.id = `product-detail-${product.id}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        
        console.log('Adding product component to manager:', component.id);
        this.componentManager.addComponent(component);
      } else {
        console.error('Product detail factory not found!');
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