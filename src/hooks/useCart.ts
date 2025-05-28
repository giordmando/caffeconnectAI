// src/hooks/useCart.ts
import { useState, useEffect } from 'react';
import { cartService } from '../services/cart/CartService';
import { CartItem } from '../types/Order';

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [itemCount, setItemCount] = useState(0);
  const [subtotal, setSubtotal] = useState(0);
  
  useEffect(() => {
    // Carica stato iniziale
    updateState();
    
    // Sottoscrivi ai cambiamenti
    const unsubscribe = cartService.subscribe(updateState);
    
    return unsubscribe;
  }, []);
  
  function updateState() {
    setItems(cartService.getItems());
    setItemCount(cartService.getItemCount());
    setSubtotal(cartService.getSubtotal());
  }
  
  return {
    items,
    itemCount,
    subtotal,
    addItem: (item: any, type: 'menuItem' | 'product') => 
      cartService.addItem(item, type),
    removeItem: (id: string, type: string) => 
      cartService.removeItem(id, type),
    updateQuantity: (id: string, type: string, quantity: number) =>
      cartService.updateQuantity(id, type, quantity),
    updateItemOptions: (id: string, type: string, options: Record<string, string>) =>
      cartService.updateItemOptions(id, type, options),
    clear: () => cartService.clear()
  };
}