import { UIComponent } from "../../../types/UI";
import { ComponentDeduplicator, DeduplicationRule } from "./ComponentDeduplicator";
import { ComponentStore } from "./ComponentStore";

export class ComponentManager {
    private store: ComponentStore;
    private deduplicator: ComponentDeduplicator;
    
    constructor(deduplicationRules?: DeduplicationRule[]) {
      this.store = new ComponentStore();
      this.deduplicator = new ComponentDeduplicator(deduplicationRules);
    }
    
    // Metodi delegati allo store
    addComponent(component: UIComponent): void {
      this.store.add(component);
    }
    
    removeComponent(id: string): boolean {
      return this.store.remove(id);
    }
    
    getComponent(id: string): UIComponent | undefined {
      return this.store.get(id);
    }
    
    getAllComponents(): UIComponent[] {
      return this.store.getAll();
    }
    
    clearComponents(): void {
      this.store.clear();
    }
    
    // Metodo principale che applica la deduplicazione
    getComponentsForPlacement(placement: string): UIComponent[] {
      const components = this.store.getByPlacement(placement);
      return this.deduplicator.deduplicate(components);
    }
    
    // Pulizia periodica
    cleanupOldComponents(maxAgeMs: number = 3600000): void { // Default 1 ora
      this.store.removeOlderThan(maxAgeMs);
    }
    
    // Metodo per aggiornare le regole di deduplicazione
    updateDeduplicationRule(rule: DeduplicationRule): void {
      this.deduplicator.addRule(rule);
    }
  }