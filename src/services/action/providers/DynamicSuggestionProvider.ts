import { ISuggestionProvider } from '../interfaces/ISuggestionProvider';
import { UserContext } from '../../../types/UserContext';
import { ICatalogService } from '../../catalog/interfaces/ICatalogService';
import { IFunctionService } from '../../function/interfaces/IFunctionService';
import { IAIProvider } from '../../ai/interfaces/IAIProvider';
import { configManager } from '../../../config/ConfigManager';
import { Message } from '../../../types/Message';
import { promptService } from '../../prompt/PromptService';

export class DynamicSuggestionProvider implements ISuggestionProvider {
  constructor(
    private readonly catalogService: ICatalogService, 
    private readonly functionService: IFunctionService,
    private readonly aiProvider: IAIProvider
  ) {}
  
  async generateSuggestions(response: Message, userContext: UserContext, timeOfDay: string): Promise<string[]> {
    // Raccogli informazioni contestuali
    const businessConfig = configManager.getSection('business');
    
    // Ottieni informazioni sul catalogo
    const categories = this.catalogService.getCategories();
    
    // Ottieni le funzioni disponibili
    const availableFunctions = this.functionService.getAllFunctions()
      .map(fn => fn.name);
    
    // Crea un prompt per generare suggerimenti
    const prompt = await this.createSuggestionPrompt(
      businessConfig, 
      userContext, 
      timeOfDay, 
      categories,
      availableFunctions
    );
    
    try {
      // Invia il prompt all'AI per generare suggerimenti
      const response = await this.aiProvider.sendMessage(prompt, {});
      
      // Analizza la risposta dell'AI
      return this.parseSuggestions(response);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      
      // Fallback a suggerimenti generici
      return [
        'Cosa mi consigli oggi?',
        'Quali sono le specialità?',
        'Hai informazioni su questo posto?'
      ];
    }
  }
  
  private async createSuggestionPrompt(businessConfig: any, userContext: UserContext, timeOfDay: string, categories: any, availableFunctions: string[]): Promise<string> {
    return await promptService.getPrompt('suggestion_generation', {
      businessName: businessConfig.name,
      businessType: businessConfig.type,
      timeOfDay,
      menuCategories: categories.menu.join(', '),
      productCategories: categories.products.join(', '),
      availableFunctions: availableFunctions.join(', '),
      preferences: userContext.preferences.length > 0 ? userContext.preferences.map(p => `${p.itemType}:${p.itemId}`).join(', ') : 'Nessuna preferenza registrata',
      dietaryRestrictions: userContext.dietaryRestrictions.join(', ') || 'Nessuna',
      lastVisit: userContext.lastVisit || 'Prima visita'
    });
  }
  
  private parseSuggestions(response: string): string[] {
    try {
      // Tenta di estrarre l'array JSON dalla risposta
      const matches = response.match(/\[.*\]/);
      if (matches && matches[0]) {
        const suggestions = JSON.parse(matches[0]);
        return Array.isArray(suggestions) ? suggestions : [];
      }
      return [];
    } catch (error) {
      console.error('Error parsing AI suggestions:', error);
      return [];
    }
  }
}