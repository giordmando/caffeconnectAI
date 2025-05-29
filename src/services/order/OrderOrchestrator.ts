import { OrderRequest, OrderResult, CartItem } from '../../types/Order';
import { configManager } from '../../config/ConfigManager';
import { userContextService } from '../user/UserContextService';

export interface IOrderStrategy {
  processOrder(order: OrderRequest): Promise<OrderResult>;
  isAvailable(): boolean;
}

export class OrderOrchestrator {
  private static instance: OrderOrchestrator;
  private strategies: Map<string, IOrderStrategy> = new Map();
  
  private constructor() {}
  
  public static getInstance(): OrderOrchestrator {
    if (!OrderOrchestrator.instance) {
      OrderOrchestrator.instance = new OrderOrchestrator();
    }
    return OrderOrchestrator.instance;
  }
  
  registerStrategy(name: string, strategy: IOrderStrategy): void {
    this.strategies.set(name, strategy);
  }
  
  getAvailableStrategies(): string[] {
    return Array.from(this.strategies.entries())
      .filter(([_, strategy]) => strategy.isAvailable())
      .map(([name, _]) => name);
  }
  
  async createOrderRequest(
    items: CartItem[], 
    userInfo?: { name?: string; phone?: string; notes?: string }
  ): Promise<OrderRequest> {
    const businessConfig = configManager.getSection('business');
    const userContext = userContextService.getUserContext();
    
    const subtotal = items.reduce(
      (sum, item) => sum + (item.price * item.quantity), 
      0
    );
    
    return {
      id: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      businessId: businessConfig.name, // In futuro sarà un ID vero
      userId: userContext.userId,
      items,
      subtotal,
      userInfo: userInfo || {
        name: userContext.name,
        phone: userContext.email // Assumiamo che l'email sia il telefono per ora
      },
      timestamp: Date.now()
    };
  }
  
  async processOrder(
    order: OrderRequest, 
    method: string
  ): Promise<OrderResult> {
    const strategy = this.strategies.get(method);
    
    if (!strategy) {
      return {
        success: false,
        orderId: order.id,
        error: `Metodo di ordine ${method} non disponibile`
      };
    }
    
    try {
      return await strategy.processOrder(order);
    } catch (error) {
      console.error(`Error processing order with ${method}:`, error);
      return {
        success: false,
        orderId: order.id,
        error: error instanceof Error ? error.message : 'Errore sconosciuto'
      };
    }
  }
}

export const orderOrchestrator = OrderOrchestrator.getInstance();