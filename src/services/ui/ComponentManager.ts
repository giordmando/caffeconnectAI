import { UIComponent } from '../../types/UI';
import { IDeduplicationStrategy } from './deduplication/IDeduplicationStrategy';
import { LimitByTypeStrategy } from './strategies/LimitByTypeStrategy';
import { UniqueByTypeStrategy } from './strategies/UniqueByTypeStrategy';

import { uiTypeRegistry } from './UITypeRegistry';


export interface ComponentTypeConfig {
  isUnique: boolean;
  limit?: number;
  placement?: string[];
}

export class ComponentManager {
  private componentRegistry: Map<string, UIComponent> = new Map();
  private deduplicationStrategies: Map<string, IDeduplicationStrategy> = new Map();
  private typeStrategies: Map<string, string> = new Map();
  
  constructor() {
    // Inizializza con alcune strategie predefinite
    this.registerStrategy('unique', new UniqueByTypeStrategy());
    this.registerStrategy('limit-3', new LimitByTypeStrategy({}, 3));
    this.registerStrategy('limit-1', new LimitByTypeStrategy({}, 1));
    
    // Imposta strategie in base alla configurazione dei tipi
    this.initializeTypeStrategies();
  }
  private initializeTypeStrategies(): void {
    // Ottieni tutte le definizioni di tipo
    const uniqueTypes: string[] = uiTypeRegistry.getAllUniqueTypes();
    for (const type of uniqueTypes) {
      const definition = uiTypeRegistry.getTypeDefinition(type);
      if (definition && definition.isUnique) {
        this.setTypeStrategy(type, 'unique');
      } else if (definition?.limit === 1) {
        this.setTypeStrategy(type, 'limit-1');
      } else if (definition?.limit) {
        // Se c'è un limite personalizzato, crea una strategia dedicata
        const strategyName = `limit-${definition.limit}`;
        if (!this.deduplicationStrategies.has(strategyName)) {
          this.registerStrategy(strategyName, new LimitByTypeStrategy({}, definition.limit));
        }
        this.setTypeStrategy(type, strategyName);
      } else {
        this.setTypeStrategy(type, 'limit-3'); // Default
      }
    }
  }
  
  // Registra una nuova strategia di deduplicazione
  registerStrategy(name: string, strategy: IDeduplicationStrategy): void {
    this.deduplicationStrategies.set(name, strategy);
  }
  
  // Imposta una strategia per un tipo di componente
  setTypeStrategy(type: string, strategyName: string): void {
    if (!this.deduplicationStrategies.has(strategyName)) {
      console.warn(`Strategy ${strategyName} not found, using default`);
      return;
    }
    
    this.typeStrategies.set(type, strategyName);
  }
  
  // Aggiunge o aggiorna un componente
  addComponent(component: UIComponent): void {
    // Aggiorna il timestamp se non presente
    if (!component._updated) {
      component._updated = Date.now();
    }
    
    this.componentRegistry.set(component.id, component);
  }
  
  // Aggiunge più componenti in blocco
  addComponents(components: UIComponent[]): void {
    for (const component of components) {
      this.addComponent(component);
    }
  }
  
  // Rimuove un componente
  removeComponent(id: string): boolean {
    return this.componentRegistry.delete(id);
  }
  
  // Ottiene tutti i componenti registrati
  getAllComponents(): UIComponent[] {
    return Array.from(this.componentRegistry.values());
  }
  
  // Ottiene componenti filtrati per placement
  getComponentsByPlacement(placement: string): UIComponent[] {
    return this.getAllComponents().filter(comp => comp.placement === placement);
  }
  
  // Ottiene componenti per placement, applicando strategie di deduplicazione
  getDeduplicatedComponents(placement: string): UIComponent[] {
    const components = this.getComponentsByPlacement(placement);
    
    // Raggruppa per tipo
    const byType: Record<string, UIComponent[]> = {};
    
    for (const component of components) {
      if (!byType[component.type]) {
        byType[component.type] = [];
      }
      byType[component.type].push(component);
    }
    
    const result: UIComponent[] = [];
    
    // Applica strategia specifica per ciascun tipo
    for (const [type, typeComponents] of Object.entries(byType)) {
      const strategyName = this.typeStrategies.get(type) || 'limit-3';
      const strategy = this.deduplicationStrategies.get(strategyName);
      
      if (strategy) {
        const deduplicatedComponents = strategy.deduplicateComponents(typeComponents);
        result.push(...deduplicatedComponents);
      } else {
        // Fallback se la strategia non è trovata
        result.push(...typeComponents);
      }
    }
    
    // Ordina i componenti per timestamp (più recenti prima)
    return result.sort((a, b) => (b._updated || 0) - (a._updated || 0));
  }
  
  // Pulisce componenti vecchi
  cleanupOldComponents(maxAgeMs: number): void {
    const now = Date.now();
    for (const [id, component] of Array.from(this.componentRegistry.entries())) {
      if (component._updated && (now - component._updated) > maxAgeMs) {
        this.componentRegistry.delete(id);
      }
    }
  }
}