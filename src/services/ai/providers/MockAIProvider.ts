import { AIProviderConfig } from '../../../types/AIProvider';
import { Message } from '../../../types/Message';
import { IAIProvider } from '../interfaces/IAIProvider';

/**
 * Mock AI provider for testing without real API calls
 * Implements all provider interfaces for full compatibility
 */
export class MockAIProvider implements IAIProvider {
  name = 'Mock AI';
  private options: any;

  constructor(config: AIProviderConfig) {
    this.options = config.options || {}; // Salva le opzioni
    console.log('Provider Mock AI initialized with config:', config);
  }
  
  /**
   * Get the provider name
   */
  providerName(): string {
    return this.name;
  }
  
  /**
   * Send a message to the mock AI
   */
  async sendMessage(prompt: string, options?: any): Promise<string> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    let response = "";  
    // Generate mock responses based on keywords
    if (prompt.toLowerCase().includes('colazione')) {
      response = "Per colazione ti consiglio il nostro Cappuccino con un Cornetto Integrale, una combinazione leggera ma energizzante per iniziare la giornata.";
    } else if (prompt.toLowerCase().includes('pranzo')) {
      response = "Per pranzo, considerando le tue preferenze, ti suggerirei il Panino Veggie o l'Insalata Caesar se cerchi qualcosa di leggero ma nutriente.";
    } else if (prompt.toLowerCase().includes('aperitivo')) {
      response = "Per l'aperitivo, l'Aperol Spritz è sempre un'ottima scelta, accompagnato dal nostro Tagliere Misto, ideale da condividere con amici.";
    } else if (prompt.toLowerCase().includes('caffè') || prompt.toLowerCase().includes('coffee')) {
      response = "Se sei un amante del caffè, ti consiglio di provare il nostro Espresso con il Caffè Arabica Premium, o se preferisci qualcosa di più speciale, il Caffè Specialty Etiopia Yirgacheffe ha note di agrumi e miele davvero uniche.";
    } else {
      response = "Posso aiutarti a scegliere qualcosa dal nostro menu o tra i prodotti disponibili. Hai preferenze per colazione, pranzo o aperitivo? O stai cercando un buon caffè da acquistare?";
    }
    if (prompt.toLowerCase().includes('array json di stringhe')) {
      response = "Ecco un array JSON di stringhe: [\""+response+"\"]";
    }
    return response;
  }
  
  /**
   * Stream a message response
   */
  async streamMessage(prompt: string, callback: (chunk: string) => void, options?: any): Promise<void> {
    // Determine mock response
    let mockResponse = "";
    if (prompt.toLowerCase().includes('colazione')) {
      mockResponse = "Per colazione ti consiglio il nostro Cappuccino con un Cornetto Integrale, una combinazione leggera ma energizzante per iniziare la giornata.";
    } else if (prompt.toLowerCase().includes('pranzo')) {
      mockResponse = "Per pranzo, considerando le tue preferenze, ti suggerirei il Panino Veggie o l'Insalata Caesar se cerchi qualcosa di leggero ma nutriente.";
    } else {
      mockResponse = "Posso aiutarti a scegliere qualcosa dal nostro menu o tra i prodotti disponibili. Hai preferenze specifiche?";
    }
    
    // Split response into words to simulate streaming
    const words = mockResponse.split(' ');
    
    for (const word of words) {
      // Simulate random delay between words
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 150));
      callback(word + ' ');
    }
  }
  
  /**
   * Send a completion request with function calling capabilities
   */
  async sendCompletionRequest(messages: Message[], options?: any): Promise<any> {
    console.log('Mock completion request with messages:', messages);
    
    // Extract the last user message
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (!lastUserMessage) return { content: "Non ho compreso la richiesta." };
    
    const prompt = lastUserMessage.content.toLowerCase();
    let functionCall = null;
    
    // Determine if we should call a function based on content
    if (prompt.includes('punti') || prompt.includes('fedeltà') || prompt.includes('livello')) {
      functionCall = {
        name: 'get_user_loyalty_points',
        arguments: JSON.stringify({ userId: 'user-1234' })
      };
    } 
    else if (prompt.includes('prefer') || prompt.includes('gusti') || prompt.includes('cosa mi piace')) {
      functionCall = {
        name: 'get_user_preferences',
        arguments: JSON.stringify({ userId: 'user-1234' })
      };
    }
    else if (prompt.includes('colazion') || prompt.includes('mattina')) {
      functionCall = {
        name: 'get_menu_recommendations',
        arguments: JSON.stringify({ 
          userId: 'user-1234',
          timeOfDay: 'morning',
          category: 'all'
        })
      };
    }
    else if (prompt.includes('pranzo') || prompt.includes('mezzogiorno')) {
      functionCall = {
        name: 'get_menu_recommendations',
        arguments: JSON.stringify({ 
          userId: 'user-1234',
          timeOfDay: 'afternoon',
          category: 'all'
        })
      };
    }
    else if (prompt.includes('aperitivo') || prompt.includes('sera')) {
      functionCall = {
        name: 'get_menu_recommendations',
        arguments: JSON.stringify({ 
          userId: 'user-1234',
          timeOfDay: 'evening',
          category: 'all'
        })
      };
    }
    else if (prompt.includes('comprar') || prompt.includes('acquistare') || prompt.includes('prodotti')) {
      functionCall = {
        name: 'get_product_recommendations',
        arguments: JSON.stringify({ userId: 'user-1234' })
      };
    }
    
    // Return function call or regular response
    if (functionCall) {
      return {
        content: null,
        function_call: functionCall
      };
    }
    
    // Regular response
    return await this.mockRegularResponse(prompt);
  }
  
  /**
   * Generate a regular text response (no function calls)
   */
  private async mockRegularResponse(prompt: string): Promise<any> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
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

  getConfig(): any {
    return { 
      // Nella modalità mock, manteniamo l'opzione configurata dall'utente
      useMockFunctions: this.options?.useMockFunctions !== undefined 
        ? this.options.useMockFunctions 
        : true, // Default a true per il provider mock
      // altre opzioni specifiche...
    };
  }
}