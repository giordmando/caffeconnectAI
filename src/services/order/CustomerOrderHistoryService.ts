import { OrderRequest, OrderResult } from '../../types/Order';

export interface CustomerOrderRecord {
  id: string;
  orderId: string;
  status: 'submitted' | 'failed';
  timestamp: number;
  itemCount: number;
  subtotal: number;
  customerName?: string;
  customerPhone?: string;
  method?: OrderRequest['method'];
  message?: string;
  error?: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    type: string;
  }>;
}

const STORAGE_KEY = 'cafeconnect-customer-orders';

function readOrders(): CustomerOrderRecord[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function writeOrders(orders: CustomerOrderRecord[]): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orders.slice(0, 25)));
  } catch (error) {
    console.error('Error saving customer order history:', error);
  }
}

export const customerOrderHistoryService = {
  list(): CustomerOrderRecord[] {
    return readOrders().sort((a, b) => b.timestamp - a.timestamp);
  },

  save(order: OrderRequest, result: OrderResult): CustomerOrderRecord {
    const record: CustomerOrderRecord = {
      id: `${order.id}-${Date.now()}`,
      orderId: result.orderId || order.id,
      status: result.success ? 'submitted' : 'failed',
      timestamp: Date.now(),
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: order.subtotal,
      customerName: order.userInfo?.name,
      customerPhone: order.userInfo?.phone,
      method: order.method,
      message: result.message,
      error: result.error,
      items: order.items.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        type: item.type
      }))
    };

    writeOrders([record, ...readOrders()]);
    return record;
  },

  clear(): void {
    writeOrders([]);
  }
};
