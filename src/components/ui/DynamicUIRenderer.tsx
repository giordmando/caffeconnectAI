import React from 'react';
import { UIComponent } from '../../types/UI';
import { uiComponentRegistry } from './registry/UIComponentRegistry';

interface DynamicUIRendererProps {
  components: UIComponent[];
  placement: string;
  onAction?: (action: string, payload: any) => void;
}

/**
 * Component for rendering dynamic UI components
 * Uses the registry pattern for extensibility
 */
export const DynamicUIRenderer: React.FC<DynamicUIRendererProps> = ({ 
  components, 
  placement, 
  onAction 
}) => {
  // Filter components by placement
  const filteredComponents = components.filter(comp => comp.placement === placement);
  
  if (filteredComponents.length === 0) {
    return null;
  }
  
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

  const uniqueComponents = new Map<string, UIComponent>();
  // Componenti che dovrebbero essere unici per tipo (uno per tipo)
  const uniqueComponentTypes = ['loyaltyCard', 'preferencesCard'];
  // Componenti finali da renderizzare
  const componentsToRender: UIComponent[] = [];
  // Prima passata: raccogli i componenti che devono essere unici
  filteredComponents.forEach(comp => {
    if (uniqueComponentTypes.includes(comp.type)) {
      const key = comp.type;
      
      if (!uniqueComponents.has(key) || 
          (uniqueComponents.get(key)!._updated || 0) < (comp._updated || 0)) {
        uniqueComponents.set(key, comp);
      }
    } else {
      componentsToRender.push(comp);
    }
  });
  
  // Aggiungi i componenti unici (solo il più recente per ogni tipo)
  uniqueComponents.forEach(comp => {
    componentsToRender.push(comp);
  });
  
  // Ordina i componenti: prima quelli aggiornati più di recente
  componentsToRender.sort((a, b) => {
    const aTime = a._updated || 0;
    const bTime = b._updated || 0;
    return bTime - aTime;
  });

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