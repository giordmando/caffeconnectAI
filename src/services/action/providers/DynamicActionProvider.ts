import { IActionProvider } from '../interfaces/IActionProvider';
import { Message } from '../../../types/Message';
import { UserContext } from '../../../types/UserContext';
import { ICatalogService } from '../../catalog/interfaces/ICatalogService';
import { IAIProvider } from '../../ai/interfaces/IAIProvider';
import { configManager } from '../../../config/ConfigManager';

export class DynamicActionProvider implements IActionProvider {
  constructor(
    private readonly catalogService: ICatalogService, 
    private readonly aiProvider: IAIProvider
  ) {}
  
  async generateActions(
    response: Message, 
    userContext: UserContext,
    timeOfDay: string
  ): Promise<any[]> {
    // Estrai informazioni rilevanti dal messaggio dell'AI
    const messageContent = response.content;
    
    try {
      // Ottieni informazioni dal catalogo
      const menuItems = await this.catalogService.getMenuItems();
      const products = await this.catalogService.getProducts();
      
      // Crea un prompt per generare azioni
      const prompt = this.createActionPrompt(
        messageContent, 
        userContext, 
        timeOfDay,
        menuItems.slice(0, 10),  // Limita per non rendere il prompt troppo grande
        products.slice(0, 10)
      );
      
      // Invia il prompt all'AI
      const aiResponse = await this.aiProvider.sendMessage(prompt, {});
      
      // Analizza la risposta dell'AI
      return this.parseActions(aiResponse);
    } catch (error) {
      console.error('Error generating actions:', error);
      // Fallback ad azioni generiche
      return [];
    }
  }
  
  private createActionPrompt(
    messageContent: string,
    userContext: UserContext,
    timeOfDay: string,
    menuItems: any[],
    products: any[]
  ): string {
    const businessConfig = configManager.getSection('business');
    
    return `Data la seguente risposta dell'AI ad un utente di ${businessConfig.name} (${businessConfig.type}):
    
"${messageContent}"

Orario attuale: ${timeOfDay}

Genera un elenco di azioni pratiche che l'utente potrebbe voler intraprendere in base alla risposta.
Considera i seguenti item dal menu e prodotti menzionati nella risposta:

Menu items disponibili:
${menuItems.map(item => `- ${item.name}`).join('\n')}

Prodotti disponibili:
${products.map(product => `- ${product.name}`).join('\n')}

Rispondi SOLO con un array JSON di oggetti azione, ciascuno con i campi "type", "title" e "payload".
Esempio: [{"type": "view_item", "title": "Vedi Cappuccino", "payload": {"id": "coffee-2", "type": "menuItem"}}]`;
  }
  
  private parseActions(response: string): any[] {
    try {
      // Estrai l'array JSON dalla risposta
      const matches = response.match(/\[([\s\S]*)\]/);
      if (matches && matches[0]) {
        const actions = JSON.parse(matches[0]);
        return Array.isArray(actions) ? actions : [];
      }
      return [];
    } catch (error) {
      console.error('Error parsing AI actions:', error);
      return [];
    }
  }
}