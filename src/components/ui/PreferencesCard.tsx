import React from 'react';

interface UserPreferences {
  favoriteDrinks: string[];
  favoriteFood: string[];
  dietaryRestrictions: string[];
  usualVisitTime: string;
  lastOrderedItems: {
    name: string;
    date: string;
  }[];
}

interface PreferencesCardProps {
  preferences: UserPreferences;
  id: string;
  onAction?: (action: string, payload: any) => void;
}

export const PreferencesCard: React.FC<PreferencesCardProps> = ({
  preferences,
  id,
  onAction
}) => {
  const { favoriteDrinks, favoriteFood, dietaryRestrictions, usualVisitTime, lastOrderedItems } = preferences;

  /**
   * TODO spostare in a translation file
   * Traduzione dei momenti della giornata in italiano
   * @param time 
   * @returns 
   */
 
  const translateTimeOfDay = (time: string): string => {
    switch (time) {
      case 'morning':
        return 'mattina';
      case 'afternoon':
        return 'pomeriggio';
      case 'evening':
        return 'sera';
      default:
        return time;
    }
  };
  
  // Gestione click
  const handleCardClick = () => {
    if (onAction) {
      onAction('view_preferences', { preferences });
    }
  };
  
  return (
    <div className="preferences-card" id={id} onClick={handleCardClick}>
      <div className="preferences-header">
        <h3>Le tue preferenze</h3>
      </div>
      
      <div className="preferences-content">
        {/* Bevande preferite */}
        {favoriteDrinks && favoriteDrinks.length > 0 && (
          <div className="preferences-section">
            <h4>Bevande preferite</h4>
            <div className="preferences-list">
              {favoriteDrinks.map((drink, index) => (
                <span key={`drink-${index}`} className="preference-tag">{drink}</span>
              ))}
            </div>
          </div>
        )}
        
        {/* Cibi preferiti */}
        {favoriteFood && favoriteFood.length > 0 && (
          <div className="preferences-section">
            <h4>Cibi preferiti</h4>
            <div className="preferences-list">
              {favoriteFood.map((food, index) => (
                <span key={`food-${index}`} className="preference-tag">{food}</span>
              ))}
            </div>
          </div>
        )}
        
        {/* Restrizioni dietetiche */}
        {dietaryRestrictions && dietaryRestrictions.length > 0 && (
          <div className="preferences-section">
            <h4>Restrizioni dietetiche</h4>
            <div className="preferences-list">
              {dietaryRestrictions.map((restriction, index) => (
                <span key={`restriction-${index}`} className="preference-tag">{restriction}</span>
              ))}
            </div>
          </div>
        )}
        
        {/* Orario abituale */}
        {usualVisitTime && (
          <div className="preferences-section">
            <h4>Orario abituale</h4>
            <span className="preference-tag">{translateTimeOfDay(usualVisitTime)}</span>
          </div>
        )}
        
        {/* Ultimi ordini */}
        {lastOrderedItems && lastOrderedItems.length > 0 && (
          <div className="preferences-section">
            <h4>Ultimi ordini</h4>
            <ul className="last-orders">
              {lastOrderedItems.map((item, index) => (
                <li key={`order-${index}`} className="last-order-item">
                  <span>{item.name}</span>
                  <span className="last-order-date">
                    {new Date(item.date).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};