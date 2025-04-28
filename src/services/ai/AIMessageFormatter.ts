import { Message } from '../../types/Message';

/**
 * Service responsible for formatting messages for AI providers
 */
export class AIMessageFormatter {
  /**
   * Format messages for API communication
   */
  formatMessagesForAPI(messages: Message[]): any[] {
    return messages.map(msg => {
      const formattedMsg: any = {
        role: msg.role,
        content: msg.content
      };
      
      // Add function_call if present
      if (msg.functionCall) {
        formattedMsg.function_call = {
          name: msg.functionCall.name,
          arguments: msg.functionCall.arguments
        };
      }
      
      return formattedMsg;
    });
  }
  
  /**
   * Create a system message with appropriate prompting
   */
  createSystemMessage(functionDescriptions: string): Message {
    const systemPrompt = `
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

    return {
      role: 'system',
      content: systemPrompt,
      timestamp: Date.now()
    };
  }
}