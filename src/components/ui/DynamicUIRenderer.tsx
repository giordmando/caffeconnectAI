import React, { useEffect, useState } from 'react';
import { UIComponent } from '../../types/UI';
import { uiComponentFactory } from '../../factories/ui/UIComponentFactory';
import { ComponentManager } from '../../services/ui/ComponentManager';

interface DynamicUIRendererProps {
  components: UIComponent[];
  placement: string;
  onAction?: (action: string, payload: any) => void;
  componentManager?: ComponentManager;
}

export const DynamicUIRenderer: React.FC<DynamicUIRendererProps> = ({ 
  components, 
  placement, 
  onAction,
  componentManager
}) => {
  const [componentsToRender, setComponentsToRender] = useState<UIComponent[]>([]);

  useEffect(() => {
    if (componentManager) {
      const dedupedComponents = componentManager.getDeduplicatedComponents(placement);
      setComponentsToRender(dedupedComponents);
      console.log(`DynamicUIRenderer (${placement}): Got ${dedupedComponents.length} components from manager`);
    } else {
      const filteredComponents = components.filter(comp => comp.placement === placement);
      setComponentsToRender(filteredComponents);
      console.log(`DynamicUIRenderer (${placement}): Got ${filteredComponents.length} components from props`);
    }
  }, [components, placement, componentManager]);
  
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

  if (componentsToRender.length === 0) {
    console.log(`DynamicUIRenderer (${placement}): No components to render`);
    return null;
  }

  console.log(`DynamicUIRenderer (${placement}): Rendering ${componentsToRender.length} components`);

  return (
    <div className={containerClassName}>
      {componentsToRender.map((component) => (
        <div key={component.id} className="dynamic-ui-item">
          {uiComponentFactory.create(component, onAction)}
        </div>
      ))}
    </div>
  );
};