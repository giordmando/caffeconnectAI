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
  
  return (
    <div className={containerClassName}>
      {filteredComponents.map((component) => (
        <div key={component.id} className="dynamic-ui-item">
          {uiComponentRegistry.createComponent(component, onAction)}
        </div>
      ))}
    </div>
  );
};