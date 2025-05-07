import React from 'react';
import { uiComponentRegistry } from './UIComponentRegistry';
import { SentimentIndicator, IntentSuggestions, TopicTags, NLPInsightsCard } from '../nlp/NLPComponents';

/**
 * Registra i componenti NLP nel registry
 * Rispetta l'Open-Closed Principle estendendo il registry senza modificarlo
 */
export function registerNLPComponents(): void {
  console.log("Registering NLP UI components...");
  
  // Registra il componente di sentiment
  uiComponentRegistry.register('sentimentIndicator', (component, onAction) => {
    return (
      <SentimentIndicator
        sentiment={component.data.sentiment}
        message={component.data.message}
        id={component.id}
        placement={component.placement}
        onAction={onAction}
      />
    );
  });
  
  // Registra il componente di intenti
  uiComponentRegistry.register('intentSuggestions', (component, onAction) => {
    return (
      <IntentSuggestions
        intents={component.data.intents}
        message={component.data.message}
        id={component.id}
        placement={component.placement}
        onAction={onAction}
      />
    );
  });
  
  // Registra il componente di topic
  uiComponentRegistry.register('topicTags', (component, onAction) => {
    return (
      <TopicTags
        topics={component.data.topics}
        message={component.data.message}
        id={component.id}
        placement={component.placement}
        isAI={component.data.isAI || false}
        onAction={onAction}
      />
    );
  });
  
  // Registra il componente insight completo
  uiComponentRegistry.register('nlpInsights', (component, onAction) => {
    return (
      <NLPInsightsCard
        analysis={component.data.analysis}
        message={component.data.message}
        id={component.id}
        placement={component.placement}
        onAction={onAction}
      />
    );
  });
  
  console.log("NLP UI components registered successfully!");
}

// Funzione che estende la registrazione di tutti i componenti
export function extendComponentRegistration(): void {
  // Prima registra i componenti standard
  import('./ComponentRegistration').then(({ registerComponents }) => {
    registerComponents();
    
    // Poi registra i componenti NLP
    registerNLPComponents();
    
    console.log("All UI components (standard + NLP) registered successfully!");
  }).catch(error => {
    console.error("Error registering components:", error);
  });
}