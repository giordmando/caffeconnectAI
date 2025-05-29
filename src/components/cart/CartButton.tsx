import React from 'react';
import { useCart } from '../../hooks/useCart';
import { formatPrice } from '../../utils/formatters';

interface CartButtonProps {
  onClick: () => void;
}

export const CartButton: React.FC<CartButtonProps> = ({ onClick }) => {
  const { itemCount, subtotal } = useCart();
  
  if (itemCount === 0) return null;
  
  return (
    <button 
      className="floating-cart-button"
      onClick={onClick}
      aria-label={`Carrello con ${itemCount} articoli`}
    >
      <div className="cart-icon">
        🛒
        <span className="cart-badge">{itemCount}</span>
      </div>
      <div className="cart-info">
        <span className="cart-label">Carrello</span>
        <span className="cart-total">{formatPrice(subtotal)}</span>
      </div>
    </button>
  );
};