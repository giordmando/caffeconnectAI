import { UIComponent } from "../../../types/UI";

export interface DeduplicationRule {
    type: string;
    strategy: 'unique' | 'limit' | 'latest';
    limit?: number;
  }

  // Responsabilità singola: deduplicazione
export class ComponentDeduplicator {
  private rules: Map<string, DeduplicationRule> = new Map();
  
  constructor(rules: DeduplicationRule[] = []) {
    // Regole predefinite
    this.addRule({ type: 'loyaltyCard', strategy: 'unique' });
    this.addRule({ type: 'preferencesCard', strategy: 'unique' });
    this.addRule({ type: 'productDetail', strategy: 'limit', limit: 5 });
    this.addRule({ type: 'menuCarousel', strategy: 'latest' });
    this.addRule({ type: 'productCarousel', strategy: 'latest' });
    
    // Aggiungi regole custom
    rules.forEach(rule => this.addRule(rule));
  }
  
  addRule(rule: DeduplicationRule): void {
    this.rules.set(rule.type, rule);
  }
  
  deduplicate(components: UIComponent[]): UIComponent[] {
    // Raggruppa per tipo
    const grouped = this.groupByType(components);
    const result: UIComponent[] = [];
    
    // Applica regole per ogni tipo
    for (const [type, typeComponents] of Array.from(grouped.entries())) {
      const rule = this.rules.get(type) || { type, strategy: 'limit', limit: 3 };
      const deduplicated = this.applyRule(typeComponents, rule);
      result.push(...deduplicated);
    }
    
    // Ordina per timestamp (più recenti prima)
    return result.sort((a, b) => (b._updated || 0) - (a._updated || 0));
  }
  
  private groupByType(components: UIComponent[]): Map<string, UIComponent[]> {
    const grouped = new Map<string, UIComponent[]>();
    
    for (const component of components) {
      const list = grouped.get(component.type) || [];
      list.push(component);
      grouped.set(component.type, list);
    }
    
    return grouped;
  }
  
  private applyRule(components: UIComponent[], rule: DeduplicationRule): UIComponent[] {
    // Ordina per timestamp (più recenti prima)
    const sorted = [...components].sort((a, b) => (b._updated || 0) - (a._updated || 0));
    
    switch (rule.strategy) {
      case 'unique':
        // Mantieni solo il più recente
        return sorted.slice(0, 1);
        
      case 'latest':
        // Mantieni solo l'ultimo (stesso di unique ma semanticamente diverso)
        return sorted.slice(0, 1);
        
      case 'limit':
        // Mantieni fino al limite specificato
        return sorted.slice(0, rule.limit || 3);
        
      default:
        return sorted;
    }
  }
}