import { INLPProviderAdapter } from '../interfaces/INLPProviderAdapter';
import { AnalysisType, AnalysisResult, NLPProviderOptions } from '../interfaces/INLPService';


export class VADERAdapter implements INLPProviderAdapter {
  name = 'VADER';
  version = '1.0.0';
  private endpointUrl: string;
  private isInitialized: boolean = false;

  constructor(endpointUrl?: string) {
    // URL dell'endpoint remoto che espone l'analisi VADER
    this.endpointUrl = endpointUrl || 'http://localhost:3000/sentiment';
  }

  async initialize(options?: NLPProviderOptions): Promise<void> {
    // Qui puoi eventualmente verificare la raggiungibilità dell'endpoint
    this.isInitialized = true;
    console.log(`VADER remote adapter initialized, endpoint: ${this.endpointUrl}`);
  }

  getSupportedAnalysisTypes(): AnalysisType[] {
    return [AnalysisType.SENTIMENT];
  }

  getSupportedLanguages(): string[] {
    return ['en'];
  }

  async analyzeText(text: string, options?: NLPProviderOptions): Promise<Record<AnalysisType, AnalysisResult[]>> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Chiamata POST all'endpoint remoto
      const response = await fetch(this.endpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testo: text })
      });

      if (!response.ok) {
        throw new Error(`Remote VADER service error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // data.sentiment dovrebbe contenere { pos, neu, neg, compound }
      const scores = data.sentiment;

      const result: Record<AnalysisType, AnalysisResult[]> = {
        [AnalysisType.SENTIMENT]: [{
          positive: scores.pos,
          negative: scores.neg,
          neutral: scores.neu,
          compound: scores.compound,
          confidence: 0.8 // valore fisso come prima
        }],
        [AnalysisType.INTENT]: [],
        [AnalysisType.ENTITY]: [],
        [AnalysisType.KEYWORD]: [],
        [AnalysisType.TOPIC]: [],
        [AnalysisType.LANGUAGE]: []
      };

      return result;
    } catch (error) {
      console.error('Error during remote VADER sentiment analysis:', error);
      return this.getEmptyResult();
    }
  }

  async analyzeConversation(messages: Array<{ role: string; content: string }>, options?: NLPProviderOptions): Promise<Record<AnalysisType, AnalysisResult[]>> {
    if (messages.length === 0) {
      return this.getEmptyResult();
    }
    const lastMessage = messages[messages.length - 1];
    return this.analyzeText(lastMessage.content, options);
  }

  getCredits(): number {
    return Infinity;
  }

  getName(): string {
    return this.name;
  }

  requiresAPIKey(): boolean {
    return false;
  }

  isOnline(): boolean {
    return this.isInitialized;
  }

  private getEmptyResult(): Record<AnalysisType, AnalysisResult[]> {
    const result: Record<AnalysisType, AnalysisResult[]> = {} as Record<AnalysisType, AnalysisResult[]>;
    Object.values(AnalysisType).forEach(type => {
      result[type] = [];
    });
    return result;
  }
}
