export type BusinessEventType =
  | 'message_sent'
  | 'gateway_result'
  | 'ui_action'
  | 'item_viewed'
  | 'add_to_cart'
  | 'cart_opened'
  | 'cart_cleared'
  | 'checkout_started'
  | 'order_submitted'
  | 'order_failed';

export interface BusinessEvent {
  id: string;
  type: BusinessEventType;
  timestamp: number;
  payload?: Record<string, any>;
}

export interface BusinessEventSummary {
  eventCount: number;
  countsByType?: Record<string, number>;
  messageCount: number;
  addToCartCount: number;
  orderCount: number;
  failedOrderCount: number;
  viewedCount: number;
  averageOrderValue: number;
  allergenMentions: number;
  topItems: Array<{
    id: string;
    name: string;
    type: string;
    category?: string;
    quantity: number;
    revenue: number;
  }>;
  lastEventAt?: number | null;
}

export interface GatewayOrderRecord {
  id: string;
  orderId: string;
  status: 'submitted' | 'failed';
  method: string;
  timestamp: number;
  createdAt: string;
  subtotal: number;
  itemCount: number;
  customerName?: string;
  error?: string;
}

const STORAGE_KEY = 'cafeconnect_business_events';
const MAX_EVENTS = 500;
const GATEWAY_URL = process.env.REACT_APP_AI_GATEWAY_URL || 'http://localhost:8787';
const GATEWAY_RETRY_COOLDOWN_MS = 60_000;

class BusinessEventService {
  private gatewayUnavailableUntil = 0;

  track(
    type: BusinessEventType,
    payload: Record<string, any> = {},
    options: { mirrorGateway?: boolean } = {}
  ): void {
    try {
      const events = this.getEvents();
      const event: BusinessEvent = {
        id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type,
        timestamp: Date.now(),
        payload
      };

      const nextEvents = [...events, event].slice(-MAX_EVENTS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextEvents));
      if (options.mirrorGateway !== false) {
        this.sendToGateway(event);
      }
    } catch (error) {
      console.warn('[BusinessEventService] Unable to track event:', type, error);
    }
  }

  getEvents(): BusinessEvent[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_error) {
      // Ignore storage failures.
    }
  }

  async getRemoteSummary(): Promise<BusinessEventSummary | null> {
    if (!this.canUseGateway()) return null;

    try {
      const response = await fetch(`${GATEWAY_URL}/v1/events/summary`);
      if (!response.ok) return null;
      return response.json();
    } catch (_error) {
      this.markGatewayUnavailable();
      return null;
    }
  }

  async getRemoteOrders(limit: number = 10): Promise<GatewayOrderRecord[]> {
    if (!this.canUseGateway()) return [];

    try {
      const response = await fetch(`${GATEWAY_URL}/v1/orders?limit=${limit}`);
      if (!response.ok) return [];
      const result = await response.json();
      return Array.isArray(result.orders) ? result.orders : [];
    } catch (_error) {
      this.markGatewayUnavailable();
      return [];
    }
  }

  private sendToGateway(event: BusinessEvent): void {
    if (!this.canUseGateway()) return;

    try {
      fetch(`${GATEWAY_URL}/v1/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event })
      }).catch(() => {
        this.markGatewayUnavailable();
        // Local analytics still work when the gateway is offline.
      });
    } catch (_error) {
      this.markGatewayUnavailable();
      // Local analytics still work when fetch is unavailable.
    }
  }

  private canUseGateway(): boolean {
    return Date.now() >= this.gatewayUnavailableUntil;
  }

  private markGatewayUnavailable(): void {
    this.gatewayUnavailableUntil = Date.now() + GATEWAY_RETRY_COOLDOWN_MS;
  }
}

export const businessEventService = new BusinessEventService();
