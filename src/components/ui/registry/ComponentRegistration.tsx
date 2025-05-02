import React from 'react';
import { uiComponentRegistry } from './UIComponentRegistry';
import { LoyaltyCard } from '../LoyaltyCard';
import { MenuCarousel } from '../MenuCarousel';
import { ProductCarousel } from '../ProductCarousel';
import { PreferencesCard } from '../PreferencesCard';

export function registerComponents(): void {
  console.log("Registering UI components...");
  
  // Registra LoyaltyCard component
  uiComponentRegistry.register('loyaltyCard', (component, onAction) => {
    console.log(component);
    return (
      <LoyaltyCard 
        points={component.data.points} 
        tier={component.data.tier} 
        nextTier={component.data.nextTier} 
        history={component.data.history} 
        id={component.id}
        onAction={onAction}
      />
    );
  });
  
  // Registra MenuCarousel component - assicurati che questo sia presente
  uiComponentRegistry.register('menuCarousel', (component, onAction) => (
    <MenuCarousel 
      recommendations={component.data.recommendations} 
      timeOfDay={component.data.timeOfDay} 
      id={component.id}
      onAction={onAction}
    />
  ));
  
  // Registra ProductCarousel component
  uiComponentRegistry.register('productCarousel', (component, onAction) => (
    <ProductCarousel 
      recommendations={component.data.recommendations} 
      id={component.id}
      onAction={onAction}
    />
  ));
  
  // Registra PreferencesCard component
  uiComponentRegistry.register('preferencesCard', (component, onAction) => (
    <PreferencesCard 
      preferences={component.data.preferences} 
      id={component.id}
      onAction={onAction}
    />
  ));
  
  console.log("UI components registered successfully!");
}

// Esporta una funzione per verificare se la registrazione è avvenuta
export function isComponentRegistered(type: string): boolean {
  return uiComponentRegistry.hasComponent(type);
}