import React from 'react';
import { UIComponent } from '../../../../../types/UI';
import { NLPInsightsPanel } from '../../../../../components/ui/nlp/NLPInsightsPanel';
import { BaseComponentCreator } from '../BaseComponentCreator';

export class NLPInsightsPanelCreator extends BaseComponentCreator {
  componentType = 'nlpInsightsPanel';
  functionNames = []; // Non associato a funzioni
  protected isUniqueComponent = true;
  
  createReactElement(component: UIComponent, onAction?: (action: string, payload: any) => void): React.ReactElement {
    return React.createElement(NLPInsightsPanel, {
      components: component.data.components || [],
      placement: component.placement,
      onAction
    });
  }
  
  createUIComponent(data: any, placement: string = 'sidebar'): UIComponent {
    return {
      type: this.componentType,
      data: {
        components: data.components || [],
        analysis: data.analysis,
        message: data.message
      },
      placement,
      id: this.generateComponentId('nlp-panel', data),
      _updated: Date.now()
    };
  }
}