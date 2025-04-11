// Placeholder for MenuCarousel component
import React from 'react';
import { mockApiGetMenuItems } from '../api/mockApi';

interface MenuRecommendation {
  id: string;
  name: string;
  confidence: number;
}

interface MenuCarouselProps {
  recommendations: MenuRecommendation[];
  timeOfDay: string;
  id: string;
  onAction?: (action: string, payload: any) => void;
}

export const MenuCarousel: React.FC<MenuCarouselProps> = ({ 
  recommendations, 
  timeOfDay,
  id,
  onAction 
}) => {
  const [menuItems, setMenuItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        setLoading(true);
        // Ottieni tutti gli item di menu
        const allMenuItems = await mockApiGetMenuItems();
        
        // Filtra solo quelli raccomandati
        const recommendedItems = recommendations.map(rec => {
          const item = allMenuItems.find(item => item.id === rec.id);
          if (item) {
            return {
              ...item,
              confidence: rec.confidence
            };
          }
          return null;
        }).filter(Boolean);
        
        setMenuItems(recommendedItems);
      } catch (error) {
        console.error('Errore nel caricamento degli item di menu:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMenuItems();
  }, [recommendations]);
  
  // Converti timeOfDay in testo leggibile
  const getTimeOfDayText = () => {
    switch (timeOfDay) {
      case 'morning':
        return 'colazione';
      case 'afternoon':
        return 'pranzo';
      case 'evening':
        return 'aperitivo';
      default:
        return timeOfDay;
    }
  };
  
  const handleItemClick = (item: any) => {
    if (onAction) {
      onAction('view_item', {
        id: item.id,
        type: 'menuItem'
      });
    }
  };
  
  const handleOrderClick = (e: React.MouseEvent, item: any) => {
    e.stopPropagation(); // Previeni il click sull'item
    if (onAction) {
      onAction('order_item', {
        id: item.id,
        type: 'menuItem',
        name: item.name
      });
    }
  };
  
  if (loading) {
    return (
      <div className="menu-carousel loading">
        <div className="loading-spinner"></div>
        <p>Caricamento raccomandazioni...</p>
      </div>
    );
  }
  
  if (menuItems.length === 0) {
    return (
      <div className="menu-carousel empty">
        <p>Nessuna raccomandazione disponibile per {getTimeOfDayText()}.</p>
      </div>
    );
  }
  
  return (
    <div className="menu-carousel" id={id}>
      <div className="carousel-header">
        <h3>Consigliati per {getTimeOfDayText()}</h3>
      </div>
      
      <div className="carousel-items">
        {menuItems.map(item => (
          <div 
            key={item.id} 
            className="menu-item-card"
            onClick={() => handleItemClick(item)}
          >
            <div className="item-image">
              {/* Placeholder per immagine generata da AI */}
              <div className="image-placeholder">
                {item.category === 'beverage' 
                  ? '☕' 
                  : item.category === 'food' 
                    ? '🍽️' 
                    : '🍸'}
              </div>
            </div>
            
            <div className="item-info">
              <h4>{item.name}</h4>
              <p className="item-description">{item.description.slice(0, 60)}...</p>
              <div className="item-footer">
                <span className="item-price">{item.price.toFixed(2)}€</span>
                <button 
                  className="order-button"
                  onClick={(e) => handleOrderClick(e, item)}
                >
                  Ordina
                </button>
              </div>
            </div>
            
            {/* Badge di confidenza per ogni item */}
            <div 
              className="confidence-badge"
              style={{
                opacity: item.confidence / 100
              }}
            >
              {Math.round(item.confidence * 100)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};