import React from 'react';
import { UIComponent } from '../../../types/UI';
import { IComponentCreator } from './interfaces/IComponentCreator';

// Factory unificata che gestisce sia la creazione che il rendering
export class ComponentFactory {
  private static instance: ComponentFactory;
  private creators: Map<string, IComponentCreator> = new Map();
  
  private constructor() {}
  
  static getInstance(): ComponentFactory {
    if (!ComponentFactory.instance) {
        ComponentFactory.instance = new ComponentFactory();
    }
    return ComponentFactory.instance;
  }
  
  // Registra un creatore
  register(creator: IComponentCreator): void {
    const type = creator.getComponentType();
    this.creators.set(type, creator);
    console.log(`Registered unified creator for type: ${type}`);
  }
  
  // Crea un elemento React da un UIComponent
  createReactElement(component: UIComponent, onAction?: (action: string, payload: any) => void): React.ReactElement {
    const creator = this.creators.get(component.type);
    
    if (!creator) {
      console.warn(`No creator registered for component type: ${component.type}`);
      return React.createElement('div', { className: 'error-component' }, 
        `Component type not supported: ${component.type}`
      );
    }
    
    try {
      return creator.createReactElement(component, onAction);
    } catch (error) {
      console.error(`Error creating React element for type ${component.type}:`, error);
      return React.createElement('div', { className: 'error-component' }, 
        `Error creating component: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  
  // Crea un UIComponent dai dati
  createUIComponent(type: string, data: any, placement?: string): UIComponent | null {
    const creator = this.creators.get(type);
    return creator ? creator.createUIComponent(data, placement) : null;
  }
  
  // Crea un UIComponent dal risultato di una funzione
  createFromFunctionResult(functionName: string, result: any): UIComponent | null {
    // Trova il creator che può gestire questa funzione
    for (const creator of Array.from(this.creators.values())) {
      if (creator.canHandleFunctionResult(functionName)) {
        return creator.createFromFunctionResult(functionName, result);
      }
    }
    
    console.warn(`No creator found for function: ${functionName}`);
    return null;
  }
  
  // Verifica se un tipo è registrato
  hasComponentType(type: string): boolean {
    return this.creators.has(type);
  }
  
  // Ottiene tutti i tipi registrati
  getRegisteredTypes(): string[] {
    return Array.from(this.creators.keys());
  }
}

export const componentFactory = ComponentFactory.getInstance();
