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
    console.log("Registering LoyaltyCard with data:", component.data);
    // Aggiungiamo controlli per evitare errori
    const data = component.data || {};
    return (
      <LoyaltyCard 
        points={data.points || 0} 
        tier={data.tier || 'Bronze'} 
        nextTier={data.nextTier || { name: 'Silver', pointsNeeded: 100 }} 
        history={data.history || []} 
        id={component.id}
        onAction={onAction}
      />
    );
  });
  
  // Registra MenuCarousel component
  uiComponentRegistry.register('menuCarousel', (component, onAction) => {
    const data = component.data || {};
    return (
      <MenuCarousel 
        recommendations={data.recommendations || []} 
        timeOfDay={data.timeOfDay || 'morning'} 
        id={component.id}
        onAction={onAction}
      />
    );
  });
  
  // Registra ProductCarousel component
  uiComponentRegistry.register('productCarousel', (component, onAction) => {
    const data = component.data || {};
    return (
      <ProductCarousel 
        recommendations={data.recommendations || []} 
        id={component.id}
        onAction={onAction}
      />
    );
  });
  
  // Registra PreferencesCard component
  uiComponentRegistry.register('preferencesCard', (component, onAction) => {
    const data = component.data || {};
    return (
      <PreferencesCard 
        preferences={data.preferences || {}} 
        id={component.id}
        onAction={onAction}
      />
    );
  });
  
  console.log("UI components registered successfully!");
}

// Esporta una funzione per verificare se la registrazione è avvenuta
export function isComponentRegistered(type: string): boolean {
  return uiComponentRegistry.hasComponent(type);
}