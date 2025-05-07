// src/components/DynamicUIFactory.tsx
import React from 'react';
import { LoyaltyCard } from './ui/LoyaltyCard';
import { MenuCarousel } from './ui/MenuCarousel';
import { ProductCarousel } from './ui/ProductCarousel';
import { PreferencesCard } from './ui/PreferencesCard';
import { FunctionRenderer } from './FunctionRenderer';

import { UIComponent } from '../types/UI';

// Factory per creare componenti UI dinamici in base al tipo
export const DynamicUIFactory: React.FC<{
  component: UIComponent;
  onAction?: (action: string, payload: any) => void;
}> = ({ component, onAction }) => {
  const { type, data, id } = component;
  
  // Debug per comprendere la struttura dei dati
  console.log(`Rendering component of type: ${type}`);
  console.log("Component data structure:", JSON.stringify(data, null, 2));
  
  switch (type) {
    case 'loyaltyCard':
      // Assicuriamoci che i dati siano strutturati correttamente
      // Verifichiamo se i dati sono contenuti in un campo data o direttamente nell'oggetto
      const loyaltyData = data.data ? data.data : data;
      console.log("Processed loyalty data:", loyaltyData);
      
      return <LoyaltyCard 
        points={loyaltyData.points} 
        tier={loyaltyData.tier} 
        nextTier={loyaltyData.nextTier} 
        history={loyaltyData.history} 
        id={id}
        onAction={onAction}
      />;
      
    case 'menuCarousel':
      return <MenuCarousel 
        recommendations={data.recommendations} 
        timeOfDay={data.timeOfDay} 
        id={id}
        onAction={onAction}
      />;
      
    case 'productCarousel':
      return <ProductCarousel 
        recommendations={data.recommendations} 
        id={id}
        onAction={onAction}
      />;
      
    case 'preferencesCard':
      return <PreferencesCard 
        preferences={data.preferences} 
        id={id}
        onAction={onAction}
      />;
      
    case 'functionRenderer':
      return <FunctionRenderer 
        functionName={data.functionName} 
        functionData={data.functionData}
        id={id}
        onAction={onAction}
      />;
      
    default:
      console.warn(`Tipo di componente UI sconosciuto: ${type}`);
      return <div className="error-component">Componente non supportato: {type}</div>;
  }
};

// Componente per il rendering basato sul posizionamento
export const DynamicUIRenderer: React.FC<{
  components: UIComponent[];
  placement: string;
  onAction?: (action: string, payload: any) => void;
}> = ({ components, placement, onAction }) => {
  // Filtra i componenti per il posizionamento richiesto
  const filteredComponents = components.filter(comp => comp.placement === placement);
  
  if (filteredComponents.length === 0) {
    return null;
  }
  
  // Stili CSS in base al posizionamento
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
          <DynamicUIFactory component={component} onAction={onAction} />
        </div>
      ))}
    </div>
  );
};