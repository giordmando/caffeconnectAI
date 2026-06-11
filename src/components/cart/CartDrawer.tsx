import React, { useState } from 'react';
import { useCart } from '../../hooks/useCart';
import { formatPrice } from '../../utils/formatters';
import { CartItem } from './CartItem';
import { CheckoutFlow } from './CheckoutFlow';
import { businessEventService } from '../../services/analytics/BusinessEventService';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose }) => {
  const { items, itemCount, subtotal, clear } = useCart();
  const [showCheckout, setShowCheckout] = useState(false);
  
  const handleCheckoutComplete = () => {
    setShowCheckout(false);
    onClose();
  };
  
  return (
    <>
      {/* Overlay */}
      <div 
        className={`cart-overlay ${isOpen ? 'active' : ''}`}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={`cart-drawer ${isOpen ? 'open' : ''}`}>
        {!showCheckout ? (
          <>
            {/* Header */}
            <div className="cart-header">
              <h2>Il tuo carrello</h2>
              <button className="close-btn" onClick={onClose}>×</button>
            </div>
            
            {/* Content */}
            <div className="cart-content">
              {items.length === 0 ? (
                <div className="empty-cart">
                  <div className="empty-icon">🛒</div>
                  <p>Il tuo carrello è vuoto</p>
                  <button className="btn-primary" onClick={onClose}>
                    Continua lo shopping
                  </button>
                </div>
              ) : (
                <>
                  {/* Items */}
                  <div className="cart-items">
                    {items.map((item) => (
                      <CartItem 
                        key={`${item.type}-${item.id}`} 
                        item={item} 
                      />
                    ))}
                  </div>
                  
                  {/* Summary */}
                  <div className="cart-summary">
                    <div className="summary-row">
                      <span>Subtotale ({itemCount} articoli)</span>
                      <span className="price">{formatPrice(subtotal)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            {/* Footer */}
            {items.length > 0 && (
              <div className="cart-footer">
                <button 
                  className="btn-secondary"
                  onClick={clear}
                >
                  Svuota carrello
                </button>
                <button 
                  className="btn-primary"
                  onClick={() => {
                    businessEventService.track('checkout_started', {
                      itemCount,
                      subtotal
                    });
                    setShowCheckout(true);
                  }}
                >
                  Procedi all'ordine
                </button>
              </div>
            )}
          </>
        ) : (
          <CheckoutFlow 
            onBack={() => setShowCheckout(false)}
            onComplete={handleCheckoutComplete}
          />
        )}
      </div>
    </>
  );
};
