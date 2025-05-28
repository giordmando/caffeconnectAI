export { BaseComponentCreator } from './BaseComponentCreator';
export { LoyaltyCardCreator } from './LoyaltyCardCreator';
export { MenuCarouselCreator } from './MenuCarouselCreator';
export { ProductCarouselCreator } from './ProductCarouselCreator';
export { ProductDetailCreator } from './ProductDetailCreator';
export { PreferencesCardCreator } from './PreferencesCardCreator';

import { uiComponentFactory } from '../UIComponentFactory';
import { LoyaltyCardCreator } from './LoyaltyCardCreator';
import { MenuCarouselCreator } from './MenuCarouselCreator';
import { ProductCarouselCreator } from './ProductCarouselCreator';
import { ProductDetailCreator } from './ProductDetailCreator';
import { PreferencesCardCreator } from './PreferencesCardCreator';

export function registerUIComponentCreators(): void {
  console.log('Registering UI component creators...');
  
  // Register all creators
  uiComponentFactory.register(new LoyaltyCardCreator());
  uiComponentFactory.register(new MenuCarouselCreator());
  uiComponentFactory.register(new ProductCarouselCreator());
  uiComponentFactory.register(new ProductDetailCreator());
  uiComponentFactory.register(new PreferencesCardCreator());
  
  console.log('UI component creators registered successfully!');
}