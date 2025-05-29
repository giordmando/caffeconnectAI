import { uiComponentFactory } from '../UIComponentFactory';
import { LoyaltyCardCreator } from '../creators/LoyaltyCardCreator';
import { MenuCarouselCreator } from '../creators/MenuCarouselCreator';
import { ProductCarouselCreator } from '../creators/ProductCarouselCreator';
import { ProductDetailCreator } from '../creators/ProductDetailCreator';
import { PreferencesCardCreator } from '../creators/PreferencesCardCreator';

export function registerStandardCreators(): void {
  console.log('Registering standard UI component creators...');
  
  // Registra tutti i creator standard
  uiComponentFactory.register(new LoyaltyCardCreator());
  uiComponentFactory.register(new MenuCarouselCreator());
  uiComponentFactory.register(new ProductCarouselCreator());
  uiComponentFactory.register(new ProductDetailCreator());
  uiComponentFactory.register(new PreferencesCardCreator());
  
  console.log('Standard UI component creators registered successfully!');
}