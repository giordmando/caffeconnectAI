import React from 'react';
import { LoyaltyCard } from './ui/LoyaltyCard';
import { MenuCarousel } from './ui/MenuCarousel';
import { ProductCarousel } from './ui/ProductCarousel';
import { PreferencesCard } from './ui/PreferencesCard';

interface FunctionRendererProps {
  functionName: string;
  functionData: any;
  id: string;
  onAction?: (action: string, payload: any) => void;
}

/**
 * Componente che renderizza i risultati di una funzione in base al suo nome
 * Questo è un livello di indirezione che permette di aggiungere facilmente nuove
 * visualizzazioni per diverse funzioni
 */
export const FunctionRenderer: React.FC<FunctionRendererProps> = ({
  functionName,
  functionData,
  id,
  onAction
}) => {
  // Determina quale componente renderizzare in base al nome della funzione
  switch (functionName) {
    case 'get_user_loyalty_points':
      return (
        <LoyaltyCard
          points={functionData.points}
          tier={functionData.tier}
          nextTier={functionData.nextTier}
          history={functionData.history}
          id={id}
          onAction={onAction}
        />
      );
      
    case 'get_menu_recommendations':
      return (
        <MenuCarousel
          recommendations={functionData.recommendations}
          timeOfDay={functionData.timeOfDay || 'morning'}
          id={id}
          onAction={onAction}
        />
      );
      
    case 'get_product_recommendations':
      return (
        <ProductCarousel
          recommendations={functionData.recommendations}
          id={id}
          onAction={onAction}
        />
      );
      
    case 'get_user_preferences':
      return (
        <PreferencesCard
          preferences={functionData}
          id={id}
          onAction={onAction}
        />
      );
      
    default:
      // Per funzioni sconosciute, mostra un output JSON generico
      return (
        <div className="function-result" id={id}>
          <div className="function-header">
            <h3>Risultato: {functionName}</h3>
          </div>
          <div className="function-body">
            <pre className="function-data">
              {JSON.stringify(functionData, null, 2)}
            </pre>
          </div>
        </div>
      );
  }
};

export default FunctionRenderer;