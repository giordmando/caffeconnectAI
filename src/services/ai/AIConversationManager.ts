// src/services/ai/AIConversationManager.ts

import { IAIService } from './interfaces/IAIService';
import { Message } from '../../types/Message';
import { UserContext } from '../../types/UserContext';
import { AIResponse } from '../../types/AIResponse';
import { AIProviderConfig } from '../../types/AIProvider';
import { FunctionCallProcessor } from './FunctionCallProcessor';
import { IFunctionService } from '../function/interfaces/IFunctionService';
import { ISuggestionService } from '../action/interfaces/ISuggestionService';
import { IActionService } from '../action/interfaces/IActionService';

/**
 * Decorator per AIService che aggiunge funzionalità avanzate per gestire
 * conversazioni con più chiamate di funzioni
 * Implementa IAIService per essere intercambiabile con AIService
 */
export class AIConversationManager implements IAIService {
    private functionCallProcessor: FunctionCallProcessor;
    private maxFunctionCalls: number = 5;

    constructor(
        private baseService: IAIService, 
        private functionService: IFunctionService,
        private suggestionService: ISuggestionService,
        private actionService: IActionService
    ) {
        this.functionCallProcessor = new FunctionCallProcessor(functionService);
    }

    // Delegazione diretta al servizio base per questi metodi
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

    // Metodo delegato al servizio base
    async getCompletion(messages: Message[], userContext: UserContext): Promise<any> {
        return this.baseService.getCompletion(messages, userContext);
    }

    /**
     * Invia un messaggio con supporto avanzato per chiamate di funzioni multiple
     * Sovrascrive l'implementazione di base in AIService
     */
    async sendMessage(message: string, userContext: UserContext): Promise<AIResponse> {
        return this.sendMessageWithFunctionSupport(message, userContext);
    }

    /**
     * Implementazione con supporto per cicli di chiamate di funzioni
     * Questa è la funzionalità principale che distingue questa classe
     */
    async sendMessageWithFunctionSupport(message: string, userContext: UserContext): Promise<AIResponse> {
        // Creare messaggio utente
        const userMessage: Message = {
            role: 'user',
            content: message,
            timestamp: Date.now()
        };
        
        // Aggiungi messaggio alla conversazione
        this.baseService.addMessageToConversation(userMessage);
        
        // Ottieni la conversazione attuale per uso locale
        const conversation = this.baseService.getConversationHistory();
        
        // Traccia chiamate di funzioni
        let functionCalls = 0;
        let isResponseComplete = false;
        let aiMessage: Message | null = null;
        
        try {
            // Inizia il ciclo di chiamate di funzioni
            while (!isResponseComplete && functionCalls < this.maxFunctionCalls) {
                // Richiedi completamento dal provider AI
                const completion = await this.getCompletion(conversation, userContext);
                
                // Verifica se il completamento contiene una chiamata di funzione
                if (completion.function_call) {
                    functionCalls++;
                    
                    // Processa la chiamata di funzione
                    const functionResultMessage = await this.functionCallProcessor.processFunctionCall(
                        completion.function_call,
                        conversation
                    );
                    
                    // Aggiungi chiamata di funzione e risultato alla conversazione
                    this.baseService.addMessageToConversation({
                        role: 'assistant',
                        content: '',
                        functionCall: completion.function_call,
                        timestamp: Date.now()
                    });
                    
                    this.baseService.addMessageToConversation(functionResultMessage);
                    
                    // Continua il ciclo - abbiamo bisogno di un'altra risposta dall'AI
                } else {
                    // Nessuna chiamata di funzione, abbiamo una risposta finale
                    aiMessage = {
                        role: 'assistant',
                        content: completion.content || '',
                        timestamp: Date.now()
                    };
                    
                    // Aggiungi il messaggio finale dell'AI alla conversazione
                    this.baseService.addMessageToConversation(aiMessage);
                    
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
                this.baseService.addMessageToConversation(aiMessage);
            }
            
            // Ottieni i componenti UI e gli altri elementi della risposta
            const [uiComponents, suggestedPrompts, availableActions] = await Promise.all([
                // Usa i servizi di supporto per generare componenti UI, suggerimenti e azioni
                [], // Fallback a array vuoto
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
            this.baseService.addMessageToConversation(aiMessage);
            
            return {
                message: aiMessage,
                suggestedPrompts: ['Cosa c\'è nel menu?', 'Mostrami i prodotti', 'Quanti punti ho?']
            };
        }
    }
}