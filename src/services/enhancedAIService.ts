import { AIProvider, AIProviderFactory } from './aiProviderService';
import { functionService } from './functionService';
import { getTimeOfDay } from '../utils/timeContext';
import { UserContext } from '../types/UserContext';
import { AIProviderConfig } from '../types/AIProvider';
import { mockFunctionExecution } from '../api/mockFunctionService';

// Interfaccia per i messaggi della conversazione
export interface Message {
  role: 'user' | 'assistant' | 'system' | 'function';
  content: string;
  functionCall?: {
    name: string;
    arguments: string;
  };
  functionResult?: {
    name: string;
    result: string;
  };
  timestamp: number;
}

// Interfaccia per la risposta dell'AI
export interface AIResponse {
  message: Message;
  availableActions?: {
    type: string;
    title: string;
    payload: any;
  }[];
  suggestedPrompts?: string[];
  uiComponents?: {
    type: string;
    data: any;
    placement: string;
    id: string;
  }[];
}

// Configurazione del servizio AI
interface AIServiceConfig {
  provider: string;
  providerConfig: AIProviderConfig;
  defaultSystemPrompt?: string;
  enableFunctionCalling?: boolean;
  defaultUserId?: string;
}

export class EnhancedAIService {
  private provider: AIProvider;
  private conversation: Message[] = [];
  private enableFunctionCalling: boolean;
  private defaultSystemPrompt: string;
  private defaultUserId: string;
  
  constructor(config: AIServiceConfig) {
    this.provider = AIProviderFactory.createProvider(
      config.provider, 
      config.providerConfig
    );
    
    this.enableFunctionCalling = config.enableFunctionCalling ?? true;
    this.defaultUserId = config.defaultUserId ?? 'user-1234';
    this.defaultSystemPrompt = config.defaultSystemPrompt ?? this.getDefaultSystemPrompt();
    
    // Inizializza la conversazione con il prompt di sistema
    this.conversation = [{
      role: 'system',
      content: this.defaultSystemPrompt,
      timestamp: Date.now()
    }];
    
    console.log(`Servizio AI inizializzato con provider: ${this.provider.name}`);
    if (this.provider.providerName() === 'Mock AI') {
      console.log('Modalità mock attivata: le chiamate API verranno simulate');
    }
  }

  getProviderName(): string {
    return this.provider.name;
  }
  
   // Ottiene il prompt di sistema predefinito
  private getDefaultSystemPrompt(): string {
    const availableFunctions = functionService.getAllFunctions();
    const functionDescriptions = availableFunctions
      .map(fn => `- ${fn.name}: ${fn.description}`)
      .join('\n');
    
    return `
Sei un assistente AI per CaféConnect, una caffetteria italiana di qualità.
Il tuo obiettivo è aiutare i clienti con raccomandazioni personalizzate, informazioni e supporto.

LINEE GUIDA:
1. Sii conversazionale, cordiale e conciso (max 2-3 frasi per risposta).
2. Basa le raccomandazioni sulle preferenze dell'utente, la storia degli ordini e il momento della giornata.
3. Puoi usare le seguenti funzioni per ottenere informazioni o eseguire azioni:

${functionDescriptions}

4. Suggerisci sempre articoli specifici dal nostro menu attuale o prodotti acquistabili.
5. Non inventare prodotti non presenti nelle nostre liste.
6. Adatta il tono in base al contesto: informale per chat casual, più formale per supporto.
7. Se l'utente chiede informazioni sui punti fedeltà o preferenze, usa le funzioni appropriate.
8. Se ritieni che una funzione possa fornire informazioni utili, chiamala proattivamente.

Il nostro menu e i prodotti cambiano durante la giornata, quindi fai attenzione al contesto temporale.
`;
  }
  
  // Processa una chiamata a OpenAI
  private async processOpenAIRequest(messages: Message[]): Promise<any> {
    // Se siamo in modalità mock, usa la simulazione
    if (this.provider.providerName() === 'Mock AI') {
      return this.mockOpenAIRequest(messages);
    }
    
    try {
      // Altrimenti, usa l'API reale di OpenAI tramite il provider
      const formattedMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        ...(msg.functionCall ? { function_call: {
          name: msg.functionCall.name,
          arguments: msg.functionCall.arguments
        }} : {})
      }));
      
      // Chiamata al provider per la richiesta all'API
      return await (this.provider as any).sendCompletionRequest(messages, {
        functions: this.enableFunctionCalling ? functionService.getFunctionsForAI() : undefined,
      });
    } catch (error) {
      console.error('Errore nella chiamata a OpenAI:', error);
      throw error;
    }
  }
  
  // Simulazione di una chiamata OpenAI (spostata qui dalla versione precedente)
  private async mockOpenAIRequest(messages: Message[]): Promise<any> {
    console.log('Simulazione chiamata OpenAI con function calling');
    
    // Estrai l'ultimo messaggio utente
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (!lastUserMessage) return { content: "Non ho compreso la richiesta." };
    
    const prompt = lastUserMessage.content.toLowerCase();
    let functionCall = null;
    
    // Controlla se dobbiamo chiamare una funzione in base al contenuto
    if (prompt.includes('punti') || prompt.includes('fedeltà') || prompt.includes('livello')) {
      functionCall = {
        name: 'get_user_loyalty_points',
        arguments: JSON.stringify({ userId: this.defaultUserId })
      };
    } 
    else if (prompt.includes('prefer') || prompt.includes('gusti') || prompt.includes('cosa mi piace')) {
      functionCall = {
        name: 'get_user_preferences',
        arguments: JSON.stringify({ userId: this.defaultUserId })
      };
    }
    else if (prompt.includes('colazion') || prompt.includes('mattina')) {
      functionCall = {
        name: 'get_menu_recommendations',
        arguments: JSON.stringify({ 
          userId: this.defaultUserId,
          timeOfDay: 'morning',
          category: 'all'
        })
      };
    }
    else if (prompt.includes('pranzo') || prompt.includes('mezzogiorno')) {
      functionCall = {
        name: 'get_menu_recommendations',
        arguments: JSON.stringify({ 
          userId: this.defaultUserId,
          timeOfDay: 'afternoon',
          category: 'all'
        })
      };
    }
    else if (prompt.includes('aperitivo') || prompt.includes('sera')) {
      functionCall = {
        name: 'get_menu_recommendations',
        arguments: JSON.stringify({ 
          userId: this.defaultUserId,
          timeOfDay: 'evening',
          category: 'all'
        })
      };
    }
    else if (prompt.includes('comprar') || prompt.includes('acquistare') || prompt.includes('prodotti')) {
      functionCall = {
        name: 'get_product_recommendations',
        arguments: JSON.stringify({ userId: this.defaultUserId })
      };
    }
    
    // Simuliamo una risposta diversa in base alla presenza o meno di function call
    if (functionCall) {
      return {
        content: null,
        function_call: functionCall
      };
    }
    
    // Risposta normale se non ci sono function call
    if (prompt.includes('colazione')) {
      return {
        content: "Per colazione ti consiglio il nostro Cappuccino con un Cornetto Integrale, una combinazione leggera ma energizzante per iniziare la giornata."
      };
    } else if (prompt.includes('pranzo')) {
      return {
        content: "Per pranzo, considerando le tue preferenze, ti suggerirei il Panino Veggie o l'Insalata Caesar se cerchi qualcosa di leggero ma nutriente."
      };
    } else if (prompt.includes('aperitivo')) {
      return {
        content: "Per l'aperitivo, l'Aperol Spritz è sempre un'ottima scelta, accompagnato dal nostro Tagliere Misto, ideale da condividere con amici."
      };
    } else if (prompt.includes('caffè') || prompt.includes('coffee')) {
      return {
        content: "Se sei un amante del caffè, ti consiglio di provare il nostro Espresso con il Caffè Arabica Premium, o se preferisci qualcosa di più speciale, il Caffè Specialty Etiopia Yirgacheffe ha note di agrumi e miele davvero uniche."
      };
    } else {
      return {
        content: "Posso aiutarti a scegliere qualcosa dal nostro menu o tra i prodotti disponibili. Hai preferenze per colazione, pranzo o aperitivo? O stai cercando un buon caffè da acquistare?"
      };
    }
  }
  
  // Processa una risposta AI con function call
  private async processFunctionCall(functionCall: any): Promise<Message> {
    const functionName = functionCall.name;
    const args = JSON.parse(functionCall.arguments);
    
    console.log(`Chiamata funzione: ${functionName}`, args);
    
    // Aggiungi il messaggio di chiamata funzione
    const functionCallMessage: Message = {
      role: 'function',
      content: '',
      functionCall: {
        name: functionName,
        arguments: functionCall.arguments
      },
      timestamp: Date.now()
    };
    
    this.conversation.push(functionCallMessage);
    
    // Esegui la funzione (reale o mock in base alla modalità)
    let functionResult;
    if (this.provider.providerName() === 'Mock AI') {
      functionResult = await mockFunctionExecution(functionName, args);
    } else {
      functionResult = await functionService.executeFunction(functionName, args);
    }
    
    // Crea il messaggio con il risultato della funzione
    const functionResultMessage: Message = {
      role: 'function',
      content: '',
      functionResult: {
        name: functionName,
        result: JSON.stringify(functionResult)
      },
      timestamp: Date.now()
    };
    
    this.conversation.push(functionResultMessage);
    
    // In modalità mock, generiamo una risposta basata sul risultato della funzione
    if (this.provider.providerName() === 'Mock AI') {
      const mockResponse = this.generateMockResponseForFunction(functionName, functionResult);
      return {
        role: 'assistant',
        content: mockResponse,
        timestamp: Date.now()
      };
    }
    
    // In modalità reale, invia la conversazione aggiornata per generare una risposta
    const openAIResponse = await this.processOpenAIRequest(this.conversation);
    
    return {
      role: 'assistant',
      content: openAIResponse.choices[0].message.content,
      timestamp: Date.now()
    };
  }
  
  // Genera una risposta simulata in base al risultato della funzione
  private generateMockResponseForFunction(functionName: string, functionResult: any): string {
    if (functionName === 'get_user_loyalty_points' && functionResult.success) {
      const data = functionResult.data;
      return `Hai accumulato ${data.points} punti fedeltà e sei nel livello ${data.tier}. Ti mancano ${data.nextTier.pointsNeeded} punti per raggiungere il livello ${data.nextTier.name}.`;
    } 
    else if (functionName === 'get_user_preferences' && functionResult.success) {
      const data = functionResult.data;
      return `In base alle tue preferenze, noto che apprezzi ${data.favoriteDrinks.join(' e ')} da bere e ${data.favoriteFood.join(' e ')} da mangiare. Di solito visiti il nostro locale al mattino.`;
    }
    else if (functionName === 'get_menu_recommendations' && functionResult.success) {
      const data = functionResult.data;
      const items = data.recommendations.map((r: any) => r.name).join(', ');
      let timeOfDay;
      if (typeof functionResult.args === 'string') {
        try {
          const argsfunc = JSON.parse(functionResult.args);
          timeOfDay = argsfunc.timeOfDay;
        } catch (e) {
            console.error('Errore durante il parsing di JSON:', e);
        }
      }else if (typeof functionResult.args === 'object') {
        // L'oggetto è già pronto per l'uso
        console.log('Oggetto già pronto:', functionResult.args);
        const argsfunc = functionResult.args;
        timeOfDay = argsfunc.timeOfDay;
      } else {
          console.log('Tipo non supportato:', typeof functionResult.args);
      }
      if (timeOfDay === 'morning') {
        return `Per colazione, in base alle tue preferenze, ti consiglio: ${items}. Sono tutte ottime scelte per iniziare la giornata!`;
      } else if (timeOfDay === 'afternoon') {
        return `Per pranzo oggi potresti provare: ${items}. Sono opzioni leggere ma soddisfacenti.`;
      } else {
        return `Per l'aperitivo di questa sera ti suggerisco: ${items}. Perfetti per un momento di relax.`;
      }
    }
    else if (functionName === 'get_product_recommendations' && functionResult.success) {
      const data = functionResult.data;
      const products = data.recommendations.map((r: any) => r.name).join(', ');
      return `Ecco alcuni prodotti che potrebbero interessarti per l'acquisto: ${products}. Posso darti più dettagli su uno di questi, se sei interessato.`;
    }
    else {
      return "Ho elaborato la tua richiesta, ma ho riscontrato un problema. Puoi riprovare con una domanda diversa?";
    }
  }
  
  // Ottiene suggerimenti per i prompt in base al contesto
  private getSuggestedPrompts(userContext: UserContext): string[] {
    const timeOfDay = getTimeOfDay();
    const suggestions: string[] = [];
    
    if (timeOfDay === 'morning') {
      suggestions.push('Cosa mi consigli per colazione?');
      suggestions.push('Quali caffè posso acquistare?');
    } else if (timeOfDay === 'afternoon') {
      suggestions.push('Cosa c\'è di buono per pranzo?');
      suggestions.push('Hai opzioni leggere per pranzo?');
    } else {
      suggestions.push('Consigli per l\'aperitivo?');
      suggestions.push('Avete dolci disponibili?');
    }
    
    // Aggiungi suggerimenti basati sul contesto utente
    if (userContext.preferences.length > 0) {
      suggestions.push('Quali sono le mie preferenze?');
    }
    
    suggestions.push('Quanti punti fedeltà ho?');
    
    // Restituisci un massimo di 4 suggerimenti
    return suggestions.slice(0, 4);
  }
  
  // Genera componenti UI in base al contesto della conversazione
  private generateUIComponents(
    response: Message, 
    userContext: UserContext
  ): any[] {
    const components: any[] = [];
    
    // Controlla se c'è stata una chiamata a funzione
    const lastFunctionCall = this.conversation
      .filter(m => m.functionCall)
      .pop();
      
    const lastFunctionResult = this.conversation
      .filter(m => m.functionResult)
      .pop();
    
    if (lastFunctionCall && lastFunctionResult) {
      const functionName = lastFunctionCall.functionCall!.name;
      const functionResult = JSON.parse(lastFunctionResult.functionResult!.result);
      
      if (functionResult.success) {
        const data = functionResult.data;
        const uiMetadata = functionService.getFunctionUIMetadata(functionName);
        
        if (functionName === 'get_user_loyalty_points') {
          components.push({
            type: 'loyaltyCard',
            data: {
              points: data.points,
              tier: data.tier,
              nextTier: data.nextTier,
              history: data.history
            },
            placement: 'inline',
            id: 'loyalty-card-' + Date.now()
          });
        }
        else if (functionName === 'get_menu_recommendations') {
          components.push({
            type: 'menuCarousel',
            data: {
              recommendations: data.recommendations,
              timeOfDay: JSON.parse(lastFunctionCall.functionCall!.arguments).timeOfDay
            },
            placement: 'bottom',
            id: 'menu-recommendations-' + Date.now()
          });
        }
        else if (functionName === 'get_product_recommendations') {
          components.push({
            type: 'productCarousel',
            data: {
              recommendations: data.recommendations
            },
            placement: 'bottom',
            id: 'product-recommendations-' + Date.now()
          });
        }
        else if (functionName === 'get_user_preferences') {
          components.push({
            type: 'preferencesCard',
            data: {
              preferences: data
            },
            placement: 'sidebar',
            id: 'user-preferences-' + Date.now()
          });
        }
      }
    }
    
    return components;
  }
  
  // Genera azioni disponibili in base al contesto
  private generateAvailableActions(
    response: Message, 
    userContext: UserContext
  ): any[] {
    const actions: any[] = [];
    
    // Check per menzioni di menu/prodotti specifici
    const messageContent = response.content.toLowerCase();
    
    if (messageContent.includes('cappuccino')) {
      actions.push({
        type: 'view_item',
        title: 'Vedi Cappuccino',
        payload: { id: 'coffee-2', type: 'menuItem' }
      });
    }
    
    if (messageContent.includes('cornetto')) {
      actions.push({
        type: 'view_item',
        title: 'Vedi Cornetto',
        payload: { id: 'pastry-2', type: 'menuItem' }
      });
    }
    
    if (messageContent.includes('specialty etiopia') || messageContent.includes('yirgacheffe')) {
      actions.push({
        type: 'view_item',
        title: 'Vedi Caffè Specialty Etiopia',
        payload: { id: 'coffee-bag-2', type: 'product' }
      });
    }
    
    // Aggiungi opzioni generiche se non ci sono azioni specifiche
    if (actions.length === 0) {
      const timeOfDay = getTimeOfDay();
      
      if (timeOfDay === 'morning') {
        actions.push({
          type: 'view_category',
          title: 'Menù colazione',
          payload: { category: 'breakfast', type: 'menuCategory' }
        });
      } else if (timeOfDay === 'afternoon') {
        actions.push({
          type: 'view_category',
          title: 'Menù pranzo',
          payload: { category: 'lunch', type: 'menuCategory' }
        });
      } else {
        actions.push({
          type: 'view_category',
          title: 'Menù aperitivo',
          payload: { category: 'aperitivo', type: 'menuCategory' }
        });
      }
      
      actions.push({
        type: 'view_category',
        title: 'Prodotti acquistabili',
        payload: { category: 'all', type: 'productCategory' }
      });
    }
    
    return actions;
  }
  
  // Invia un messaggio all'AI e ottieni una risposta
  public async sendMessage(
    message: string, 
    userContext: UserContext
  ): Promise<AIResponse> {
    // Aggiungi il messaggio dell'utente alla conversazione
    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: Date.now()
    };
    
    this.conversation.push(userMessage);
    
    // Prepara la risposta
    let aiMessage: Message;
    
    try {
      // Invia la conversazione completa all'API
      const openAIResponse = await this.processOpenAIRequest(this.conversation);
      
      // Controlla se c'è una chiamata a funzione
      if (openAIResponse.function_call) {
        // Processa la chiamata a funzione
        aiMessage = await this.processFunctionCall(openAIResponse.function_call);
      } else {
        // Risposta normale
        aiMessage = {
          role: 'assistant',
          content: openAIResponse.content || openAIResponse.choices?.[0]?.message?.content || '',
          timestamp: Date.now()
        };
      }
      
      // Aggiungi la risposta alla conversazione
      this.conversation.push(aiMessage);
      
      // Genera UI components, suggerimenti e azioni disponibili
      const uiComponents = this.generateUIComponents(aiMessage, userContext);
      const suggestedPrompts = this.getSuggestedPrompts(userContext);
      const availableActions = this.generateAvailableActions(aiMessage, userContext);
      
      // Registra l'interazione utente per migliorare le raccomandazioni future
      this.trackUserInteraction(message, userContext.userId);
      
      return {
        message: aiMessage,
        uiComponents,
        suggestedPrompts,
        availableActions
      };
    } catch (error) {
      console.error('Errore durante la comunicazione con l\'AI:', error);
      
      // Risposta di fallback in caso di errore
      aiMessage = {
        role: 'assistant',
        content: 'Mi dispiace, ho avuto un problema nel processare la tua richiesta. Puoi riprovare?',
        timestamp: Date.now()
      };
      
      this.conversation.push(aiMessage);
      
      return {
        message: aiMessage,
        suggestedPrompts: ['Cosa c\'è nel menu?', 'Mostrami i prodotti', 'Quanti punti ho?']
      };
    }
  }
  
  // Traccia le interazioni dell'utente per migliorare le raccomandazioni
  private async trackUserInteraction(message: string, userId: string): Promise<void> {
    try {
      // Se in modalità mock, usa le funzioni mock
      if (this.provider.providerName() === 'Mock AI') {
        await mockFunctionExecution('track_user_action', {
          userId,
          actionType: 'interaction',
          itemId: 'chat-message',
          itemType: 'conversation',
          metadata: { message }
        });
      } else {
        // Altrimenti usa le funzioni reali
        await functionService.executeFunction('track_user_action', {
          userId,
          actionType: 'interaction',
          itemId: 'chat-message',
          itemType: 'conversation',
          metadata: { message }
        });
      }
    } catch (error) {
      console.warn('Errore durante il tracciamento dell\'interazione:', error);
      // Non blocchiamo il flusso in caso di errore nel tracciamento
    }
  }
  
  // Ottieni la cronologia della conversazione
  public getConversationHistory(): Message[] {
    // Filtriamo i messaggi di sistema per semplificare
    return this.conversation.filter(m => m.role !== 'system');
  }
  
  // Resetta la conversazione
  public resetConversation(): void {
    // Mantieni solo il messaggio di sistema iniziale
    this.conversation = this.conversation.filter(m => m.role === 'system');
    console.log('Conversazione resettata');
  }
  
  // Cambia provider AI
  public changeProvider(provider: string, config: AIProviderConfig): void {
    this.provider = AIProviderFactory.createProvider(provider, config);
    console.log(`Provider AI cambiato a: ${this.provider.name}`);
  }

}

// Creazione di un'istanza con configurazione di default
export const createDefaultAIService = (): EnhancedAIService => {
  // Controlla se abbiamo un'API key nell'ambiente o usiamo la modalità mock
  const apiKey = process.env.REACT_APP_OPENAI_API_KEY || 'mock-key';
  
  return new EnhancedAIService({
    provider: 'mockai', // Cambia a 'openai' per usare OpenAI
    providerConfig: {
      apiKey,
      model: 'mockai-sim'
    },
    enableFunctionCalling: true,
  });
};