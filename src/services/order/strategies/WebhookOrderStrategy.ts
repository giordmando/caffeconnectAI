// src/services/order/strategies/WebhookOrderStrategy.ts
import { IOrderStrategy } from '../OrderOrchestrator';
import { OrderRequest, OrderResult } from '../../../types/Order';
import { configManager } from '../../../config/ConfigManager';

const GATEWAY_URL = process.env.REACT_APP_AI_GATEWAY_URL || 'http://localhost:8787';

export class WebhookOrderStrategy implements IOrderStrategy {
  async processOrder(order: OrderRequest): Promise<OrderResult> {
    const appConfig = configManager.getConfig();
    const businessConfig = appConfig.business;
    const integrations = appConfig.integrations || {};
    const webhookUrl = (
      businessConfig.orderWebhook ||
      integrations.makeWebhookUrl ||
      integrations.zapierWebhookUrl ||
      ''
    ).trim();

    if (!webhookUrl) {
      return {
        success: false,
        orderId: order.id,
        error: 'Webhook ordini non configurato'
      };
    }

    const response = await fetch(`${GATEWAY_URL}/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        webhookUrl,
        business: {
          name: businessConfig.name,
          type: businessConfig.type,
          phone: businessConfig.telefono,
          email: businessConfig.email
        },
        order
      })
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Gateway ordini ha risposto con stato ${response.status}${detail ? `: ${detail}` : ''}`);
    }

    const result = await response.json().catch(() => ({}));

    return {
      success: true,
      orderId: result.orderId || order.id,
      message: 'Ordine inviato al gestionale tramite gateway.'
    };
  }

  isAvailable(): boolean {
    const appConfig = configManager.getConfig();
    const integrations = appConfig.integrations || {};
    return !!(
      appConfig.business.orderWebhook ||
      integrations.makeWebhookUrl ||
      integrations.zapierWebhookUrl ||
      ''
    ).trim();
  }
}
