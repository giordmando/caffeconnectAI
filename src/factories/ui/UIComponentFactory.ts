import { IComponentCreator } from './interfaces/IComponentCreator';
import { UIComponent } from '../../types/UI';
import React from 'react';

export class UIComponentFactory {
  private creators: Map<string, IComponentCreator> = new Map();
  private static instance: UIComponentFactory;
  
  static getInstance(): UIComponentFactory {
    if (!UIComponentFactory.instance) {
      UIComponentFactory.instance = new UIComponentFactory();
    }
    return UIComponentFactory.instance;
  }
  
  register(creator: IComponentCreator): void {
    const types = this.getCreatorTypes(creator);
    types.forEach(type => {
      this.creators.set(type, creator);
      console.log(`Registered creator for type: ${type}`);
    });
  }
  
  // Supporto per registrazione diretta di factory functions
  registerFunction(
    type: string, 
    factory: (component: UIComponent, onAction?: any) => React.ReactElement
  ): void {
    const creator: IComponentCreator = {
      supports: (t: string) => t === type,
      create: factory
    };
    this.creators.set(type, creator);
    console.log(`Registered function creator for type: ${type}`);
  }
  
  private getCreatorTypes(creator: IComponentCreator): string[] {
    if ('componentType' in creator) {
      return [(creator as any).componentType];
    }
    return [];
  }
  
  create(component: UIComponent, onAction?: (action: string, payload: any) => void): React.ReactElement {
    const creator = this.creators.get(component.type);
    
    if (!creator) {
      console.warn(`No creator registered for component type: ${component.type}`);
      return React.createElement('div', { className: 'error-component' }, 
        `Component type not supported: ${component.type}`
      );
    }
    
    try {
      return creator.create(component, onAction);
    } catch (error) {
      console.error(`Error creating component of type ${component.type}:`, error);
      return React.createElement('div', { className: 'error-component' }, 
        `Error creating component: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  
  // Alias per compatibilità con vecchio codice
  createComponent(component: UIComponent, onAction?: any): React.ReactElement {
    return this.create(component, onAction);
  }
  
  // Metodo per verificare se un tipo è registrato
  hasComponent(type: string): boolean {
    return this.creators.has(type);
  }
  
  // Metodo per ottenere tutti i tipi registrati
  getRegisteredTypes(): string[] {
    return Array.from(this.creators.keys());
  }
}

export const uiComponentFactory = UIComponentFactory.getInstance();