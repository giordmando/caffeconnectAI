import { componentFactory } from '../ComponentFactory';

// Import standard creators
import { ProductDetailCreator } from '../creators/ProductDetailCreator';
import { MenuCarouselCreator } from '../creators/MenuCarouselCreator';
import { LoyaltyCardCreator } from '../creators/LoyaltyCardCreator';
import { PreferencesCardCreator } from '../creators/PreferencesCardCreator';
import { ProductCarouselCreator } from '../creators/ProductCarouselCreator';
import { NLPInsightsPanelCreator } from '../creators/nlp/NLPInsightsPanelCreator';

// Import NLP creators
import {
  SentimentIndicatorCreator,
  IntentSuggestionsCreator,
  TopicTagsCreator,
  NLPInsightsCardCreator
} from '../creators/nlp/NLPCreators';

// Import component type registry
import { uiTypeRegistry } from '../../UITypeRegistry';

export function registerAllComponents(): void {
  console.log('Starting unified component registration...');
  
  // Register standard components
  const standardCreators = [
    new ProductDetailCreator(),
    new MenuCarouselCreator(),
    new LoyaltyCardCreator(),
    new PreferencesCardCreator(),
    new ProductCarouselCreator()
  ];
  
  const nlpCreators = [
    new SentimentIndicatorCreator(),
    new IntentSuggestionsCreator(),
    new TopicTagsCreator(),
    new NLPInsightsCardCreator(),
    new NLPInsightsPanelCreator()
  ];

  
  // Register all creators
  [...standardCreators, ...nlpCreators].forEach(creator => {
    componentFactory.register(creator);
    console.log(`✓ Registered: ${creator.getComponentType()}`);
  });
  
  // Update type registry with deduplication rules
  uiTypeRegistry.registerType('loyaltyCard', { isUnique: true, displayName: 'Loyalty Card' });
  uiTypeRegistry.registerType('preferencesCard', { isUnique: true, displayName: 'Preferences Card' });
  uiTypeRegistry.registerType('productDetail', { isUnique: false, limit: 5, displayName: 'Product Detail' });
  uiTypeRegistry.registerType('menuCarousel', { isUnique: false, limit: 1, displayName: 'Menu Carousel' });
  uiTypeRegistry.registerType('productCarousel', { isUnique: false, limit: 1, displayName: 'Product Carousel' });
  
  // NLP components rules
  uiTypeRegistry.registerType('sentimentIndicator', { isUnique: false, limit: 3, displayName: 'Sentiment Analysis' });
  uiTypeRegistry.registerType('intentSuggestions', { isUnique: false, limit: 3, displayName: 'Intent Suggestions' });
  uiTypeRegistry.registerType('topicTags', { isUnique: false, limit: 5, displayName: 'Topic Tags' });
  uiTypeRegistry.registerType('nlpInsights', { isUnique: false, limit: 1, displayName: 'NLP Insights' });
  
  uiTypeRegistry.registerType('nlpInsightsPanel', { 
    isUnique: true, 
    displayName: 'NLP Insights Panel' 
  });
  
  console.log('✅ All unified components registered successfully!');
  console.log(`Total registered types: ${componentFactory.getRegisteredTypes().length}`);
}

// Migration helper to replace old registration
export function migrateFromOldSystem(): void {
  console.log('🔄 Migrating from old component system...');
  
  // Remove old registration if it exists
  if (typeof window !== 'undefined' && (window as any).__oldComponentFactory) {
    console.log('Cleaning up old component factory...');
    delete (window as any).__oldComponentFactory;
  }
  
  // Register new components
  registerAllComponents();
  
  console.log('✅ Migration complete!');
}

// Export a compatibility layer for gradual migration
export const componentCompatibilityLayer = {
  // Map old factory methods to new ones
  createComponent: (component: any, onAction?: any) => {
    return componentFactory.createReactElement(component, onAction);
  },
  
  createFromFunctionResult: (functionName: string, result: any) => {
    return componentFactory.createFromFunctionResult(functionName, result);
  },
  
  // Helper to check if using new system
  isNewSystemActive: () => true
};