import React, { useMemo, useState } from 'react';
import { customerOrderHistoryService } from '../../services/order/CustomerOrderHistoryService';
import { formatPrice } from '../../utils/formatters';

interface CustomerOrdersModalProps {
  onClose: () => void;
}

function formatOrderTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export const CustomerOrdersModal: React.FC<CustomerOrdersModalProps> = ({ onClose }) => {
  const [refreshToken, setRefreshToken] = useState(0);
  const orders = useMemo(
    () => customerOrderHistoryService.list(),
    [refreshToken]
  );

  const handleClear = () => {
    customerOrderHistoryService.clear();
    setRefreshToken(value => value + 1);
  };

  return (
    <div className="customer-orders-modal">
      <div className="config-header">
        <div>
          <h2>I miei ordini</h2>
          <p>Ordini inviati da questo dispositivo</p>
        </div>
        <button className="close-btn" onClick={onClose} aria-label="Chiudi ordini">
          x
        </button>
      </div>

      <div className="customer-orders-content">
        {orders.length > 0 ? (
          <>
            <ul className="customer-order-list">
              {orders.map(order => (
                <li key={order.id}>
                  <div className="customer-order-main">
                    <span className={`order-status order-status-${order.status}`}>
                      {order.status === 'submitted' ? 'Inviato' : 'Fallito'}
                    </span>
                    <div>
                      <strong>{order.orderId}</strong>
                      <small>{formatOrderTime(order.timestamp)} / {order.itemCount} articoli</small>
                    </div>
                  </div>
                  <ul className="customer-order-items">
                    {order.items.map(item => (
                      <li key={`${order.id}-${item.type}-${item.id}`}>
                        <span>{item.quantity}x {item.name}</span>
                        <strong>{formatPrice(item.price * item.quantity)}</strong>
                      </li>
                    ))}
                  </ul>
                  <div className="customer-order-footer">
                    <span>{order.message || 'Ordine ricevuto dal locale.'}</span>
                    <strong>{formatPrice(order.subtotal)}</strong>
                  </div>
                </li>
              ))}
            </ul>
            <button className="btn-secondary customer-orders-clear" onClick={handleClear}>
              Svuota storico su questo dispositivo
            </button>
          </>
        ) : (
          <div className="customer-orders-empty">
            <h3>Nessun ordine su questo dispositivo</h3>
            <p>Quando completi un ordine, lo ritroverai qui senza entrare nella dashboard esercente.</p>
          </div>
        )}
      </div>
    </div>
  );
};
