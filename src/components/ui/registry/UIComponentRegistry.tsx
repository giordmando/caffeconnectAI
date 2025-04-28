import React from "react";
// Removed duplicate import of UIComponent

import { UIComponent } from "../../../types/UI";

// Type for UI component factory functions
export type ComponentFactory = (
  component: UIComponent, 
  onAction?: (action: string, payload: any) => void
) => React.ReactNode;

/**
 * Registry for dynamic UI components
 * Implements the registry pattern to make the system extensible
 */
export class UIComponentRegistry {
  private componentFactories: Map<string, ComponentFactory> = new Map();
  private static instance: UIComponentRegistry;
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): UIComponentRegistry {
    if (!UIComponentRegistry.instance) {
      UIComponentRegistry.instance = new UIComponentRegistry();
    }
    return UIComponentRegistry.instance;
  }
  
  /**
   * Register a new component factory
   */
  register(type: string, factory: ComponentFactory): void {
    this.componentFactories.set(type, factory);
    console.log(`UI component type registered: ${type}`);
  }
  
  /**
   * Create a component instance
   */
  createComponent(
    component: UIComponent, 
    onAction?: (action: string, payload: any) => void
  ): React.ReactNode {
    const factory = this.componentFactories.get(component.type);
    
    if (!factory) {
      console.warn(`Component type not registered: ${component.type}`);
      return (
        <div className="error-component">
          Component type not supported: {component.type}
        </div>
      );
    }
    
    return factory(component, onAction);
  }

  // Aggiungi questo metodo per verificare se un tipo è registrato
  hasComponent(type: string): boolean {
    return this.componentFactories.has(type);
  }
}

// Create and export singleton instance
export const uiComponentRegistry = UIComponentRegistry.getInstance();
