import React from 'react';
import { UIComponent } from '../../../../../types/UI';
import { 
  SentimentIndicator, 
  IntentSuggestions, 
  TopicTags, 
  NLPInsightsCard 
} from '../../../../../components/ui/nlp/NLPComponents';
import { BaseComponentCreator } from '../BaseComponentCreator';

export class SentimentIndicatorCreator extends BaseComponentCreator {
  componentType = 'sentimentIndicator';
  functionNames = []; // NLP components non sono associati a funzioni
  
  createReactElement(component: UIComponent, onAction?: (action: string, payload: any) => void): React.ReactElement {
    return React.createElement(SentimentIndicator, {
      sentiment: component.data.sentiment,
      message: component.data.message,
      id: component.id,
      placement: component.placement,
      onAction
    });
  }
  
  createUIComponent(data: any, placement: string = 'sidebar'): UIComponent {
    return {
      type: this.componentType,
      data: {
        sentiment: data.sentiment,
        message: data.message
      },
      placement,
      id: this.generateComponentId('sentiment', data),
      _updated: Date.now()
    };
  }
}

export class IntentSuggestionsCreator extends BaseComponentCreator {
  componentType = 'intentSuggestions';
  functionNames = [];
  
  createReactElement(component: UIComponent, onAction?: (action: string, payload: any) => void): React.ReactElement {
    return React.createElement(IntentSuggestions, {
      intents: component.data.intents,
      message: component.data.message,
      id: component.id,
      placement: component.placement,
      onAction
    });
  }
  
  createUIComponent(data: any, placement: string = 'inline'): UIComponent {
    return {
      type: this.componentType,
      data: {
        intents: data.intents,
        message: data.message
      },
      placement,
      id: this.generateComponentId('intents', data),
      _updated: Date.now()
    };
  }
}

export class TopicTagsCreator extends BaseComponentCreator {
  componentType = 'topicTags';
  functionNames = [];
  
  createReactElement(component: UIComponent, onAction?: (action: string, payload: any) => void): React.ReactElement {
    return React.createElement(TopicTags, {
      topics: component.data.topics,
      message: component.data.message,
      id: component.id,
      placement: component.placement,
      isAI: component.data.isAI || false,
      onAction
    });
  }
  
  createUIComponent(data: any, placement: string = 'bottom'): UIComponent {
    return {
      type: this.componentType,
      data: {
        topics: data.topics,
        message: data.message,
        isAI: data.isAI || false
      },
      placement,
      id: this.generateComponentId('topics', data),
      _updated: Date.now()
    };
  }
}

export class NLPInsightsCardCreator extends BaseComponentCreator {
  componentType = 'nlpInsights';
  functionNames = [];
  
  createReactElement(component: UIComponent, onAction?: (action: string, payload: any) => void): React.ReactElement {
    return React.createElement(NLPInsightsCard, {
      analysis: component.data.analysis,
      message: component.data.message,
      id: component.id,
      placement: component.placement,
      onAction
    });
  }
  
  createUIComponent(data: any, placement: string = 'sidebar'): UIComponent {
    return {
      type: this.componentType,
      data: {
        analysis: data.analysis,
        message: data.message
      },
      placement,
      id: this.generateComponentId('nlp-insights', data),
      _updated: Date.now()
    };
  }
}