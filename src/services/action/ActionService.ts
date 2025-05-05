import { IActionService } from './interfaces/IActionService';
import { IActionProvider } from './interfaces/IActionProvider';
import { Message } from '../../types/Message';
import { UserContext } from '../../types/UserContext';
import { getTimeOfDay } from '../../utils/timeContext';

export class ActionService implements IActionService {
  private actionsCache: Map<string, {
    actions: any[];
    timestamp: number;
  }> = new Map();
  private cacheTTL = 5 * 60 * 1000; // 5 minuti in millisecondi
  
  constructor(
    private readonly actionProvider: IActionProvider
  ) {}
  
  async generateAvailableActions(
    response: Message, 
    userContext: UserContext
  ): Promise<any[]> {
    const timeOfDay = getTimeOfDay();
    const cacheKey = `${userContext.userId}-${response.content.substring(0, 50)}`;
    
    // Controlla se ci sono azioni in cache ancora valide
    const cached = this.actionsCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < this.cacheTTL)) {
      return cached.actions;
    }
    
    try {
      // Genera nuove azioni
      const actions = await this.actionProvider.generateActions(
        response,
        userContext,
        timeOfDay
      );
      
      // Memorizza in cache
      this.actionsCache.set(cacheKey, {
        actions,
        timestamp: Date.now()
      });
      
      return actions;
    } catch (error) {
      console.error('Error generating actions:', error);
      
      // Fallback ad azioni generiche in base al tipo di business
      return [];
    }
  }
}