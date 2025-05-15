import { DataContextBuilder } from './DataContextBuilder';
import { IAIProviderService } from './interfaces/IAIProviderService';
import { Message } from '../../../types/Message';
import { UserContext } from '../../../types/UserContext';

export class GroundingService {
  constructor(
    private aiProviderService: IAIProviderService
  ) {}
  
  async generateGroundedResponse(
    userMessage: string,
    functionResults: any[],
    userContext: UserContext,
    conversation: Message[]
  ): Promise<Message> {
    // Costruisci il contesto dati
    const dataContext = new DataContextBuilder();
    
    // Aggiungi risultati delle funzioni
    for (const result of functionResults) {
      dataContext.addFunctionResult(result.functionName, result.result);
    }
    
    // Aggiungi contesto utente
    dataContext.addUserContext(userContext);
    
    // Crea un prompt di sistema per il grounding
    const groundingPrompt = dataContext.buildPrompt();
    
    // Prepara i messaggi per l'AI
    const messages: Message[] = [
      {
        role: 'system',
        content: 'Sei un assistente specializzato per CaféConnect. Rispondi in modo cordiale e preciso utilizzando SOLO le informazioni verificate fornite nel contesto.',
        timestamp: Date.now()
      },
      {
        role: 'system',
        content: groundingPrompt,
        timestamp: Date.now()
      }
    ];
    
    // Aggiungi la conversazione precedente (ultimi 3 scambi per esempio)
    const recentConversation = conversation.slice(-6); // 3 scambi (utente + assistente)
    messages.push(...recentConversation);
    
    // Aggiungi il messaggio utente corrente
    /*messages.push({
      role: 'user',
      content: userMessage,
      timestamp: Date.now()
    });*/
    
    try {
      // Genera risposta grounded
      const completion = await this.aiProviderService.sendCompletionRequest(messages);
      
      return {
        role: 'assistant',
        content: completion.content || 'Non sono riuscito a processare la tua richiesta.',
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error generating grounded response:', error);
      
      return {
        role: 'assistant',
        content: 'Mi dispiace, ho avuto un problema nel processare la tua richiesta. Puoi riprovare?',
        timestamp: Date.now()
      };
    }
  }
}