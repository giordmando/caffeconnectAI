export interface ComponentTypeDefinition {
    isUnique: boolean;
    limit?: number;
    placement?: string[];
    displayName?: string;
    description?: string;
  }
  
  export class UITypeRegistry {
    private static instance: UITypeRegistry;
    private typeDefinitions: Map<string, ComponentTypeDefinition> = new Map();
    
    private constructor() {
      // Definizioni predefinite
      this.registerType('loyaltyCard', { isUnique: true, displayName: 'Loyalty Card' });
      this.registerType('preferencesCard', { isUnique: true, displayName: 'Preferences Card' });
      this.registerType('productDetail', { isUnique: false, limit: 5, displayName: 'Product Detail' });
      this.registerType('menuCarousel', { isUnique: false, limit: 1, displayName: 'Menu Carousel' });
      this.registerType('productCarousel', { isUnique: false, limit: 1, displayName: 'Product Carousel' });
    }
    
    public static getInstance(): UITypeRegistry {
      if (!UITypeRegistry.instance) {
        UITypeRegistry.instance = new UITypeRegistry();
      }
      return UITypeRegistry.instance;
    }
    
    public registerType(type: string, definition: ComponentTypeDefinition): void {
      this.typeDefinitions.set(type, definition);
    }
    
    public getTypeDefinition(type: string): ComponentTypeDefinition | undefined {
      return this.typeDefinitions.get(type);
    }
    
    public static isUniqueType(type: string): boolean {
      const definition = UITypeRegistry.getInstance().getTypeDefinition(type);
      return definition ? definition.isUnique : false;
    }
    
    public static getTypeLimit(type: string): number {
      const definition = UITypeRegistry.getInstance().getTypeDefinition(type);
      return definition?.limit || 3; // Default limit
    }
    
    public getAllUniqueTypes(): string[] {
      const uniqueTypes: string[] = [];
      this.typeDefinitions.forEach((def, type) => {
        if (def.isUnique) uniqueTypes.push(type);
      });
      return uniqueTypes;
    }
  }
  
  export const uiTypeRegistry = UITypeRegistry.getInstance();