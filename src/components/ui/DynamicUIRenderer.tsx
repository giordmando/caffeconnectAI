// src/components/ui/DynamicUIRenderer.tsx
import React, { useEffect, useState } from 'react';
import { UIComponent } from '../../types/UI';
import { uiComponentRegistry } from './registry/UIComponentRegistry';
import { ComponentManager } from '../../services/ui/ComponentManager';
import { UITypeRegistry } from '../../services/ui/UITypeRegistry';

interface DynamicUIRendererProps {
  components: UIComponent[];
  placement: string;
  onAction?: (action: string, payload: any) => void;
  componentManager?: ComponentManager; // Opzionale, per casi speciali
}

/**
 * Component for rendering dynamic UI components
 * Uses the registry pattern for extensibility
 */
export const DynamicUIRenderer: React.FC<DynamicUIRendererProps> = ({ 
  components, 
  placement, 
  onAction,
  componentManager
}) => {
  // Stato locale per i componenti da renderizzare
  const [componentsToRender, setComponentsToRender] = useState<UIComponent[]>([]);

  // Effect per ottenere i componenti dal manager o dai props
  useEffect(() => {
    if (componentManager) {
      // Se abbiamo un manager, ottieni i componenti per questo placement
      const dedupedComponents = componentManager.getDeduplicatedComponents(placement);
      setComponentsToRender(dedupedComponents);
      console.log(`DynamicUIRenderer (${placement}): Got ${dedupedComponents.length} components from manager`);
    } else {
      // Altrimenti usa i componenti passati direttamente
      const filteredComponents = components.filter(comp => comp.placement === placement);
      setComponentsToRender(filteredComponents);
      console.log(`DynamicUIRenderer (${placement}): Got ${filteredComponents.length} components from props`);
    }
  }, [components, placement, componentManager]);
  
  // Determine CSS class based on placement
  let containerClassName = "dynamic-ui-container";
  
  switch (placement) {
    case 'inline':
      containerClassName += " dynamic-ui-inline";
      break;
    case 'bottom':
      containerClassName += " dynamic-ui-bottom";
      break;
    case 'sidebar':
      containerClassName += " dynamic-ui-sidebar";
      break;
    default:
      containerClassName += " dynamic-ui-default";
  }

  
  // Se non ci sono componenti da renderizzare, ritorna null
  if (componentsToRender.length === 0) {
    console.log(`DynamicUIRenderer (${placement}): No components to render`);
    return null;
  }

  console.log(`DynamicUIRenderer (${placement}): Rendering ${componentsToRender.length} components`);

  return (
    <div className={containerClassName}>
      {componentsToRender.map((component) => (
        <div key={component.id} className="dynamic-ui-item">
          {uiComponentRegistry.createComponent(component, onAction)}
        </div>
      ))}
    </div>
  );
};