import { UIComponent } from "../../../types/UI";
import { IDeduplicationStrategy } from "../deduplication/IDeduplicationStrategy";

export class CompositeStrategy implements IDeduplicationStrategy {
    private strategies: IDeduplicationStrategy[];
    
    constructor(strategies: IDeduplicationStrategy[]) {
      this.strategies = strategies;
    }
    
    getStrategyName(): string {
      return 'composite';
    }
  
    deduplicateComponents(components: UIComponent[]): UIComponent[] {
      // Applica tutte le strategie in sequenza
      let result = [...components];
      
      for (const strategy of this.strategies) {
        result = strategy.deduplicateComponents(result);
      }
      
      return result;
    }
  }