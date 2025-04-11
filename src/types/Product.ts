
  // src/types/Product.ts
  export interface Product {
    id: string;
    name: string;
    category: string;
    price: number;
    description: string;
    details: Record<string, any>;
    imageUrl: string;
    inStock: boolean;
    popularity: number;
  }
  

  