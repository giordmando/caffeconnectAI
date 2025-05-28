import { ConversationRecord, BaseEvent, ConsentLevel } from './types';
import { IStorageService } from './interfaces/IStorageService';
import { IConsentService } from './interfaces/IConsentService';
import { INLPService } from './nlp/interfaces/INLPService';
import { IConversationTracker } from './interfaces/IConversationTracker';
import { AnalysisType } from './nlp/interfaces/INLPService';

/**
 * Tracker di conversazione avanzato con integrazione NLP
 * Estende le funzionalità base con analisi NLP delle conversazioni
 */
export class EnhancedConversationTracker implements IConversationTracker {
  protected storage: IStorageService;
  protected consentService: IConsentService;
  protected nlpService?: INLPService;

  constructor(
    storage: IStorageService,
    consentService: IConsentService,
    nlpService?: INLPService
  ) {
    this.storage = storage;
    this.consentService = consentService;
    this.nlpService = nlpService;
  }

  getConsentService(): IConsentService {
    return this.consentService;
  }

  async startConversation(userId?: string): Promise<string> {
    // Genera ID conversazione
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Crea record
    const record: ConversationRecord = {
      id: conversationId,
      userId: userId || `anonymous_${Date.now()}`,
      startTime: new Date(),
      messages: [],
      intents: [],
      topics: []
    };
    
    // Salva solo se c'è consenso funzionale
    if (this.consentService.hasConsent(ConsentLevel.FUNCTIONAL)) {
      await this.storage.saveConversation(record);
    }
    
    return conversationId;
  }
  
  async trackEvent(event: BaseEvent): Promise<void> {
    // Esci subito se non c'è consenso funzionale
    if (!this.consentService.hasConsent(ConsentLevel.FUNCTIONAL)) {
      console.log('Evento non tracciato per mancanza di consenso');
      return;
    }
    
    try {
      console.log(`Tracciamento evento ${event.type} per conversazione ${event.conversationId}`);
      
      // Recupera conversazione
      const conversation = await this.storage.getConversation(event.conversationId);
      if (!conversation) {
        console.error(`Conversazione ${event.conversationId} non trovata`);
        return;
      }
      
      // Aggiungi evento in base al tipo
      if (event.type === 'message') {
        const hasAnalyticsConsent = this.consentService.hasConsent(ConsentLevel.ANALYTICS);
        
        console.log(`Tracciamento messaggio con consenso analitico: ${hasAnalyticsConsent}`);
        
        // Determina se abbiamo dati NLP nel messaggio
        const hasNLPData = event.data.nlpData && Object.keys(event.data.nlpData).length > 0;
        
        // Aggiungi il messaggio alla conversazione
        conversation.messages.push({
          id: `msg_${Date.now()}`,
          role: event.data.role,
          // Salva contenuto solo se c'è consenso analitico
          content: hasAnalyticsConsent ? event.data.content : "Messaggio non salvato (consenso insufficiente)",
          timestamp: event.timestamp
        });
        
        // Analizza e aggiorna intenti/topic solo con consenso analitico e se il messaggio è dell'utente
        if (hasAnalyticsConsent && event.data.role === 'user') {
          if (hasNLPData) {
            console.log('Il messaggio contiene dati NLP, li usiamo direttamente');
            
            // Aggiungi intenti dai dati NLP
            if (event.data.nlpData.intents && event.data.nlpData.intents.length > 0) {
              event.data.nlpData.intents.forEach((intent: any) => {
                const intentName = intent.name || intent.category;
                if (intentName && !conversation.intents.includes(intentName)) {
                  conversation.intents.push(intentName);
                }
              });
            }
            
            // Aggiungi topic dai dati NLP
            if (event.data.nlpData.topics && event.data.nlpData.topics.length > 0) {
              event.data.nlpData.topics.forEach((topic: any) => {
                const topicName = topic.name;
                if (topicName && !conversation.topics.includes(topicName)) {
                  conversation.topics.push(topicName);
                }
              });
            }
          } else if (this.nlpService) {
            console.log('Analisi NLP del testo del messaggio...');
            await this.enhanceWithNLP(event.data.content, conversation);
          }
        }
      }
      
      // Salva conversazione aggiornata
      await this.storage.saveConversation(conversation);
      console.log(`Evento ${event.type} tracciato con successo`);
    } catch (error) {
      console.error('Errore nel tracciamento evento:', error);
    }
  }
  
  async endConversation(conversationId: string): Promise<void> {
    if (!this.consentService.hasConsent(ConsentLevel.FUNCTIONAL)) {
      return;
    }
    
    try {
      const conversation = await this.storage.getConversation(conversationId);
      if (!conversation) return;
      
      conversation.endTime = new Date();
      await this.storage.saveConversation(conversation);
    } catch (error) {
      console.error('Errore nel terminare conversazione:', error);
    }
  }
  
  async getUserContext(userId?: string): Promise<any> {
    if (!this.consentService.hasConsent(ConsentLevel.ANALYTICS)) {
      return {}; // Contesto vuoto se non c'è consenso analitico
    }
    
    try {
      const conversations = await this.storage.getAllConversations(userId);
      return this.aggregateUserContext(conversations);
    } catch (error) {
      console.error('Errore nel recupero contesto utente:', error);
      return {};
    }
  }
  
  // Metodi privati
  
  /**
   * Utilizza il servizio NLP per analizzare il testo e migliorare i metadati della conversazione
   * @param text Testo da analizzare
   * @param conversation Conversazione da aggiornare
   */
  private async enhanceWithNLP(text: string, conversation: ConversationRecord): Promise<void> {
    if (!this.nlpService) return;
    
    try {
      // Esegui analisi NLP
      const analysis = await this.nlpService.analyzeText(text);
      
      // Estrai e aggiungi intenti
      if (analysis[AnalysisType.INTENT]?.length > 0) {
        analysis[AnalysisType.INTENT].forEach(intent => {
          const intentName = intent.name || intent.category;
          if (intentName && !conversation.intents.includes(intentName)) {
            conversation.intents.push(intentName);
          }
        });
      }
      
      // Estrai e aggiungi topic
      if (analysis[AnalysisType.TOPIC]?.length > 0) {
        analysis[AnalysisType.TOPIC].forEach(topic => {
          const topicName = topic.name;
          if (topicName && !conversation.topics.includes(topicName)) {
            conversation.topics.push(topicName);
          }
        });
      }
      
      // Possibile espansione: aggiungere altre tipologie di analisi
    } catch (error) {
      console.error('Errore durante l\'analisi NLP:', error);
      // In caso di errore, non blocchiamo il flusso
    }
  }
  
  /**
   * Aggrega i dati delle conversazioni per generare un contesto utente
   * @param conversations Elenco di conversazioni
   * @returns Contesto utente aggregato
   */
  private aggregateUserContext(conversations: ConversationRecord[]): any {
    // Estrai topic frequenti
    const topicCounts: Record<string, number> = {};
    conversations.forEach(conv => {
      conv.topics.forEach(topic => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });
    });
    
    // Estrai intenti frequenti
    const intentCounts: Record<string, number> = {};
    conversations.forEach(conv => {
      conv.intents.forEach(intent => {
        intentCounts[intent] = (intentCounts[intent] || 0) + 1;
      });
    });
    
    // Calcola interazioni totali
    const totalInteractions = conversations.reduce(
      (sum, conv) => sum + conv.messages.filter(m => m.role === 'user').length, 
      0
    );
    
    return {
      topTopics: Object.entries(topicCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([topic]) => topic),
        
      topIntents: Object.entries(intentCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([intent]) => intent),
        
      conversationCount: conversations.length,
      interactionCount: totalInteractions,
      firstInteraction: conversations.length > 0 
        ? new Date(Math.min(...conversations.map(c => new Date(c.startTime).getTime()))).toISOString()
        : null,
      lastInteraction: conversations.length > 0
        ? new Date(Math.max(...conversations.map(c => 
            c.endTime 
              ? new Date(c.endTime).getTime() 
              : new Date(c.startTime).getTime()
          ))).toISOString()
        : null
    };
  }
}