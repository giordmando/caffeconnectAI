import { Message } from '../../../types/Message';
import { UIComponent } from '../../../types/UI';
import { UserContext } from '../../../types/UserContext';
import { IActionService } from '../../action/interfaces/IActionService';
import { ISuggestionService } from '../../action/interfaces/ISuggestionService';
import { componentFactory } from '../../ui/component/ComponentFactory';
import { ComponentManager } from '../../ui/compstore/ComponentManager';


export class UIResponseGenerator {
  constructor(
    private suggestionService: ISuggestionService,
    private actionService: IActionService,
    private componentManager: ComponentManager
  ) {}

  async generateUIComponents(
    message: Message, 
    userContext: UserContext, 
    history: Message[],
    functionContext?: any[]
  ): Promise<UIComponent[]> {
    const generatedComponents: UIComponent[] = [];
    
    if (functionContext && functionContext.length > 0) {
      for (const context of functionContext) {
        const { functionName, functionResult } = context;
        
        // Gestione speciale per risultati di ricerca
        if (functionName === 'search_product_by_name' && functionResult?.results) {
          this.handleSearchResults(functionResult.results);
          continue;
        }
        
        // Usa la factory unificata per creare componenti
        const component = componentFactory.createFromFunctionResult(
          functionName, 
          functionResult
        );
        
        if (component) {
          this.componentManager.addComponent(component);
          generatedComponents.push(component);
        }
      }
    }
    
    return generatedComponents;
  }
  
  private handleSearchResults(results: any[]): void {
    // Crea un componente per ogni risultato della ricerca
    for (const product of results) {
      const component = componentFactory.createUIComponent(
        'productDetail',
        { product },
        'inline'
      );
      
      if (component) {
        this.componentManager.addComponent(component);
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