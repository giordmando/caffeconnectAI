import { ISuggestionService } from './interfaces/ISuggestionService';
import { ISuggestionProvider } from './interfaces/ISuggestionProvider';
import { UserContext } from '../../types/UserContext';
import { getTimeOfDay } from '../../utils/timeContext';
import { Message } from '../../types/Message';

export class SuggestionService implements ISuggestionService {
  private suggestionsCache: Map<string, {
    suggestions: string[];
    timestamp: number;
  }> = new Map();
  private cacheTTL = 5 * 60 * 1000; // 5 minuti in millisecondi
  
  constructor(
    private readonly suggestionProvider: ISuggestionProvider
  ) {}
  
  async getSuggestedPrompts(response: Message, userContext: UserContext): Promise<string[]> {
    const timeOfDay = getTimeOfDay();
    const cacheKey = `${userContext.userId}-${timeOfDay}`;
    
    // Controlla se ci sono suggerimenti in cache ancora validi
    const cached = this.suggestionsCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < this.cacheTTL)) {
      return cached.suggestions;
    }
    
    try {
      // Genera nuovi suggerimenti
      const suggestions = await this.suggestionProvider.generateSuggestions(
        response, 
        userContext,
        timeOfDay
      );
      
      // Memorizza in cache
      this.suggestionsCache.set(cacheKey, {
        suggestions,
        timestamp: Date.now()
      });
      
      return suggestions;
    } catch (error) {
      console.error('Error getting suggested prompts:', error);
      
      // Fallback a suggerimenti generici
      return [
        'Cosa mi consigli oggi?',
        'Quali sono le specialità?',
        'Hai informazioni su questo posto?'
      ];
    }
  }
}