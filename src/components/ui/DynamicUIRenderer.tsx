import React, { useEffect, useState } from 'react';
import { UIComponent } from '../../types/UI';

import { componentFactory } from '../../services/ui/component/ComponentFactory';
import { ComponentManager } from '../../services/ui/compstore/ComponentManager';

interface DynamicUIRendererProps {
  placement: string;
  onAction?: (action: string, payload: any) => void;
  componentManager: ComponentManager;
}

export const DynamicUIRenderer: React.FC<DynamicUIRendererProps> = ({ 
  placement, 
  onAction,
  componentManager
}) => {
  const [components, setComponents] = useState<UIComponent[]>([]);
  const [updateTrigger, setUpdateTrigger] = useState(0);

  useEffect(() => {
    // Ottieni componenti già deduplicati dal manager
    const deduplicatedComponents = componentManager.getComponentsForPlacement(placement);
    setComponents(deduplicatedComponents);
    
    console.log(`DynamicUIRenderer (${placement}): Rendering ${deduplicatedComponents.length} components`);
  }, [placement, componentManager, updateTrigger]);
  
  // Metodo per forzare un re-render quando i componenti cambiano
  const forceUpdate = () => setUpdateTrigger(prev => prev + 1);
  
  useEffect(() => {
    // Ascolta i cambiamenti nel component manager
    const interval = setInterval(forceUpdate, 1000); // Check ogni secondo
    return () => clearInterval(interval);
  }, []);

  if (components.length === 0) {
    return null;
  }

  const containerClassName = `dynamic-ui-container dynamic-ui-${placement}`;

  return (
    <div className={containerClassName}>
      {components.map((component) => (
        <div key={component.id} className="dynamic-ui-item">
          {componentFactory.createReactElement(component, onAction)}
        </div>
      ))}
    </div>
  );
};