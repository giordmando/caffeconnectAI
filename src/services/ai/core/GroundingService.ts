import { DataContextBuilder } from './DataContextBuilder';
import { IAIProviderService } from './interfaces/IAIProviderService';
import { Message } from '../../../types/Message';
import { UserContext } from '../../../types/UserContext';
import { promptService } from '../../prompt/PromptService';

export class GroundingService {
  constructor(
    private aiProviderService: IAIProviderService
  ) {}
  
  async generateGroundedResponse(
    userMessage: string,
    functionResults: any[],
    userContext: UserContext,
    conversation: Message[],
    additionalContext: any = {}
  ): Promise<Message> {
    // Costruisci il contesto dati
    const dataContext = new DataContextBuilder();
    
    // Aggiungi risultati delle funzioni
    for (const result of functionResults) {
      dataContext.addFunctionResult(result.functionName, result.result);
    }
    
    // Aggiungi contesto utente
    dataContext.addUserContext(userContext);
    
    // Aggiungi contesto aggiuntivo
    dataContext.addCustomData('additional_context', additionalContext);
    
    const messages: Message[] =[];
    
    // Aggiungi il prompt di grounding
    messages.push({
      role: 'system',
      content: await promptService.getPrompt('rag_context', {
        retrievedContent: dataContext.buildPrompt(),
        //userPreferredDrinks: additionalContext.userPreferredDrinks || 'Nessuna preferenza registrata',
        //userPreferredFood: additionalContext.userPreferredFood || 'Nessuna preferenza registrata',
        dietaryRestrictions: additionalContext.dietaryRestrictions || 'Nessuna restrizione'
      }),
      timestamp: Date.now()
    });
    
    // Aggiungi la conversazione precedente (ultimi 3 scambi)
    const recentConversation = conversation.slice(-6); // 3 scambi (utente + assistente)
    messages.push(...recentConversation);
    
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
        content: 'Mi dispiace, ho avuto un problema nel processare la tua richiesta. Posso aiutarti in altro modo?',
        timestamp: Date.now()
      };
    }
  }
}