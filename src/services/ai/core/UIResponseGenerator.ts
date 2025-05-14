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
    functionContext?: {
      functionName?: string;
      functionResult?: any;
    }
  ): Promise<UIComponent[]> {
    // Se abbiamo un contesto di funzione, genera componenti appropriati
    if (functionContext?.functionName && functionContext?.functionResult) {
      const { functionName, functionResult } = functionContext;
      
      // Gestione speciale per search_product_by_name (risultati multipli)
      if (functionName === 'search_product_by_name') {
        return this.handleSearchProductResults(functionResult);
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
  
  // Gestisce i risultati di ricerca prodotto
  private handleSearchProductResults(data: any): UIComponent[] {
    const products = Array.isArray(data.results) && data.results.length > 0 ? data.results : [];
    
    if (data.success && products.length > 0) {
      const productDetailFactory = componentFactoryRegistry.getFactory('productDetail');
      
      if (productDetailFactory) {
        for (const product of products) {
          const component = productDetailFactory.createComponent({ product }, 'sidebar');
          this.componentManager.addComponent(component);
        }
      }
    }
    
    // Ritorna tutti i componenti gestiti dal manager
    return this.componentManager.getAllComponents();
  }
  
  async generateSuggestions(message: Message, userContext: UserContext): Promise<string[]> {
    return this.suggestionService.getSuggestedPrompts(message, userContext);
  }
  
  async generateActions(message: Message, userContext: UserContext): Promise<any[]> {
    return this.actionService.generateAvailableActions(message, userContext);
  }
}