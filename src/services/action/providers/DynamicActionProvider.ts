import { IActionProvider } from '../interfaces/IActionProvider';
import { Message } from '../../../types/Message';
import { UserContext } from '../../../types/UserContext';
import { ICatalogService } from '../../catalog/interfaces/ICatalogService';
import { IAIProvider } from '../../ai/interfaces/IAIProvider';
import { configManager } from '../../../config/ConfigManager';
import { promptService } from '../../prompt/PromptService';

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
      const aiResponse = await this.aiProvider.sendMessage(await prompt, {});
      
      // Analizza la risposta dell'AI
      return this.parseActions(aiResponse);
    } catch (error) {
      console.error('Error generating actions:', error);
      // Fallback ad azioni generiche
      return [];
    }
  }
  
  private async createActionPrompt(messageContent: string, userContext: UserContext, timeOfDay: string, menuItems: any[], products: any[]): Promise<string> {
    const businessConfig = configManager.getSection('business');
    
    return await promptService.getPrompt('action_generation', {
      messageContent,
      timeOfDay,
      businessName: businessConfig.name,
      businessType: businessConfig.type,
      menuItems,
      products
    });
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