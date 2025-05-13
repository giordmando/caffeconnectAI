import { ISentimentAnalyzer } from '../interfaces/ISentimentAnalyzer';
import { IIntentDetector } from '../interfaces/IIntentDetector';
import { ITopicExtractor } from '../interfaces/ITopicExtractor';
import { AnalysisResult, AnalysisType, INLPProvider, NLPProviderOptions } from '../interfaces/INLPService';
import { SentimentResult } from '../../../../types/SentimentResult';
import { IntentResult } from '../../../../types/IntentResult';
import { TopicResult } from '../../../../types/TopicResult';

export class OpenAIAdapter implements INLPProvider, ISentimentAnalyzer, IIntentDetector, ITopicExtractor {

  name = 'OpenAI';
  version = '1.0.0';
  private apiKey: string = '';
  private endpoint: string = 'https://api.openai.com/v1/chat/completions';
  private model: string = 'gpt-3.5-turbo';
  private isInitialized: boolean = false;
  
  async initialize(options?: any): Promise<void> {
    if (options?.apiKey) {
      this.apiKey = options.apiKey;
      this.isInitialized = true;
    }
    
    if (options?.endpoint) {
      this.endpoint = options.endpoint;
    }
    
    if (options?.model) {
      this.model = options.model;
    }
  }
  
  getName(): string {
    return this.name;
  }
  
  isOnline(): boolean {
    return this.isInitialized;
  }
  
  requiresAPIKey(): boolean {
    return true;
  }
  
  async analyzeSentiment(text: string): Promise<SentimentResult> {
    const prompt = `Analyze the sentiment of the following text and provide a JSON structure with positive, negative, neutral, and compound scores from 0 to 1: "${text}"`;
    
    try {
      const response = await this.callOpenAI(prompt);
      const jsonMatch = this.extractJSON(response);
      
      if (!jsonMatch) {
        throw new Error('Could not parse sentiment JSON');
      }
      
      const parsedData = JSON.parse(jsonMatch);
      
      return {
        positive: parsedData.positive || 0,
        negative: parsedData.negative || 0,
        neutral: parsedData.neutral || 0,
        compound: parsedData.compound || 0,
        confidence: parsedData.confidence || 0.7
      };
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      return { positive: 0.33, negative: 0.33, neutral: 0.34, compound: 0, confidence: 0.1 };
    }
  }
  
  async detectIntents(text: string): Promise<IntentResult[]> {
    const prompt = `Extract up to 3 most likely user intents from this text and return as JSON array with name, category, and confidence fields: "${text}"`;
    
    try {
      const response = await this.callOpenAI(prompt);
      const jsonMatch = this.extractJSON(response);
      
      if (!jsonMatch) {
        throw new Error('Could not parse intents JSON');
      }
      
      const parsedData = JSON.parse(jsonMatch);
      return Array.isArray(parsedData) ? parsedData : [];
    } catch (error) {
      console.error('Error detecting intents:', error);
      return [];
    }
  }
  
  async extractTopics(text: string): Promise<TopicResult[]> {
    const prompt = `Identify up to 3 main topics in this text and return as JSON array with name and confidence fields: "${text}"`;
    
    try {
      const response = await this.callOpenAI(prompt);
      const jsonMatch = this.extractJSON(response);
      
      if (!jsonMatch) {
        throw new Error('Could not parse topics JSON');
      }
      
      const parsedData = JSON.parse(jsonMatch);
      return Array.isArray(parsedData) ? parsedData : [];
    } catch (error) {
      console.error('Error extracting topics:', error);
      return [];
    }
  }
  
  async analyzeText(text: string, options?: any): Promise<Record<AnalysisType, any[]>> {
    const result: Record<AnalysisType, any[]> = {} as Record<AnalysisType, any[]>;
    
    try {
      // Esegui tutte le analisi in parallelo per efficienza
      const [sentiment, intents, topics] = await Promise.all([
        this.analyzeSentiment(text),
        this.detectIntents(text),
        this.extractTopics(text)
      ]);
      
      // Popola i risultati
      result[AnalysisType.SENTIMENT] = [sentiment];
      result[AnalysisType.INTENT] = intents;
      result[AnalysisType.TOPIC] = topics;
      result[AnalysisType.ENTITY] = [];
      result[AnalysisType.KEYWORD] = [];
      result[AnalysisType.LANGUAGE] = [];
      
      return result;
    } catch (error) {
      console.error('Error in OpenAI analysis:', error);
      return this.getEmptyResult();
    }
  }
  
  private async callOpenAI(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not provided');
    }
    
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: 'You are an advanced NLP analysis system. Return only JSON without any explanations.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }
  
  private extractJSON(text: string): string | null {
    // Prova a estrarre JSON racchiuso in block markdown ``````
    let jsonMatch = text.match(/``````/);
    if (jsonMatch) {
      return jsonMatch[1].trim();
    }
  
    // Prova a estrarre un array JSON
    jsonMatch = text.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      return jsonMatch[0].trim();
    }
  
    // Prova a estrarre oggetti JSON multipli o singoli
    // Matcha tutto ciò che sembra oggetti JSON separati da virgole
    const objectsMatch = text.match(/(\{[\s\S]*?\})(?:\s*,\s*(\{[\s\S]*?\}))*?/g);
    if (objectsMatch) {
      // Se c'è più di un oggetto, li racchiudiamo in un array
      if (objectsMatch.length > 1) {
        return `[${objectsMatch.join(",")}]`;
      } else {
        // Singolo oggetto JSON
        return objectsMatch[0];
      }
    }
  
    // Nessun JSON valido trovato
    return null;
  }
  
  private getEmptyResult(): Record<AnalysisType, any[]> {
    const result: Record<AnalysisType, any[]> = {} as Record<AnalysisType, any[]>;
    
    Object.values(AnalysisType).forEach(type => {
      result[type] = [];
    });
    
    return result;
  }
  getSupportedAnalysisTypes(): AnalysisType[] {
    return [AnalysisType.SENTIMENT, AnalysisType.INTENT, AnalysisType.TOPIC];
  }
  
  // Implementazione opzionale di analyzeConversation
  async analyzeConversation(messages: Array<{role: string, content: string}>, options?: NLPProviderOptions): Promise<Record<AnalysisType, AnalysisResult[]>> {
    // Implementazione dell'analisi della conversazione...
    // Per semplicità, potrebbe analizzare solo l'ultimo messaggio o combinare tutti i messaggi
    const lastMessage = messages[messages.length - 1];
    return this.analyzeText(lastMessage.content, options);
  }
}