// src/services/ui/factories/ComponentFactoryRegistry.ts
import { IComponentFactory } from './IComponentFactory';
import { LoyaltyCardFactory } from './LoyaltyCardFactory';
import { MenuCarouselFactory } from './MenuCarouselFactory';
import { ProductCarouselFactory } from './ProductCarouselFactory';
import { PreferencesCardFactory } from './PreferencesCardFactory';
import { ProductDetailFactory } from './ProductDetailFactory';
import { UIComponent } from '../../../types/UI';

export class ComponentFactoryRegistry {
  private static instance: ComponentFactoryRegistry;
  private factories: Map<string, IComponentFactory> = new Map();
  
  private constructor() {
    // Registra le factory predefinite
    this.registerFactory(new LoyaltyCardFactory());
    this.registerFactory(new MenuCarouselFactory());
    this.registerFactory(new ProductCarouselFactory());
    this.registerFactory(new PreferencesCardFactory());
    this.registerFactory(new ProductDetailFactory());
  }
  
  public static getInstance(): ComponentFactoryRegistry {
    if (!ComponentFactoryRegistry.instance) {
      ComponentFactoryRegistry.instance = new ComponentFactoryRegistry();
    }
    return ComponentFactoryRegistry.instance;
  }
  
  public registerFactory(factory: IComponentFactory): void {
    this.factories.set(factory.getComponentType(), factory);
  }
  
  public getFactory(type: string): IComponentFactory | undefined {
    return this.factories.get(type);
  }
  
  public createComponent(type: string, data: any, placement?: string): UIComponent | null {
    const factory = this.getFactory(type);
    return factory ? factory.createComponent(data, placement) : null;
  }
  
  public getFactoryForFunction(functionName: string): IComponentFactory | undefined {
    for (const factory of Array.from(this.factories.values())) {
      if (factory.shouldHandleFunction(functionName)) {
        return factory;
      }
    }
    return undefined;
  }
  
  public createFromFunctionResult(functionName: string, result: any): UIComponent | null {
    const factory = this.getFactoryForFunction(functionName);
    return factory ? factory.createFromFunctionResult(functionName, result) : null;
  }
}

export const componentFactoryRegistry = ComponentFactoryRegistry.getInstance();