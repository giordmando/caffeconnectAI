// src/services/ui/deduplication/IDeduplicationStrategy.ts
import { UIComponent } from '../../../types/UI';

export interface IDeduplicationStrategy {
  deduplicateComponents(components: UIComponent[]): UIComponent[];
  getStrategyName(): string;
}