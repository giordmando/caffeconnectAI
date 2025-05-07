// src/services/analytics/adapters/OpenAIAdapter.ts

import { INLPProviderAdapter } from '../interfaces/INLPProviderAdapter';
import { AnalysisType, AnalysisResult, NLPProviderOptions } from '../interfaces/INLPService';

export class OpenAIAdapter implements INLPProviderAdapter {
  name = 'OpenAI';
  version = '1.0.0';
  private apiKey: string = '';
  private endpoint: string = 'https://api.openai.com/v1/chat/completions';
  private model: string = 'gpt-3.5-turbo';
  private isInitialized: boolean = false;
  
  async initialize(options?: NLPProviderOptions): Promise<void> {
    if (options?.apiKey) {
      this.apiKey = options.apiKey;
      this.isInitialized = true;
    }
    
    if (options?.endpoint) {
      this.endpoint = options.endpoint;
    }
    
    if (options?.customModels?.[AnalysisType.INTENT]) {
      this.model = options.customModels[AnalysisType.INTENT];
    }
    if (options?.customModels?.[AnalysisType.SENTIMENT]) {
      this.model = options.customModels[AnalysisType.SENTIMENT];
    }
    if (options?.customModels?.[AnalysisType.ENTITY]) {
      this.model = options.customModels[AnalysisType.ENTITY];
    }       
    if (options?.customModels?.[AnalysisType.KEYWORD]) {
      this.model = options.customModels[AnalysisType.KEYWORD];
    }
    if (options?.customModels?.[AnalysisType.TOPIC]) {
      this.model = options.customModels[AnalysisType.TOPIC];
    }
    if (options?.customModels?.[AnalysisType.LANGUAGE]) {
      this.model = options.customModels[AnalysisType.LANGUAGE];
    }
    
  }
  
  getSupportedAnalysisTypes(): AnalysisType[] {
    // Un LLM può supportare tutti i tipi di analisi
    return Object.values(AnalysisType);
  }
  
  getSupportedLanguages(): string[] {
    // GPT supporta molte lingue
    return ['en', 'it', 'fr', 'es', 'de', 'zh', 'ja', 'ko', 'ru', 'ar', 'pt', 'nl'];
  }
  
  async analyzeText(text: string, options?: NLPProviderOptions): Promise<Record<AnalysisType, AnalysisResult[]>> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not provided');
    }
    
    try {
      // Determina quali tipi di analisi eseguire
      const analysisTypes = options?.analysisTypes || [
        AnalysisType.INTENT,
        AnalysisType.SENTIMENT,
        AnalysisType.ENTITY,
        AnalysisType.KEYWORD,
        AnalysisType.TOPIC
      ];
      
      // Crea il prompt per l'LLM
      const prompt = this.createAnalysisPrompt(text, analysisTypes);
      
      // Chiamata API
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
      const content = data.choices[0]?.message?.content;
      
      // Estrai il JSON
      const jsonMatch = content.match(/```json\n([\s\S]*)\n```/) || 
                      content.match(/\{[\s\S]*\}/) ||
                      content.match(/\[[\s\S]*\]/);
                      
      if (!jsonMatch) {
        throw new Error('Could not parse JSON from LLM response');
      }
      
      // Converti in formato standard
      const parsedData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      return this.convertToStandardFormat(parsedData, analysisTypes);
    } catch (error) {
      console.error('Error calling OpenAI:', error);
      return this.getEmptyResult();
    }
  }
  
  async analyzeConversation(messages: Array<{role: string, content: string}>, options?: NLPProviderOptions): Promise<Record<AnalysisType, AnalysisResult[]>> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not provided');
    }
    
    if (messages.length === 0) {
      return this.getEmptyResult();
    }
    
    try {
      // Determina quali tipi di analisi eseguire
      const analysisTypes = options?.analysisTypes || [
        AnalysisType.INTENT,
        AnalysisType.SENTIMENT,
        AnalysisType.TOPIC
      ];
      
      // Formatta la conversazione per l'analisi
      const formattedConversation = messages.map(m => 
        `${m.role}: ${m.content}`
      ).join('\n\n');
      
      // Crea il prompt per l'analisi della conversazione
      const prompt = this.createConversationAnalysisPrompt(formattedConversation, analysisTypes);
      
      // Chiamata API
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
      const content = data.choices[0]?.message?.content;
      
      // Estrai il JSON
      const jsonMatch = content.match(/```json\n([\s\S]*)\n```/) || 
                      content.match(/\{[\s\S]*\}/) ||
                      content.match(/\[[\s\S]*\]/);
                      
      if (!jsonMatch) {
        throw new Error('Could not parse JSON from LLM response');
      }
      
      // Converti in formato standard
      const parsedData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      return this.convertToStandardFormat(parsedData, analysisTypes);
    } catch (error) {
      console.error('Error analyzing conversation with OpenAI:', error);
      
      // Fallback: analizza solo l'ultimo messaggio
      const lastMessage = messages[messages.length - 1];
      return this.analyzeText(lastMessage.content, options);
    }
  }
  
  getCredits(): number {
    // Dipende dall'account OpenAI
    return -1; // -1 indica che non è possibile determinare il credito residuo
  }
  
  getName(): string {
    return this.name;
  }
  
  requiresAPIKey(): boolean {
    return true;
  }
  
  isOnline(): boolean {
    return this.isInitialized;
  }
  
  private createAnalysisPrompt(text: string, analysisTypes: AnalysisType[]): string {
    let prompt = `Analyze the following text and provide a JSON structure with the analysis results:\n\n"${text}"\n\n`;
    
    prompt += 'Include the following analysis types in your JSON response:\n';
    
    if (analysisTypes.includes(AnalysisType.INTENT)) {
      prompt += '- intents: Extract up to 3 most likely user intents\n';
    }
    
    if (analysisTypes.includes(AnalysisType.SENTIMENT)) {
      prompt += '- sentiment: Analyze the sentiment (positive, negative, neutral)\n';
    }
    
    if (analysisTypes.includes(AnalysisType.ENTITY)) {
      prompt += '- entities: Extract named entities (people, places, organizations, dates, etc.)\n';
    }
    
    if (analysisTypes.includes(AnalysisType.KEYWORD)) {
      prompt += '- keywords: Extract up to 5 key terms from the text\n';
    }
    
    if (analysisTypes.includes(AnalysisType.TOPIC)) {
      prompt += '- topics: Identify up to 3 main topics in the text\n';
    }
    
    if (analysisTypes.includes(AnalysisType.LANGUAGE)) {
      prompt += '- language: Detect the language of the text\n';
    }
    
    prompt += '\nReturn the results as a JSON object with the following structure:\n';
    prompt += '```json\n';
    prompt += '{\n';
    
    if (analysisTypes.includes(AnalysisType.INTENT)) {
      prompt += '  "intents": [\n    {"name": "intent_name", "category": "intent_category", "confidence": 0.9}\n  ],\n';
    }
    
    if (analysisTypes.includes(AnalysisType.SENTIMENT)) {
      prompt += '  "sentiment": {"positive": 0.7, "negative": 0.1, "neutral": 0.2, "compound": 0.6},\n';
    }
    
    if (analysisTypes.includes(AnalysisType.ENTITY)) {
      prompt += '  "entities": [\n    {"text": "entity_text", "type": "entity_type", "confidence": 0.8}\n  ],\n';
    }
    
    if (analysisTypes.includes(AnalysisType.KEYWORD)) {
      prompt += '  "keywords": ["keyword1", "keyword2", "keyword3"],\n';
    }
    
    if (analysisTypes.includes(AnalysisType.TOPIC)) {
      prompt += '  "topics": [\n    {"name": "topic_name", "confidence": 0.85}\n  ],\n';
    }
    
    if (analysisTypes.includes(AnalysisType.LANGUAGE)) {
      prompt += '  "language": {"detected": "en", "confidence": 0.95}\n';
    }
    
    prompt += '}\n```\n';
    
    return prompt;
  }
  
  private createConversationAnalysisPrompt(conversation: string, analysisTypes: AnalysisType[]): string {
    return `Analyze the following conversation and provide a JSON structure with analysis only for the last message:\n\n${conversation}\n\n` +
    this.createAnalysisPrompt('', analysisTypes).replace('Analyze the following text', '');
  }
  
  private convertToStandardFormat(data: any, analysisTypes: AnalysisType[]): Record<AnalysisType, AnalysisResult[]> {
    const result: Record<AnalysisType, AnalysisResult[]> = {} as Record<AnalysisType, AnalysisResult[]>;
    
    // Inizializza tutti i tipi con array vuoti
    Object.values(AnalysisType).forEach(type => {
      result[type] = [];
    });
    
    // Popola i risultati in base a ciò che è stato analizzato
    if (analysisTypes.includes(AnalysisType.INTENT) && data.intents) {
      result[AnalysisType.INTENT] = data.intents;
    }
    
    if (analysisTypes.includes(AnalysisType.SENTIMENT) && data.sentiment) {
      result[AnalysisType.SENTIMENT] = [data.sentiment];
    }
    
    if (analysisTypes.includes(AnalysisType.ENTITY) && data.entities) {
      result[AnalysisType.ENTITY] = data.entities;
    }
    
    if (analysisTypes.includes(AnalysisType.KEYWORD) && data.keywords) {
      result[AnalysisType.KEYWORD] = data.keywords.map((k: string) => ({ text: k, confidence: 0.8 }));
    }
    
    if (analysisTypes.includes(AnalysisType.TOPIC) && data.topics) {
      result[AnalysisType.TOPIC] = data.topics;
    }
    
    if (analysisTypes.includes(AnalysisType.LANGUAGE) && data.language) {
      result[AnalysisType.LANGUAGE] = [data.language];
    }
    
    return result;
  }
  
  private getEmptyResult(): Record<AnalysisType, AnalysisResult[]> {
    const result: Record<AnalysisType, AnalysisResult[]> = {} as Record<AnalysisType, AnalysisResult[]>;
    
    Object.values(AnalysisType).forEach(type => {
      result[type] = [];
    });
    
    return result;
  }
}