// src/components/cart/CheckoutFlow.tsx
import React, { useState } from 'react';
import { useCart } from '../../hooks/useCart';
import { orderOrchestrator } from '../../services/order/OrderOrchestrator';
import { formatPrice } from '../../utils/formatters';
import { configManager } from '../../config/ConfigManager';

interface CheckoutFlowProps {
  onBack: () => void;
  onComplete: () => void;
}

export const CheckoutFlow: React.FC<CheckoutFlowProps> = ({ onBack, onComplete }) => {
  const { items, subtotal, clear } = useCart();
  const [userInfo, setUserInfo] = useState({
    name: '',
    phone: '',
    notes: ''
  });
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  
  const businessConfig = configManager.getSection('business');
  const availableMethods = orderOrchestrator.getAvailableStrategies();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMethod) {
      setError('Seleziona un metodo di invio ordine');
      return;
    }
    
    setIsProcessing(true);
    setError('');
    
    try {
      // Crea richiesta ordine
      const orderRequest = await orderOrchestrator.createOrderRequest(
        items,
        userInfo
      );
      
      // Processa ordine
      const result = await orderOrchestrator.processOrder(
        orderRequest,
        selectedMethod
      );
      
      if (result.success) {
        // Pulisci carrello
        clear();
        
        // Mostra conferma
        alert(`Ordine inviato con successo!\n\nID: ${result.orderId}\n\n${result.message || ''}`);
        
        // Chiudi checkout
        onComplete();
      } else {
        setError(result.error || 'Errore nell\'invio dell\'ordine');
      }
    } catch (error) {
      setError('Errore imprevisto. Riprova.');
      console.error('Checkout error:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="checkout-flow">
      {/* Header */}
      <div className="checkout-header">
        <button className="back-btn" onClick={onBack}>
          ← Torna al carrello
        </button>
        <h2>Completa l'ordine</h2>
      </div>
      
      {/* Riepilogo */}
      <div className="order-summary">
        <h3>Riepilogo ordine</h3>
        <div className="summary-items">
          {items.map(item => (
            <div key={`${item.type}-${item.id}`} className="summary-item">
              <span>{item.quantity}x {item.name}</span>
              <span>{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="summary-total">
          <strong>Totale:</strong>
          <strong>{formatPrice(subtotal)}</strong>
        </div>
      </div>
      
      {/* Form */}
      <form onSubmit={handleSubmit} className="checkout-form">
        <h3>I tuoi dati</h3>
        
        <div className="form-group">
          <label htmlFor="name">Nome *</label>
          <input
            id="name"
            type="text"
            required
            value={userInfo.name}
            onChange={(e) => setUserInfo({...userInfo, name: e.target.value})}
            placeholder="Il tuo nome"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="phone">Telefono *</label>
          <input
            id="phone"
            type="tel"
            required
            value={userInfo.phone}
            onChange={(e) => setUserInfo({...userInfo, phone: e.target.value})}
            placeholder="+39 333 1234567"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="notes">Note (opzionale)</label>
          <textarea
            id="notes"
            rows={3}
            value={userInfo.notes}
            onChange={(e) => setUserInfo({...userInfo, notes: e.target.value})}
            placeholder="Aggiungi note per il locale..."
          />
        </div>
        
        <h3>Come vuoi inviare l'ordine?</h3>
        
        <div className="order-methods">
          {availableMethods.includes('whatsapp') && (
            <label className="method-option">
              <input
                type="radio"
                name="method"
                value="whatsapp"
                checked={selectedMethod === 'whatsapp'}
                onChange={(e) => setSelectedMethod(e.target.value)}
              />
              <div className="method-content">
                <div className="method-icon">📱</div>
                <div className="method-info">
                  <strong>WhatsApp</strong>
                  <small>Invia ordine su WhatsApp Business</small>
                </div>
              </div>
            </label>
          )}
          
          {availableMethods.includes('email') && (
            <label className="method-option">
              <input
                type="radio"
                name="method"
                value="email"
                checked={selectedMethod === 'email'}
                onChange={(e) => setSelectedMethod(e.target.value)}
              />
              <div className="method-content">
                <div className="method-icon">📧</div>
                <div className="method-info">
                  <strong>Email</strong>
                  <small>Invia ordine via email</small>
                </div>
              </div>
            </label>
          )}
          
          {/* Metodo telefonico sempre disponibile */}
          <div className="method-info-box">
            <div className="method-icon">📞</div>
            <div>
              <strong>Preferisci ordinare telefonicamente?</strong>
              <p>Chiama il {businessConfig.telefono}</p>
            </div>
          </div>
        </div>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        <button 
          type="submit" 
          className="btn-primary submit-order"
          disabled={isProcessing}
        >
          {isProcessing ? 'Invio in corso...' : 'Invia ordine'}
        </button>
      </form>
    </div>
  );
};