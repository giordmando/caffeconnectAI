// src/services/analytics/nlp/NLPIntegrationService.ts
import { Message } from '../../../types/Message';
import { UIComponent } from '../../../types/UI';
import { AnalysisType } from './interfaces/INLPService';
import { nlpConfiguration } from './NLPConfiguration';
import { EnrichedUserContext } from './interfaces/EnrichedUserContext';
import { UserContext } from '../../../types/UserContext';

export class NLPIntegrationService {
  private static instance: NLPIntegrationService;
  private nlpService: any = null;
  private isInitialized: boolean = false;

  private constructor() {}

  public static getInstance(): NLPIntegrationService {
    if (!NLPIntegrationService.instance) {
      NLPIntegrationService.instance = new NLPIntegrationService();
    }
    return NLPIntegrationService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await nlpConfiguration.initialize();
      this.nlpService = nlpConfiguration.getOrchestrator();
      this.isInitialized = true;
      console.log('NLP Integration Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize NLP Integration Service', error);
      this.isInitialized = false;
    }
  }

  public async analyzeUserMessage(message: string): Promise<Record<AnalysisType, any[]> | null> {
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

  public generateNLPBasedComponents(
    message: Message, 
    analysis: Record<AnalysisType, any[]> | null
  ): UIComponent[] {
    if (!analysis) return [];

    const components: UIComponent[] = [];

    // Genera componenti solo per i tipi di analisi con risultati
    if (analysis[AnalysisType.SENTIMENT]?.length > 0) {
      components.push(this.createSentimentComponent(message, analysis[AnalysisType.SENTIMENT][0]));
    }

    if (analysis[AnalysisType.INTENT]?.length > 0) {
      components.push(this.createIntentComponent(message, analysis[AnalysisType.INTENT]));
    }

    if (analysis[AnalysisType.TOPIC]?.length > 0) {
      components.push(this.createTopicComponent(message, analysis[AnalysisType.TOPIC]));
    }

    return components;
  }

  private createSentimentComponent(message: Message, sentiment: any): UIComponent {
    return {
      type: 'sentimentIndicator',
      data: {
        sentiment,
        message: message.content
      },
      placement: 'sidebar',
      id: `sentiment-${Date.now()}`
    };
  }

  private createIntentComponent(message: Message, intents: any[]): UIComponent {
    return {
      type: 'intentSuggestions',
      data: {
        intents,
        message: message.content
      },
      placement: 'sidebar',
      id: `intents-${Date.now()}`
    };
  }

  private createTopicComponent(message: Message, topics: any[]): UIComponent {
    return {
      type: 'topicTags',
      data: {
        topics,
        message: message.content,
        isAI: message.role === 'assistant'
      },
      placement: 'sidebar',
      id: `topics-${Date.now()}`
    };
  }

  public enrichUserContext(userContext: UserContext, analysis: Record<AnalysisType, any[]> | null): EnrichedUserContext {
    const enrichedContext = { ...userContext };
    const nlpData: any = {};

    if (!analysis) return { ...enrichedContext, nlpData };

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

  public isServiceInitialized(): boolean {
    return this.isInitialized;
  }
}

export const nlpIntegrationService = NLPIntegrationService.getInstance();