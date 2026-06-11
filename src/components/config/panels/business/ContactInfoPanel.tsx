import React, { useState } from 'react';
import { IConfigSection } from '../../interfaces/IConfigSection';
import { AppConfig } from '../../../../config/interfaces/IAppConfig';

type BusinessConfig = AppConfig['business'];
const GATEWAY_URL = process.env.REACT_APP_AI_GATEWAY_URL || 'http://localhost:8787';

export const ContactInfoPanel: React.FC<IConfigSection<BusinessConfig>> = ({
  config,
  onChange,
  className = ''
}) => {
  const [webhookTest, setWebhookTest] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    message: string;
  }>({ status: 'idle', message: '' });

  const testOrderWebhook = async () => {
    const webhookUrl = (config.orderWebhook || '').trim();

    if (!webhookUrl) {
      setWebhookTest({
        status: 'error',
        message: 'Inserisci un webhook ordini prima di avviare il test.'
      });
      return;
    }

    setWebhookTest({
      status: 'loading',
      message: 'Invio ordine demo al gateway...'
    });

    try {
      const response = await fetch(`${GATEWAY_URL}/v1/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl,
          business: {
            name: config.name,
            type: config.type,
            phone: config.telefono,
            email: config.email
          },
          order: {
            id: `ORD-TEST-${Date.now()}`,
            businessId: config.name,
            userId: 'webhook-test',
            method: 'webhook',
            items: [
              {
                id: 'test-cappuccino',
                name: 'Cappuccino test',
                price: 1.5,
                quantity: 1,
                type: 'menuItem'
              }
            ],
            subtotal: 1.5,
            userInfo: {
              name: 'Cliente Test',
              phone: '+39 000 0000000',
              notes: 'Ordine demo generato dal pannello CafeConnect AI.'
            },
            timestamp: Date.now()
          }
        })
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`Gateway ${response.status}${detail ? `: ${detail}` : ''}`);
      }

      const result = await response.json().catch(() => ({}));
      setWebhookTest({
        status: 'success',
        message: `Test riuscito. Ordine ${result.orderId || 'demo'} inoltrato al webhook.`
      });
    } catch (error) {
      setWebhookTest({
        status: 'error',
        message: error instanceof Error
          ? `Test non riuscito: ${error.message}`
          : 'Test non riuscito.'
      });
    }
  };

  return (
    <div className={`config-section ${className}`}>
      <h3>Informazioni di Contatto</h3>
      
      <div className="form-group">
        <label htmlFor="business-indirizzo">Indirizzo</label>
        <input
          id="business-indirizzo"
          type="text"
          value={config.indirizzo || ''}
          onChange={(e) => onChange('indirizzo', e.target.value)}
          placeholder="Indirizzo della tua attività"
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="business-telefono">Telefono</label>
        <input
          id="business-telefono"
          type="text"
          value={config.telefono || ''}
          onChange={(e) => onChange('telefono', e.target.value)}
          placeholder="Numero di telefono"
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="business-email">Email</label>
        <input
          id="business-email"
          type="email"
          value={config.email || ''}
          onChange={(e) => onChange('email', e.target.value)}
          placeholder="Email della tua attività"
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="business-orari">Orari</label>
        <textarea
          id="business-orari"
          rows={3}
          value={config.orari || ''}
          onChange={(e) => onChange('orari', e.target.value)}
          placeholder="Orari di apertura"
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="whatsapp-business">WhatsApp Business</label>
        <input
          id="whatsapp-business"
          type="text"
          value={config.whatsappBusiness || ''}
          onChange={(e) => onChange('whatsappBusiness', e.target.value)}
          placeholder="+39 333 1234567"
        />
        <small className="form-text">
          Numero WhatsApp Business per ricevere ordini
        </small>
      </div>

      <div className="form-group">
        <label htmlFor="order-webhook">Webhook ordini</label>
        <input
          id="order-webhook"
          type="url"
          value={config.orderWebhook || ''}
          onChange={(e) => onChange('orderWebhook', e.target.value)}
          placeholder="https://tuo-gestionale.example.com/orders"
        />
        <small className="form-text">
          Endpoint POST per inviare gli ordini a CRM, POS, e-commerce o automazioni.
        </small>
        <button
          type="button"
          className="webhook-test-btn"
          onClick={testOrderWebhook}
          disabled={webhookTest.status === 'loading'}
        >
          {webhookTest.status === 'loading' ? 'Test in corso...' : 'Test webhook'}
        </button>
        {webhookTest.status !== 'idle' && (
          <div className={`webhook-test-result webhook-test-${webhookTest.status}`}>
            {webhookTest.message}
          </div>
        )}
      </div>
    </div>
  );
};
