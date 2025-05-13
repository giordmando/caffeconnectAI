import { AIResponse } from "../../../../types/AIResponse";
import { Message } from "../../../../types/Message";
import { IAIProviderService } from "../../core/interfaces/IAIProviderService";
import { IConversationService } from "../../core/interfaces/IConversationService";
import { IFunctionOrchestrator } from "../../core/interfaces/IFunctionOrchestrator";
import { MessageRequest } from "../interfaces/MessageRequest";
import { BaseMessageHandler } from "./BaseMessageHandler";

export class FunctionExecutionHandler extends BaseMessageHandler {
    constructor(
      private functionOrchestrator: IFunctionOrchestrator,
      private conversationService: IConversationService,
      private aiProviderService: IAIProviderService
    ) {
      super();
    }
  
    async handle(request: MessageRequest): Promise<AIResponse> {
      // Se non c'è una function call, passa al prossimo handler
      if (!request.functionCall) {
        return super.handle(request);
      }
      
      try {
         // Estrai nome e argomenti della funzione
      const functionName = request.functionCall.name;
      
      // Esegui la funzione
      const result = await this.functionOrchestrator.processFunctionCall(request.functionCall);
      
      // PUNTO CRITICO: Salva il risultato della funzione nell'oggetto request
      // Questo è il valore che verrà usato per generare i componenti UI
      request.functionResult = {
        name: functionName,
        result: result  // Salva il risultato completo, non stringificato
      };

       // Assicurati che il contenuto sia una stringa per l'API di OpenAI
      if (typeof result.content !== 'string') {
        result.content = JSON.stringify(result.content);
      }
      
      // Aggiungi il messaggio alla conversazione
      this.conversationService.addMessage({
        name: functionName,
        role: result.role || 'function',
        content: result.content,
        timestamp: result.timestamp || Date.now(),
      });
      
      // Salva il messaggio AI in request
      request.aiMessage = result;
      
       // NUOVO: Reinterpreta il risultato della funzione attraverso l'AI
      // per garantire una risposta coerente
      if (result.role === 'function' && result.content) {
        // Ottieni la conversazione aggiornata che include il risultato della funzione
        const messages = this.conversationService.formatMessagesForAI();
        
        // Aggiungi un messaggio di sistema che spiega come utilizzare il risultato della funzione
        messages.push({
          role: 'system',
          content: `Hai appena chiamato la funzione "${functionName}" e hai ricevuto un risultato. 
                   Utilizza questi dati per fornire una risposta coerente all'utente. 
                   Assicurati che la tua risposta sia pertinente al contesto della conversazione 
                   e alle informazioni fornite dalla funzione.`
        });
        
        // Chiedi all'AI di generare una risposta basata sul risultato della funzione
        const aiResponse = await this.aiProviderService.sendCompletionRequest(messages);
        
        // Crea un nuovo messaggio dell'assistente con la risposta dell'AI
        const aiMessage: Message = {
          role: 'assistant',
          content: aiResponse.content || 'Mi dispiace, non sono riuscito a elaborare queste informazioni.',
          timestamp: Date.now()
        };
        
        // Aggiungi il messaggio dell'assistente alla conversazione
        this.conversationService.addMessage(aiMessage);
        
        // Salva il messaggio AI in request
        request.aiMessage = aiMessage;
      } else {
        // Per le funzioni di visualizzazione e ricerca, usa il messaggio generato dal risultato
        request.aiMessage = result;
      }

      // Continua la pipeline
      return super.handle(request);
      } catch (error) {
        console.error('Error in function execution:', error);
        
        // Risposta di fallback
        const errorMessage: Message = {
          role: 'assistant',
          content: 'Si è verificato un errore durante l\'esecuzione della funzione.',
          timestamp: Date.now()
        };
        
        this.conversationService.addMessage(errorMessage);
        
        return { message: errorMessage };
      }
    }
  }