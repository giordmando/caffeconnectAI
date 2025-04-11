 
  // src/types/MenuItem.ts
  export interface MenuItem {
    id: string;
    name: string;
    category: string;
    subcategory: string;
    timeOfDay: string[];
    price: number;
    description: string;
    ingredients: string[];
    preferences: string[];
    imageUrl: string;
    allergens: string[];
    dietaryInfo: string[];
    popularity: number;
    alcoholic?: boolean;
  }
  