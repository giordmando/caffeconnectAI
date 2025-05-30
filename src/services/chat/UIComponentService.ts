import { UIComponent } from '../../types/UI';
import { ComponentManager } from '../ui/compstore/ComponentManager';
import { componentFactory } from '../ui/component/ComponentFactory';
import { AnalysisType } from '../analytics/nlp/interfaces/INLPService';

export interface IUIComponentService {
  addComponent(component: UIComponent): void;
  addComponents(components: UIComponent[]): void;
  clearComponents(): void;
  getComponentManager(): ComponentManager;
  triggerUpdate(): void;
  getUpdateCount(): number;
  createNLPComponents(message: any, nlpAnalysis: any): UIComponent[];
  createFunctionResultComponent(functionName: string, result: any): UIComponent | null;
}

export class UIComponentService implements IUIComponentService {
  private componentManager: ComponentManager;
  private updateCount: number = 0;
  
  constructor(componentManager: ComponentManager) {
    this.componentManager = componentManager;
  }
  
  addComponent(component: UIComponent): void {
    this.componentManager.addComponent(component);
    this.triggerUpdate();
  }
  
  addComponents(components: UIComponent[]): void {
    components.forEach(comp => this.componentManager.addComponent(comp));
    this.triggerUpdate();
  }
  
  clearComponents(): void {
    this.componentManager.clearComponents();
    this.triggerUpdate();
  }
  
  getComponentManager(): ComponentManager {
    return this.componentManager;
  }
  
  triggerUpdate(): void {
    this.updateCount++;
  }
  
  getUpdateCount(): number {
    return this.updateCount;
  }
  
  createNLPComponents(message: any, nlpAnalysis: any): UIComponent[] {
    const components: UIComponent[] = [];
    
    // Crea pannello NLP insights se ci sono analisi
    if (nlpAnalysis) {
      const nlpComponents: UIComponent[] = [];
      
      // Sentiment component
      if (nlpAnalysis[AnalysisType.SENTIMENT]?.length > 0) {
        const sentimentComp = componentFactory.createUIComponent(
          'sentimentIndicator',
          {
            sentiment: nlpAnalysis[AnalysisType.SENTIMENT][0],
            message: message.content
          },
          'sidebar'
        );
        if (sentimentComp) nlpComponents.push(sentimentComp);
      }
      
      // Intents component
      if (nlpAnalysis[AnalysisType.INTENT]?.length > 0) {
        const intentComp = componentFactory.createUIComponent(
          'intentSuggestions',
          {
            intents: nlpAnalysis[AnalysisType.INTENT],
            message: message.content
          },
          'sidebar'
        );
        if (intentComp) nlpComponents.push(intentComp);
      }
      
      // Topics component
      if (nlpAnalysis[AnalysisType.TOPIC]?.length > 0) {
        const topicComp = componentFactory.createUIComponent(
          'topicTags',
          {
            topics: nlpAnalysis[AnalysisType.TOPIC],
            message: message.content,
            isAI: message.role === 'assistant'
          },
          'sidebar'
        );
        if (topicComp) nlpComponents.push(topicComp);
      }
      
      // Crea pannello contenitore se ci sono componenti NLP
      if (nlpComponents.length > 0) {
        const nlpPanelComponent = componentFactory.createUIComponent(
          'nlpInsightsPanel',
          {
            components: nlpComponents,
            analysis: nlpAnalysis,
            message: message.content
          },
          'sidebar'
        );
        
        if (nlpPanelComponent) {
          components.push(nlpPanelComponent);
        }
      }
    }
    
    return components;
  }
  
  createFunctionResultComponent(functionName: string, result: any): UIComponent | null {
    if (!result.success || !result.data?.uiComponent) {
      return null;
    }
    
    const uiComponentData = result.data.uiComponent;
    const componentData = uiComponentData.data;
    
    // Validazione specifica per tipo
    if (uiComponentData.type === 'productDetail') {
      if (!componentData || !componentData.id || !componentData.name || 
          typeof componentData.category !== 'string') {
        console.warn('[UIComponentService] Invalid data for ProductDetailComponent:', componentData);
        return null;
      }
    }
    
    // Crea il componente
    const newComponent: UIComponent = {
      type: uiComponentData.type,
      data: componentData,
      id: `${uiComponentData.type}-${componentData.id}-${Date.now()}`,
      placement: uiComponentData.placement || 'inline',
      _updated: Date.now(),
    };
    
    return newComponent;
  }
}