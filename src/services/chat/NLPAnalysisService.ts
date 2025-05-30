import { nlpIntegrationService } from '../analytics/nlp/NLPIntegrationService';
import { Message } from '../../types/Message';

export interface INLPAnalysisService {
  isEnabled(): boolean;
  setEnabled(enabled: boolean): void;
  isInitialized(): boolean;
  initialize(): Promise<void>;
  analyzeMessage(message: string): Promise<any>;
  generateNLPData(analysis: any): any;
}

export class NLPAnalysisService implements INLPAnalysisService {
  private enabled: boolean = false;
  private initialized: boolean = false;
  
  isEnabled(): boolean {
    return this.enabled;
  }
  
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  isInitialized(): boolean {
    return this.initialized;
  }
  
  async initialize(): Promise<void> {
    if (this.initialized || !this.enabled) {
      return;
    }
    
    try {
      await nlpIntegrationService.initialize();
      this.initialized = nlpIntegrationService.isServiceInitialized();
      console.log('[NLPAnalysisService] NLP Service initialized:', this.initialized);
    } catch (error) {
      console.error('[NLPAnalysisService] Error initializing NLP service:', error);
      this.initialized = false;
    }
  }
  
  async analyzeMessage(message: string): Promise<any> {
    if (!this.initialized || !this.enabled) {
      return null;
    }
    
    try {
      return await nlpIntegrationService.analyzeUserMessage(message);
    } catch (error) {
      console.error('[NLPAnalysisService] Error analyzing message:', error);
      return null;
    }
  }
  
  generateNLPData(analysis: any): any {
    if (!analysis) return null;
    
    return {
      sentiment: analysis.sentiment?.[0] || null,
      intents: analysis.intent || [],
      topics: analysis.topic || []
    };
  }
}