import { IFunctionService } from '../function/interfaces/IFunctionService';
import { ICatalogService } from '../catalog/interfaces/ICatalogService';
import { IUserContextService } from '../user/interfaces/IUserContextService';
import { IMessageService } from './MessageService';
import { IUIComponentService } from './UIComponentService';


// Definisci il tipo per l'item del carrello
export type CartItemType = 'menuItem' | 'product';

export interface IActionHandlerService {
    handleAction(action: string, payload: any): Promise<void>;
    setInputHandler(handler: (value: string) => void): void;
    setCartHandler(handler: (item: any, type: CartItemType) => void): void;
}

export class ActionHandlerService implements IActionHandlerService {
  private functionService: IFunctionService;
  private catalogService: ICatalogService;
  private userService: IUserContextService;
  private messageService: IMessageService;
  private uiComponentService: IUIComponentService;
  private setInputValue?: (value: string) => void;
  private addToCart?: (item: any, type: CartItemType) => void;
  
  constructor(
    functionService: IFunctionService,
    catalogService: ICatalogService,
    userService: IUserContextService,
    messageService: IMessageService,
    uiComponentService: IUIComponentService
  ) {
    this.functionService = functionService;
    this.catalogService = catalogService;
    this.userService = userService;
    this.messageService = messageService;
    this.uiComponentService = uiComponentService;
  }
  
  setInputHandler(handler: (value: string) => void): void {
    this.setInputValue = handler;
  }
  
  setCartHandler(handler: (item: any, type: CartItemType) => void): void {
    this.addToCart = handler;
  }
  
  async handleAction(action: string, payload: any): Promise<void> {
    console.log(`[ActionHandlerService] Processing action: ${action}`, payload);
    
    switch (action) {
      case 'execute_function':
        await this.handleFunctionExecution(payload);
        break;
        
      case 'view_item':
        await this.handleViewItem(payload);
        break;
        
      case 'order_item':
      case 'buy_item':
      case 'add_to_cart':
        await this.handleAddToCart(payload);
        break;
        
      case 'topic_selected':
        this.handleTopicSelection(payload);
        break;
        
      case 'intent_selected':
        this.handleIntentSelection(payload);
        break;
        
      default:
        console.warn(`[ActionHandlerService] Unknown action: ${action}`);
    }
  }
  
  private async handleFunctionExecution(payload: any): Promise<void> {
    const { functionName, parameters } = payload;
    
    try {
      const result = await this.functionService.executeFunction(functionName, parameters);
      
      // Crea messaggio di risposta
      let responseContent = this.generateFunctionResponse(functionName, result);
      const assistantMessage = this.messageService.createAssistantMessage(responseContent);
      this.messageService.addMessage(assistantMessage);
      
      // Gestisci componente UI se presente nel risultato
      if (result.success && result.data?.uiComponent) {
        const component = this.uiComponentService.createFunctionResultComponent(functionName, result);
        if (component) {
          this.uiComponentService.addComponent(component);
        }
      }
    } catch (error) {
      console.error(`[ActionHandlerService] Error executing function ${functionName}:`, error);
      const errorMessage = this.messageService.createAssistantMessage(
        'Mi dispiace, si è verificato un errore durante l\'elaborazione.'
      );
      this.messageService.addMessage(errorMessage);
    }
  }
  
  private async handleViewItem(payload: any): Promise<void> {
    const itemType = payload.type as 'menuItem' | 'product';
    
    try {
      const itemDetails = itemType === 'menuItem'
        ? await this.catalogService.getMenuItemById(payload.id)
        : await this.catalogService.getProductById(payload.id);
        
      if (itemDetails) {
        // Crea componente dettaglio prodotto
        const productDetailComponent = this.uiComponentService.createFunctionResultComponent(
          'view_item_details',
          {
            success: true,
            data: {
              uiComponent: {
                type: 'productDetail',
                data: itemDetails,
                placement: 'inline'
              }
            }
          }
        );
        
        if (productDetailComponent) {
          this.uiComponentService.addComponent(productDetailComponent);
        }
        
        // Aggiungi messaggio
        const message = this.messageService.createAssistantMessage(
          `Ecco i dettagli per ${itemDetails.name}.`
        );
        this.messageService.addMessage(message);
      } else {
        const errorMessage = this.messageService.createAssistantMessage(
          'Non ho trovato i dettagli per l\'item selezionato.'
        );
        this.messageService.addMessage(errorMessage);
      }
    } catch (error) {
      console.error('[ActionHandlerService] Error fetching item details:', error);
    }
  }
  
  private async handleAddToCart(payload: any): Promise<void> {
    const itemType = payload.type as 'menuItem' | 'product';
    let itemName = payload.name;
    let itemCategory = payload.category;
    
    // Recupera dettagli se mancanti
    if (!itemName || !itemCategory) {
      try {
        const itemDetails = itemType === 'menuItem'
          ? await this.catalogService.getMenuItemById(payload.id)
          : await this.catalogService.getProductById(payload.id);
          
        if (itemDetails) {
          itemName = itemDetails.name;
          itemCategory = itemDetails.category;
        } else {
          itemName = itemName || 'Item Sconosciuto';
          itemCategory = itemCategory || 'Categoria Sconosciuta';
        }
      } catch (e) {
        console.error('[ActionHandlerService] Error fetching item details:', e);
        itemName = itemName || 'Item Sconosciuto';
        itemCategory = itemCategory || 'Categoria Sconosciuta';
      }
    }
    
    // Aggiungi al carrello
    if (this.addToCart) {
      this.addToCart(payload, itemType);
    }
    
    // Conferma messaggio
    const confirmationMsg = this.messageService.createAssistantMessage(
      `Ok, ${itemName} è stato aggiunto al tuo carrello!`
    );
    this.messageService.addMessage(confirmationMsg);
    
    // Aggiorna preferenze utente
    this.userService.updatePreference({
      itemId: payload.id,
      itemName: itemName,
      itemType: itemType,
      itemCategory: itemCategory,
      rating: 4,
      timestamp: Date.now()
    });
  }
  
  private handleTopicSelection(payload: any): void {
    const topicMsg = `Parliamo di più di ${payload.topic.name}. Cosa vorresti sapere?`;
    if (this.setInputValue) {
      this.setInputValue(topicMsg);
    }
  }
  
  private handleIntentSelection(payload: any): void {
    const intentMsg = `${payload.intent.name || payload.intent.category}`;
    if (this.setInputValue) {
      this.setInputValue(intentMsg);
    }
  }
  
  private generateFunctionResponse(functionName: string, result: any): string {
    let responseText = `Azione ${functionName} processata.`;
    
    if (result.message) {
      responseText = result.message;
    } else if (result.success && result.data?.message) {
      responseText = result.data.message;
    } else if (!result.success && result.error) {
      responseText = `Errore nell'eseguire ${functionName}: ${result.error}`;
    }
    
    return responseText;
  }
}