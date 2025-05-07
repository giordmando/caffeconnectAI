// src/services/nlp/NLPIntegrationService.ts

import { Message } from '../../../types/Message';
import { UIComponent } from '../../../types/UI';
import { UserContext } from '../../../types/UserContext';
import { INLPService, AnalysisType, AnalysisResult } from './interfaces/INLPService';
import { EnrichedUserContext } from './interfaces/EnrichedUserContext'; // Adjust the path if necessary
import { nlpConfiguration } from './NLPConfiguration';

/**
 * Servizio che integra l'analisi NLP nel flusso dell'applicazione
 * Implementa il principio Single Responsibility gestendo solo l'integrazione NLP
 */
export class NLPIntegrationService {
  private static instance: NLPIntegrationService;
  private nlpService: INLPService | null = null;
  private isInitialized: boolean = false;

  private constructor() {}

  /**
   * Ottiene l'istanza singleton
   */
  public static getInstance(): NLPIntegrationService {
    if (!NLPIntegrationService.instance) {
      NLPIntegrationService.instance = new NLPIntegrationService();
    }
    return NLPIntegrationService.instance;
  }

  /**
   * Inizializza il servizio
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Inizializza la configurazione NLP
      await nlpConfiguration.initialize();
      this.nlpService = nlpConfiguration.getOrchestrator();
      this.isInitialized = true;
      console.log('NLP Integration Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize NLP Integration Service', error);
      // Non blocchiamo l'applicazione se l'NLP fallisce
      this.isInitialized = false;
    }
  }

  /**
   * Analizza un messaggio utente
   */
  public async analyzeUserMessage(message: string): Promise<Record<AnalysisType, AnalysisResult[]> | null> {
    if (!this.isInitialized || !this.nlpService) {
      await this.initialize();
      if (!this.nlpService) return null;
    }

    try {
      return await this.nlpService.analyzeText(message);
    } catch (error) {
      console.error('Error analyzing user message', error);
      return null;
    }
  }

  /**
   * Analizza una conversazione completa
   */
  public async analyzeConversation(messages: Message[]): Promise<Record<AnalysisType, AnalysisResult[]> | null> {
    if (!this.isInitialized || !this.nlpService) {
      await this.initialize();
      if (!this.nlpService) return null;
    }

    try {
      const formattedMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      return await this.nlpService.analyzeConversation(formattedMessages);
    } catch (error) {
      console.error('Error analyzing conversation', error);
      return null;
    }
  }

  /**
   * Genera componenti UI basati sull'analisi NLP
   * Estende le funzionalità esistenti senza modificare il codice (Open-Closed Principle)
   */
  public generateNLPBasedComponents(
    message: Message, 
    analysis: Record<AnalysisType, AnalysisResult[]> | null
  ): UIComponent[] {
    if (!analysis) return [];

    const components: UIComponent[] = [];

    // Se abbiamo un'analisi del sentiment, mostriamola
    if (analysis[AnalysisType.SENTIMENT]?.length > 0) {
      const sentiment = analysis[AnalysisType.SENTIMENT][0];
      components.push({
        type: 'sentimentIndicator',
        data: {
          sentiment,
          message: message.content
        },
        placement: 'sidebar',
        id: `sentiment-${Date.now()}`
      });
    }

    // Se abbiamo intenti rilevati, usiamoli per suggerimenti
    if (analysis[AnalysisType.INTENT]?.length > 0) {
      components.push({
        type: 'intentSuggestions',
        data: {
          intents: analysis[AnalysisType.INTENT],
          message: message.content
        },
        placement: 'sidebar',
        id: `intents-${Date.now()}`
      });
    }

    // Se abbiamo topic rilevati, mostriamoli come tag
    if (analysis[AnalysisType.TOPIC]?.length > 0) {
      components.push({
        type: 'topicTags',
        data: {
          topics: analysis[AnalysisType.TOPIC],
          message: message.content
        },
        placement: 'sidebar',
        id: `topics-${Date.now()}`
      });
    }

    return components;
  }

  /**
   * Arricchisce il contesto utente con informazioni NLP
   */
  public enrichUserContext(userContext: UserContext, analysis: Record<AnalysisType, AnalysisResult[]> | null): EnrichedUserContext {
    
    // Crea una copia del contesto per non modificare l'originale
    const enrichedContext = { ...userContext };
    // Aggiungi informazioni NLP al contesto come proprietà dinamica
    const nlpData: any = {};

    if (!analysis) return { ...enrichedContext, nlpData };

    // Aggiungi topic e intenti al contesto per future raccomandazioni
    if (analysis[AnalysisType.TOPIC]?.length > 0) {
      nlpData.recentTopics = analysis[AnalysisType.TOPIC]
        .map(topic => topic.name || '')
        .filter(Boolean);
    }

    if (analysis[AnalysisType.INTENT]?.length > 0) {
      nlpData.recentIntents = analysis[AnalysisType.INTENT]
        .map(intent => intent.name || intent.category || '')
        .filter(Boolean);
    }

    if (analysis[AnalysisType.SENTIMENT]?.length > 0) {
      nlpData.lastSentiment = analysis[AnalysisType.SENTIMENT][0];
    }
   
    return { ...enrichedContext, nlpData };
  }

  /**
   * Verifica se il servizio è inizializzato
   */
  public isServiceInitialized(): boolean {
    return this.isInitialized;
  }
}

// Esporta l'istanza singleton
export const nlpIntegrationService = NLPIntegrationService.getInstance();