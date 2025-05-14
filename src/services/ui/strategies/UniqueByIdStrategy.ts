import { UIComponent } from "../../../types/UI";
import { IDeduplicationStrategy } from "../deduplication/IDeduplicationStrategy";

export class UniqueByIdStrategy implements IDeduplicationStrategy {
  getStrategyName(): string {
    return 'unique-by-id';
  }

  deduplicateComponents(components: UIComponent[]): UIComponent[] {
    // Mantiene solo componenti con ID univoci (primo incontrato)
    const seenIds = new Set<string>();
    const result: UIComponent[] = [];
    
    for (const component of components) {
      if (!seenIds.has(component.id)) {
        seenIds.add(component.id);
        result.push(component);
      }
    }
    
    return result;
  }
}