import { UIComponent } from "../../../types/UI";
import { IDeduplicationStrategy } from "../deduplication/IDeduplicationStrategy";

export class UniqueByTypeStrategy implements IDeduplicationStrategy {
  getStrategyName(): string {
    return 'unique-by-type';
  }

  deduplicateComponents(components: UIComponent[]): UIComponent[] {
    // Mantiene solo il componente più recente per ciascun tipo
    const latestByType = new Map<string, UIComponent>();
    
    // Ordina prima i componenti per timestamp (più recenti prima)
    const sortedComponents = [...components].sort((a, b) => 
      (b._updated || 0) - (a._updated || 0)
    );
    
    // Per ogni componente, mantieni solo il primo (più recente) per tipo
    for (const component of sortedComponents) {
      if (!latestByType.has(component.type)) {
        latestByType.set(component.type, component);
      }
    }
    
    return Array.from(latestByType.values());
  }
}