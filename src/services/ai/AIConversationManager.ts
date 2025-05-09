import { IAIService } from './interfaces/IAIService';
import { Message } from '../../types/Message';
import { UserContext } from '../../types/UserContext';
import { AIResponse } from '../../types/AIResponse';
import { AIProviderConfig } from '../../types/AIProvider';
import { IFunctionService } from '../function/interfaces/IFunctionService';
import { ISuggestionService } from '../action/interfaces/ISuggestionService';
import { IActionService } from '../action/interfaces/IActionService';
import { UIComponent } from '../../types/UI';

/**
 * Decorator per AIService che aggiunge funzionalità avanzate per gestire
 * conversazioni con più chiamate di funzioni
 */
export class AIConversationManager implements IAIService {
  private maxFunctionCalls: number = 5;

  constructor(
    private baseService: IAIService, 
    private functionService: IFunctionService,
    private suggestionService: ISuggestionService,
    private actionService: IActionService
  ) {}

  // Metodi delegati direttamente al servizio base
  getProviderName(): string {
    return this.baseService.getProviderName();
  }

  changeProvider(provider: string, config: AIProviderConfig): void {
    this.baseService.changeProvider(provider, config);
  }

  getConversationHistory(): Message[] {
    return this.baseService.getConversationHistory();
  }

  resetConversation(): void {
    this.baseService.resetConversation();
  }

  addMessageToConversation(message: Message): void {
    this.baseService.addMessageToConversation(message);
  }

  setConversation(messages: Message[]): void {
    this.baseService.setConversation(messages);
  }

  async getCompletion(messages: Message[], userContext: UserContext): Promise<any> {
    return this.baseService.getCompletion(messages, userContext);
  }

  /**
   * Override del sendMessage con supporto avanzato per chiamate di funzioni multiple
   */
  async sendMessage(message: string, userContext: UserContext): Promise<AIResponse> {
    return this.sendMessageWithFunctionSupport(message, userContext);
  }

  // Implementazione del metodo dell'interfaccia
  async generateUIComponents(message: Message, userContext: UserContext, conversation: Message[]): Promise<UIComponent[]> {
    return this.baseService.generateUIComponents(message, userContext, conversation);
  }
  
  /**
   * Implementazione con supporto per cicli di chiamate di funzioni
   */
  async sendMessageWithFunctionSupport(message: string, userContext: UserContext): Promise<AIResponse> {
    // Crea messaggio utente
    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: Date.now()
    };
    
    // Aggiungi messaggio alla conversazione
    this.addMessageToConversation(userMessage);
    
    // Traccia chiamate di funzioni
    let functionCalls = 0;
    let isResponseComplete = false;
    let aiMessage: Message | null = null;
    
    try {
      // Inizia il ciclo di chiamate di funzioni
      while (!isResponseComplete && functionCalls < this.maxFunctionCalls) {
        // Richiedi completamento dal provider AI
        const completion = await this.getCompletion(this.getConversationHistory(), userContext);
        
        // Verifica se il completamento contiene una chiamata di funzione
        if (completion.function_call) {
          functionCalls++;
          
          // Crea un messaggio per la chiamata di funzione
          const functionCallMessage: Message = {
            role: 'assistant',
            content: '',
            functionCall: completion.function_call,
            timestamp: Date.now()
          };
          
          // Aggiungi alla conversazione
          this.addMessageToConversation(functionCallMessage);
          
          // Esegui la funzione
          const functionName = completion.function_call.name;
          let args;
          try {
            args = JSON.parse(completion.function_call.arguments);
          } catch (error) {
            console.error('Error parsing function arguments:', error);
            args = {};
          }
          
          const functionResult = await this.functionService.executeFunction(functionName, args);
          
          // Crea messaggio con il risultato
          const functionResultMessage: Message = {
            role: 'function',
            name: functionName,
            content: '',
            functionResult: {
              name: functionName,
              result: JSON.stringify(functionResult)
            },
            timestamp: Date.now()
          };
          
          // Aggiungi alla conversazione
          this.addMessageToConversation(functionResultMessage);
          
          // Continua il ciclo
        } else {
          // Nessuna chiamata di funzione, abbiamo una risposta finale
          aiMessage = {
            role: 'assistant',
            content: completion.content || '',
            timestamp: Date.now()
          };
          
          // Aggiungi il messaggio finale dell'AI alla conversazione
          this.addMessageToConversation(aiMessage);
          
          isResponseComplete = true;
        }
      }
      
      // Se abbiamo raggiunto il numero massimo di chiamate di funzioni senza una risposta finale
      if (!isResponseComplete) {
        // Genera una risposta di fallback
        aiMessage = {
          role: 'assistant',
          content: 'Sto avendo difficoltà a elaborare la tua richiesta. Potresti fornire maggiori dettagli?',
          timestamp: Date.now()
        };
        
        // Aggiungi alla conversazione
        this.addMessageToConversation(aiMessage);
      }
      
      // Ottieni i componenti UI, suggerimenti e azioni
      const [uiComponents, suggestedPrompts, availableActions] = await Promise.all([
        // Usa il metodo dell'interfaccia anziché accedere alla proprietà privata
        this.baseService.generateUIComponents(
          aiMessage!, 
          userContext,
          this.getConversationHistory()
        ),
        this.suggestionService.getSuggestedPrompts(aiMessage!, userContext),
        this.actionService.generateAvailableActions(aiMessage!, userContext)
      ]);
      
      // Restituisci la risposta completa
      return {
        message: aiMessage!,
        uiComponents,
        suggestedPrompts,
        availableActions
      };
    } catch (error) {
      console.error('Error in function support cycle:', error);
      
      // Crea una risposta di errore
      aiMessage = {
        role: 'assistant',
        content: 'Mi dispiace, ho avuto un problema nel processare la tua richiesta. Puoi riprovare?',
        timestamp: Date.now()
      };
      
      // Aggiungi messaggio di errore alla conversazione
      this.addMessageToConversation(aiMessage);
      
      return {
        message: aiMessage,
        suggestedPrompts: ['Cosa c\'è nel menu?', 'Mostrami i prodotti', 'Quanti punti ho?']
      };
    }
  }
}