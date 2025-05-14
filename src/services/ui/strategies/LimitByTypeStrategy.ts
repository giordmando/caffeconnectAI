import { UIComponent } from "../../../types/UI";
import { IDeduplicationStrategy } from "../deduplication/IDeduplicationStrategy";

export class LimitByTypeStrategy implements IDeduplicationStrategy {
    private typeLimits: Record<string, number>;
    private defaultLimit: number;
    
    constructor(typeLimits: Record<string, number> = {}, defaultLimit: number = 3) {
      this.typeLimits = typeLimits;
      this.defaultLimit = defaultLimit;
    }
    
    getStrategyName(): string {
      return 'limit-by-type';
    }
  
    deduplicateComponents(components: UIComponent[]): UIComponent[] {
      // Raggruppa componenti per tipo
      const groupedByType: Record<string, UIComponent[]> = {};
      
      for (const component of components) {
        if (!groupedByType[component.type]) {
          groupedByType[component.type] = [];
        }
        groupedByType[component.type].push(component);
      }
      
      // Applica limiti per tipo
      const result: UIComponent[] = [];
      
      for (const [type, typeComponents] of Object.entries(groupedByType)) {
        // Ordina per timestamp (più recenti prima)
        const sorted = [...typeComponents].sort((a, b) => 
          (b._updated || 0) - (a._updated || 0)
        );
        
        // Determina il limite per questo tipo
        const limit = this.typeLimits[type] || this.defaultLimit;
        
        // Aggiungi solo fino al limite
        result.push(...sorted.slice(0, limit));
      }
      
      return result;
    }
  }