// src/services/analytics/NLPService.ts

import { INLPService, INLPAnalysisResult } from './interfaces/INLPService';

export class BasicNLPService implements INLPService {
  async analyzeText(text: string): Promise<INLPAnalysisResult> {
    // Implementazione base dell'analisi NLP
    const lowerText = text.toLowerCase();
    
    const intents: string[] = [];
    const topics: string[] = [];
    
    // Rilevamento intenti base
    if (lowerText.includes('ordina') || lowerText.includes('vorrei')) {
      intents.push('order');
    }
    if (lowerText.includes('consiglia') || lowerText.includes('suggerisci')) {
      intents.push('recommendation');
    }
    if (lowerText.includes('orari') || lowerText.includes('aperto')) {
      intents.push('hours');
    }
    if (lowerText.includes('prezzo') || lowerText.includes('costa')) {
      intents.push('price');
    }
    
    // Rilevamento topic base
    const foodKeywords = ['caffè', 'cappuccino', 'espresso', 'cornetto', 'panino', 'colazione', 'pranzo'];
    
    foodKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        topics.push(keyword);
      }
    });
    
    // Calcolo sentiment di base
    const positiveWords = ['buono', 'ottimo', 'delizioso', 'fantastico', 'grazie'];
    const negativeWords = ['male', 'terribile', 'deludente', 'problema', 'no'];
    
    let sentiment = 0;
    let totalMatches = 0;
    
    positiveWords.forEach(word => {
      if (lowerText.includes(word)) {
        sentiment += 1;
        totalMatches++;
      }
    });
    
    negativeWords.forEach(word => {
      if (lowerText.includes(word)) {
        sentiment -= 1;
        totalMatches++;
      }
    });
    
    return {
      intents,
      topics,
      sentiment: totalMatches > 0 ? sentiment / totalMatches : 0,
      entities: [] // Da implementare in futuro
    };
  }
}