import { AIProviderConfig } from '../types/AIProvider';
import { OpenAIService } from './openAIService';

// Interfaccia base per tutti i provider AI
export interface AIProvider {
  name: string;
  sendMessage(prompt: string, options?: any): Promise<string>;
  // Supporto per streaming (opzionale)
  streamMessage?(prompt: string, callback: (chunk: string) => void, options?: any): Promise<void>;
  providerName(): string;
}

// Classe Mock Provider per test senza API reali
export class MockAIProvider implements AIProvider {
  name = 'Mock AI';
  // Getter per il nome del provider
  providerName(): string {
    return this.name;
  }
  constructor(config: AIProviderConfig) {
    console.log('Provider Mock AI inizializzato');
  }
  
  async sendMessage(prompt: string, options?: any): Promise<string> {
    // Simuliamo una risposta ritardata
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Risposte mock basate su parole chiave nel prompt
    if (prompt.toLowerCase().includes('colazione')) {
      return "Per colazione ti consiglio il nostro Cappuccino con un Cornetto Integrale, una combinazione leggera ma energizzante per iniziare la giornata.";
    } else if (prompt.toLowerCase().includes('pranzo')) {
      return "Per pranzo, considerando le tue preferenze, ti suggerirei il Panino Veggie o l'Insalata Caesar se cerchi qualcosa di leggero ma nutriente.";
    } else if (prompt.toLowerCase().includes('aperitivo')) {
      return "Per l'aperitivo, l'Aperol Spritz è sempre un'ottima scelta, accompagnato dal nostro Tagliere Misto, ideale da condividere con amici.";
    } else if (prompt.toLowerCase().includes('caffè') || prompt.toLowerCase().includes('coffee')) {
      return "Se sei un amante del caffè, ti consiglio di provare il nostro Espresso con il Caffè Arabica Premium, o se preferisci qualcosa di più speciale, il Caffè Specialty Etiopia Yirgacheffe ha note di agrumi e miele davvero uniche.";
    } else {
      return "Posso aiutarti a scegliere qualcosa dal nostro menu o tra i prodotti disponibili. Hai preferenze per colazione, pranzo o aperitivo? O stai cercando un buon caffè da acquistare?";
    }
  }
  
  async streamMessage(prompt: string, callback: (chunk: string) => void, options?: any): Promise<void> {
    // Costruiamo una risposta mock
    let mockResponse = "";
    if (prompt.toLowerCase().includes('colazione')) {
      mockResponse = "Per colazione ti consiglio il nostro Cappuccino con un Cornetto Integrale, una combinazione leggera ma energizzante per iniziare la giornata.";
    } else if (prompt.toLowerCase().includes('pranzo')) {
      mockResponse = "Per pranzo, considerando le tue preferenze, ti suggerirei il Panino Veggie o l'Insalata Caesar se cerchi qualcosa di leggero ma nutriente.";
    } else {
      mockResponse = "Posso aiutarti a scegliere qualcosa dal nostro menu o tra i prodotti disponibili. Hai preferenze specifiche?";
    }
    
    // Dividiamo la risposta in parole per simulare lo streaming
    const words = mockResponse.split(' ');
    
    for (const word of words) {
      // Simuliamo un ritardo casuale tra le parole
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 150));
      callback(word + ' ');
    }
  }
}

// Implementazione Claude (stub per futura implementazione)
export class ClaudeProvider implements AIProvider {
  name = 'Claude';
   // Getter per il nome del provider
   providerName(): string {
    return this.name;
  }
  constructor(config: AIProviderConfig) {
    console.log('Provider Claude non completamente implementato');
  }
  
  async sendMessage(prompt: string, options?: any): Promise<string> {
    return 'Implementazione Claude non disponibile. Utilizzare OpenAI o MockAI.';
  }
}

// Implementazione Gemini (stub per futura implementazione)
export class GeminiProvider implements AIProvider {
  name = 'Gemini';
   // Getter per il nome del provider
   providerName(): string {
    return this.name;
  }
  constructor(config: AIProviderConfig) {
    console.log('Provider Gemini non completamente implementato');
  }
  
  async sendMessage(prompt: string, options?: any): Promise<string> {
    return 'Implementazione Gemini non disponibile. Utilizzare OpenAI o MockAI.';
  }
}

// Factory per creare il provider corretto
export class AIProviderFactory {
  static createProvider(type: string, config: AIProviderConfig): AIProvider {
    
    // Altrimenti utilizziamo il provider richiesto
    switch(type.toLowerCase()) {
      case 'openai':
        return new OpenAIService({
          apiKey: config.apiKey,
          model: config.model,
          temperature: config.options?.temperature,
          maxTokens: config.options?.maxTokens
        });
      case 'claude':
        return new ClaudeProvider(config);
      case 'gemini':
        return new GeminiProvider(config);
      case 'mockai':
        return new MockAIProvider(config);
      default:
        console.warn(`Provider ${type} non supportato, usando OpenAI come fallback`);
        return new OpenAIService({
          apiKey: config.apiKey,
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 1000
        });
    }
  }
}