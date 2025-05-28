// src/components/cart/CartItem.tsx
import React, { useState } from 'react';
import { useCart } from '../../hooks/useCart';
import { CartItem as CartItemType } from '../../types/Order';
import { formatPrice } from '../../utils/formatters';

interface CartItemProps {
  item: CartItemType;
}

export const CartItem: React.FC<CartItemProps> = ({ item }) => {
  const { updateQuantity, removeItem, updateItemOptions } = useCart();
  const [showOptions, setShowOptions] = useState(false);
  
  const handleQuantityChange = (delta: number) => {
    updateQuantity(item.id, item.type, item.quantity + delta);
  };
  
  const handleRemove = () => {
    removeItem(item.id, item.type);
  };
  
  return (
    <div className="cart-item">
      <div className="item-main">
        <div className="item-info">
          <h4>{item.name}</h4>
          {item.options && Object.keys(item.options).length > 0 && (
            <div className="item-options">
              {Object.entries(item.options).map(([key, value]) => (
                <span key={key} className="option-tag">
                  {key}: {value}
                </span>
              ))}
            </div>
          )}
          <div className="item-price">{formatPrice(item.price)}</div>
        </div>
        
        <div className="item-controls">
          <div className="quantity-control">
            <button 
              className="qty-btn"
              onClick={() => handleQuantityChange(-1)}
              disabled={item.quantity <= 1}
            >
              −
            </button>
            <span className="qty-value">{item.quantity}</span>
            <button 
              className="qty-btn"
              onClick={() => handleQuantityChange(1)}
            >
              +
            </button>
          </div>
          
          <div className="item-total">
            {formatPrice(item.price * item.quantity)}
          </div>
          
          <button 
            className="remove-btn"
            onClick={handleRemove}
            aria-label="Rimuovi articolo"
          >
            🗑️
          </button>
        </div>
      </div>
      
      {/* Opzioni personalizzazione per bevande */}
      {item.type === 'menuItem' && (
        <button 
          className="customize-btn"
          onClick={() => setShowOptions(!showOptions)}
        >
          Personalizza ☕
        </button>
      )}
      
      {showOptions && (
        <div className="item-customization">
          <h5>Personalizza la tua bevanda</h5>
          <div className="option-group">
            <label>Tipo di latte:</label>
            <div className="option-buttons">
              {['Intero', 'Scremato', 'Soia', 'Mandorla', 'Avena'].map(milk => (
                <button
                  key={milk}
                  className={`option-btn ${item.options?.milk === milk ? 'selected' : ''}`}
                  onClick={() => updateItemOptions(item.id, item.type, {
                    ...item.options,
                    milk
                  })}
                >
                  {milk}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};