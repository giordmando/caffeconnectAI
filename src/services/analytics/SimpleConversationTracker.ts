// src/services/analytics/SimpleConversationTracker.ts
import { ConversationRecord, BaseEvent, ConsentLevel } from './types';
import { SimpleStorageService } from './SimpleStorageService';
import { SimpleConsentService } from './SimpleConsentService';

export class SimpleConversationTracker {
  constructor(
    private storage: SimpleStorageService,
    private consentService: SimpleConsentService
  ) {}
  
  // Inizia una nuova conversazione
  async startConversation(): Promise<string> {
    // Genera ID conversazione
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Crea record
    const record: ConversationRecord = {
      id: conversationId,
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
  
  // Traccia un evento (messaggio o chiamata funzione)
  async trackEvent(event: BaseEvent): Promise<void> {
    // Esci subito se non c'è consenso funzionale
    if (!this.consentService.hasConsent(ConsentLevel.FUNCTIONAL)) {
      return;
    }
    
    try {
      // Recupera conversazione
      const conversation = await this.storage.getConversation(event.conversationId);
      if (!conversation) return;
      
      // Aggiungi evento in base al tipo
      if (event.type === 'message') {
        const hasAnalyticsConsent = this.consentService.hasConsent(ConsentLevel.ANALYTICS);
        
        conversation.messages.push({
          id: `msg_${Date.now()}`,
          role: event.data.role,
          // Salva contenuto solo se c'è consenso analitico
          content: hasAnalyticsConsent ? event.data.content : undefined,
          timestamp: event.timestamp
        });
        
        // Estrai e salva intenti/topic solo con consenso analitico
        if (hasAnalyticsConsent && event.data.role === 'user') {
          this.extractBasicTopics(event.data.content, conversation);
        }
      }
      
      // Salva conversazione aggiornata
      await this.storage.saveConversation(conversation);
    } catch (error) {
      console.error('Errore nel tracciamento evento:', error);
    }
  }
  
  // Termina conversazione
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
  
  // Ottieni contesto utente basato sulle conversazioni precedenti
  async getUserContext(): Promise<any> {
    if (!this.consentService.hasConsent(ConsentLevel.ANALYTICS)) {
      return {}; // Contesto vuoto se non c'è consenso analitico
    }
    
    try {
      const conversations = await this.storage.getAllConversations();
      
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
      
      // Crea contesto semplice
      return {
        topTopics: Object.entries(topicCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([topic]) => topic),
          
        topIntents: Object.entries(intentCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([intent]) => intent),
          
        conversationCount: conversations.length
      };
    } catch (error) {
      console.error('Errore nel recupero contesto utente:', error);
      return {};
    }
  }
  
  // Metodo helper per estrarre topic base da un messaggio
  private extractBasicTopics(message: string, conversation: ConversationRecord): void {
    // Implementazione molto semplice che cerca parole chiave
    // In una versione reale, useresti NLP o chiamate a un servizio AI
    
    // Lista di parole chiave rilevanti per un café
    const foodKeywords = ['caffè', 'cappuccino', 'espresso', 'cornetto', 'panino', 'colazione', 'pranzo'];
    const intentKeywords = ['ordina', 'consiglia', 'menu', 'prezzo', 'orari'];
    
    const lowerMessage = message.toLowerCase();
    
    // Cerca topic
    foodKeywords.forEach(keyword => {
      if (lowerMessage.includes(keyword) && !conversation.topics.includes(keyword)) {
        conversation.topics.push(keyword);
      }
    });
    
    // Cerca intenti
    intentKeywords.forEach(keyword => {
      if (lowerMessage.includes(keyword) && !conversation.intents.includes(keyword)) {
        conversation.intents.push(keyword);
      }
    });
  }
}