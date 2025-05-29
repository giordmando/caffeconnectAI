import { uiComponentFactory } from '../UIComponentFactory';
import { BaseComponentCreator } from '../creators/BaseComponentCreator';
import { 
  SentimentIndicator, 
  IntentSuggestions, 
  TopicTags, 
  NLPInsightsCard 
} from '../../../components/ui/nlp/NLPComponents';
import { UIComponent } from '../../../types/UI';
import React from 'react';

class SentimentIndicatorCreator extends BaseComponentCreator {
  componentType = 'sentimentIndicator';
  
  create(component: UIComponent, onAction?: any): React.ReactElement {
    return React.createElement(SentimentIndicator, {
      sentiment: component.data.sentiment,
      message: component.data.message,
      id: component.id,
      placement: component.placement,
      onAction
    });
  }
}

class IntentSuggestionsCreator extends BaseComponentCreator {
  componentType = 'intentSuggestions';
  
  create(component: UIComponent, onAction?: any): React.ReactElement {
    return React.createElement(IntentSuggestions, {
      intents: component.data.intents,
      message: component.data.message,
      id: component.id,
      placement: component.placement,
      onAction
    });
  }
}

class TopicTagsCreator extends BaseComponentCreator {
  componentType = 'topicTags';
  
  create(component: UIComponent, onAction?: any): React.ReactElement {
    return React.createElement(TopicTags, {
      topics: component.data.topics,
      message: component.data.message,
      id: component.id,
      placement: component.placement,
      isAI: component.data.isAI || false,
      onAction
    });
  }
}

class NLPInsightsCardCreator extends BaseComponentCreator {
  componentType = 'nlpInsights';
  
  create(component: UIComponent, onAction?: any): React.ReactElement {
    return React.createElement(NLPInsightsCard, {
      analysis: component.data.analysis,
      message: component.data.message,
      id: component.id,
      placement: component.placement,
      onAction
    });
  }
}

export function registerNLPCreators(): void {
  console.log('Registering NLP UI component creators...');
  
  uiComponentFactory.register(new SentimentIndicatorCreator());
  uiComponentFactory.register(new IntentSuggestionsCreator());
  uiComponentFactory.register(new TopicTagsCreator());
  uiComponentFactory.register(new NLPInsightsCardCreator());
  
  console.log('NLP UI component creators registered successfully!');
}