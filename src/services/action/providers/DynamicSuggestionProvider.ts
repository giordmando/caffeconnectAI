import { ISuggestionProvider } from '../interfaces/ISuggestionProvider';
import { UserContext } from '../../../types/UserContext';
import { ICatalogService } from '../../catalog/interfaces/ICatalogService';
import { IFunctionService } from '../../function/interfaces/IFunctionService';
import { IAIProvider } from '../../ai/interfaces/IAIProvider';
import { configManager } from '../../../config/ConfigManager';
import { Message } from '../../../types/Message';

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
    const categories = await this.catalogService.getCategories();
    
    // Ottieni le funzioni disponibili
    const availableFunctions = this.functionService.getAllFunctions()
      .map(fn => fn.name);
    
    // Crea un prompt per generare suggerimenti
    const prompt = this.createSuggestionPrompt(
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
  
  private createSuggestionPrompt(
    businessConfig: any, 
    userContext: UserContext, 
    timeOfDay: string,
    categories: { menu: string[], products: string[] },
    availableFunctions: string[]
  ): string {
    const prompt = `Genera 3-5 suggerimenti pertinenti per un utente di ${businessConfig.name}, che è un ${businessConfig.type}.
Orario attuale: ${timeOfDay}
Categorie menu disponibili: ${categories.menu.join(', ')}
Categorie prodotti disponibili: ${categories.products.join(', ')}
Funzioni disponibili: ${availableFunctions.join(', ')}

Informazioni utente:
- Preferenze: ${userContext.preferences.length > 0 
  ? userContext.preferences.map(p => `${p.itemType}:${p.itemId}`).join(', ') 
  : 'Nessuna preferenza registrata'}
- Restrizioni alimentari: ${userContext.dietaryRestrictions.join(', ') || 'Nessuna'}
- Ultima visita: ${userContext.lastVisit || 'Prima visita'}

Non includere informazioni generiche o non pertinenti.
Non includere nomi delle funzioni o dettagli tecnici.
Assicurati che i suggerimenti siano pratici e pertinenti al contesto attuale.
Sono suggerimenti di prompt che l'untente deve proprorre all'AI, per aiutare l'utente su cosa chiedere. 
I suggerimenti devono essere formulati come domande o richieste che l'utente può porre all'AI esempio:
"Quali sono i piatti del giorno?" o "Puoi consigliarmi un cocktail?".
Cerca di essere sintetico e chiaro.
Rispondi SOLO con un array JSON di stringhe, ciascuna rappresentante un suggerimento rilevante.
Esempio: ["Suggerimento 1", "Suggerimento 2", "Suggerimento 3"]`;
return prompt;
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