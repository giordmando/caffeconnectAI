import { ISentimentAnalyzer } from '../interfaces/ISentimentAnalyzer';
import { SentimentResult } from '../../../../types/SentimentResult';
import { AnalysisResult, AnalysisType, INLPProvider, NLPProviderOptions } from '../interfaces/INLPService';

export class VADERAdapter implements INLPProvider, ISentimentAnalyzer {
  name = 'VADER';
  version = '1.0.0';
  private endpointUrl: string;
  private isInitialized: boolean = false;

  constructor(endpointUrl?: string) {
    this.endpointUrl = endpointUrl || 'http://localhost:3000/sentiment';
  }
  getSupportedAnalysisTypes(): AnalysisType[] {
    return [AnalysisType.SENTIMENT];
  }
  async analyzeText(text: string, options?: NLPProviderOptions): Promise<Record<AnalysisType, AnalysisResult[]>> {
    const result: Record<AnalysisType, AnalysisResult[]> = {} as Record<AnalysisType, AnalysisResult[]>;
    
    try {
      const sentiment = await this.analyzeSentiment(text);
      
      // Imposta i risultati
      result[AnalysisType.SENTIMENT] = [sentiment];
      
      // Imposta gli altri tipi di analisi come array vuoti
      Object.values(AnalysisType)
        .filter(type => type !== AnalysisType.SENTIMENT)
        .forEach(type => {
          result[type] = [];
        });
      
      return result;
    } catch (error) {
      console.error('Error in VADER analysis:', error);
      return this.getEmptyResult();
    }
  }
  
  private getEmptyResult(): Record<AnalysisType, AnalysisResult[]> {
    const result: Record<AnalysisType, AnalysisResult[]> = {} as Record<AnalysisType, AnalysisResult[]>;
    
    Object.values(AnalysisType).forEach(type => {
      result[type] = [];
    });
    
    return result;
  }
  
  analyzeConversation(messages: Array<{ role: string; content: string; }>, options?: NLPProviderOptions): Promise<Record<AnalysisType, AnalysisResult[]>> {
    throw new Error('Method not implemented.');
  }

  async initialize(): Promise<void> {
    this.isInitialized = true;
    console.log(`VADER sentiment analyzer initialized, endpoint: ${this.endpointUrl}`);
  }

  getName(): string {
    return this.name;
  }

  isOnline(): boolean {
    return this.isInitialized;
  }

  requiresAPIKey(): boolean {
    return false;
  }

  async analyzeSentiment(text: string): Promise<SentimentResult> {
    try {
      const response = await fetch(this.endpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testo: text })
      });

      if (!response.ok) {
        throw new Error(`Remote VADER service error: ${response.status}`);
      }

      const data = await response.json();
      const scores = data.sentiment;

      return {
        positive: scores.pos,
        negative: scores.neg,
        neutral: scores.neu,
        compound: scores.compound,
        confidence: 0.8
      };
    } catch (error) {
      console.error('Error during sentiment analysis:', error);
      return {
        positive: 0.33,
        negative: 0.33,
        neutral: 0.34,
        compound: 0,
        confidence: 0.1
      };
    }
  }
}