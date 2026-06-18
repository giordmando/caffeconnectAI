import React from 'react';
import { mockApiGetMenuItems } from '../../api/mockApi';
import { useCart } from '../../hooks/useCart';
import { formatPrice } from '../../utils/formatters';

interface MenuRecommendation {
  id: string;
  name: string;
  confidence: number;
  item?: any;
}

interface MenuCarouselProps {
  recommendations: MenuRecommendation[];
  timeOfDay: string;
  id: string;
  explanation?: string;
  onAction?: (action: string, payload: any) => void;
}

export const MenuCarousel: React.FC<MenuCarouselProps> = ({
  recommendations,
  timeOfDay,
  id,
  explanation,
  onAction
}) => {
  const [menuItems, setMenuItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const { addItem } = useCart();

  React.useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        setLoading(true);
        const allMenuItems = await mockApiGetMenuItems();
        const recommendedItems = recommendations
          .map(rec => {
            const item = rec.item || allMenuItems.find(candidate => candidate.id === rec.id);
            return item ? { ...item, confidence: rec.confidence } : null;
          })
          .filter(Boolean);

        setMenuItems(recommendedItems);
      } catch (error) {
        console.error('Errore nel caricamento degli item di menu:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMenuItems();
  }, [recommendations]);

  const getTimeOfDayText = () => {
    switch (timeOfDay) {
      case 'morning':
        return 'colazione';
      case 'afternoon':
        return 'pranzo';
      case 'evening':
        return 'aperitivo';
      default:
        return 'oggi';
    }
  };

  const handleItemClick = (item: any) => {
    onAction?.('view_item', {
      id: item.id,
      type: 'menuItem',
      item: {
        ...item,
        type: 'menuItem'
      }
    });
  };

  const handleOrderClick = (event: React.MouseEvent<HTMLElement>, item: any) => {
    event.stopPropagation();
    addItem(item, 'menuItem');

    const button = event.currentTarget;
    button.textContent = 'Aggiunto';
    button.classList.add('added');

    setTimeout(() => {
      button.textContent = 'Aggiungi';
      button.classList.remove('added');
    }, 1500);
  };

  if (loading) {
    return (
      <div className="menu-carousel loading">
        <div className="loading-spinner"></div>
        <p>Sto preparando i consigli...</p>
      </div>
    );
  }

  if (menuItems.length === 0) {
    return (
      <div className="menu-carousel empty">
        <p>Non ho trovato proposte disponibili per {getTimeOfDayText()}.</p>
      </div>
    );
  }

  return (
    <div className="menu-carousel" id={id}>
      <div className="carousel-header">
        <h3>Consigliati per {getTimeOfDayText()}</h3>
      </div>

      {explanation && (
        <div className="recommendation-explanation">
          <span>Perche te lo propongo</span>
          <p>{explanation}</p>
        </div>
      )}

      <div className="carousel-items">
        {menuItems.map(item => (
          <div
            key={item.id}
            className="menu-item-card"
            onClick={() => handleItemClick(item)}
          >
            <div className="item-image">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} />
              ) : (
                <div className="image-placeholder">{item.category === 'beverage' ? 'Caffe' : item.category === 'food' ? 'Menu' : 'Drink'}</div>
              )}
            </div>

            <div className="item-info">
              <h4>{item.name}</h4>
              {item.personalization?.reasons?.length > 0 && (
                <p className="personalization-reason">
                  Scelto per te: {item.personalization.reasons[0]}
                </p>
              )}
              <p className="item-description">{String(item.description || '').slice(0, 88)}</p>
              <div className="item-footer">
                <span className="item-price">{formatPrice(Number(item.price || 0))}</span>
                <button
                  type="button"
                  className="order-button"
                  onClick={(event) => handleOrderClick(event, item)}
                >
                  Aggiungi
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
