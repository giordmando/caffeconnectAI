export interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    type: 'menuItem' | 'product';
    notes?: string;
    options?: Record<string, string>; // es. tipo latte, zucchero
  }
  
  export interface OrderRequest {
    id: string;
    businessId: string;
    userId: string;
    items: CartItem[];
    subtotal: number;
    userInfo: {
      name?: string;
      phone?: string;
      notes?: string;
    };
    timestamp: number;
    method?: 'whatsapp' | 'email' | 'webhook' | 'ecommerce';
  }
  
  export interface OrderResult {
    success: boolean;
    orderId: string;
    message?: string;
    error?: string;
  }