import { UIComponent } from '../../../types/UI';

// Responsabilità singola: storage dei componenti
export class ComponentStore {
  private components: Map<string, UIComponent> = new Map();
  
  add(component: UIComponent): void {
    if (!component._updated) {
      component._updated = Date.now();
    }
    this.components.set(component.id, component);
  }
  
  remove(id: string): boolean {
    return this.components.delete(id);
  }
  
  get(id: string): UIComponent | undefined {
    return this.components.get(id);
  }
  
  getAll(): UIComponent[] {
    return Array.from(this.components.values());
  }
  
  getByPlacement(placement: string): UIComponent[] {
    return this.getAll().filter(comp => comp.placement === placement);
  }
  
  clear(): void {
    this.components.clear();
  }
  
  removeOlderThan(maxAgeMs: number): void {
    const now = Date.now();
    for (const [id, component] of Array.from(this.components.entries())) {
      if (component._updated && (now - component._updated) > maxAgeMs) {
        this.components.delete(id);
      }
    }
  }
}
