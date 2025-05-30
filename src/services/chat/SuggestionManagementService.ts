import { ISuggestionService } from '../action/interfaces/ISuggestionService';
import { Message } from '../../types/Message';
import { UserContext } from '../../types/UserContext';

export interface ISuggestionManagementService {
  getCurrentSuggestions(): string[];
  updateSuggestions(suggestions: string[]): void;
  clearSuggestions(): void;
  loadSuggestionsForMessage(message: Message, userContext: UserContext): Promise<string[]>;
}

export class SuggestionManagementService implements ISuggestionManagementService {
  private currentSuggestions: string[] = [];
  private suggestionService: ISuggestionService;
  
  constructor(suggestionService: ISuggestionService) {
    this.suggestionService = suggestionService;
  }
  
  getCurrentSuggestions(): string[] {
    return [...this.currentSuggestions];
  }
  
  updateSuggestions(suggestions: string[]): void {
    this.currentSuggestions = [...suggestions];
  }
  
  clearSuggestions(): void {
    this.currentSuggestions = [];
  }
  
  async loadSuggestionsForMessage(
    message: Message, 
    userContext: UserContext
  ): Promise<string[]> {
    try {
      const suggestions = await this.suggestionService.getSuggestedPrompts(
        message,
        userContext
      );
      this.updateSuggestions(suggestions);
      return suggestions;
    } catch (error) {
      console.error('[SuggestionManagementService] Error loading suggestions:', error);
      // Fallback a suggerimenti generici
      const fallbackSuggestions = [
        'Cosa mi consigli oggi?',
        'Quali sono le specialità?',
        'Hai informazioni su questo posto?'
      ];
      this.updateSuggestions(fallbackSuggestions);
      return fallbackSuggestions;
    }
  }
}