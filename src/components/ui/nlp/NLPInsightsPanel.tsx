import React, { useState } from 'react';
import { UIComponent } from '../../../types/UI';
import { componentFactory } from '../../../services/ui/component/ComponentFactory';

interface NLPInsightsPanelProps {
  components: UIComponent[];
  placement: string;
  onAction?: (action: string, payload: any) => void;
}

export const NLPInsightsPanel: React.FC<NLPInsightsPanelProps> = ({ 
  components, 
  placement,
  onAction 
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  if (components.length === 0) {
    return null;
  }

  const sentimentComponents = components.filter(comp => comp.type === 'sentimentIndicator');
  const intentComponents = components.filter(comp => comp.type === 'intentSuggestions');
  const topicComponents = components.filter(comp => comp.type === 'topicTags');
  const nlpInsightComponents = components.filter(comp => comp.type === 'nlpInsights');

  const userTopicComponents = topicComponents.filter(comp => !comp.data.isAI);
  const aiTopicComponents = topicComponents.filter(comp => comp.data.isAI);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  let containerClassName = "dynamic-ui-container";
  
  switch (placement) {
    case 'inline':
      containerClassName += " dynamic-ui-inline";
      break;
    case 'bottom':
      containerClassName += " dynamic-ui-bottom";
      break;
    case 'sidebar':
      containerClassName += " dynamic-ui-sidebar";
      break;
    default:
      containerClassName += " dynamic-ui-default";
  }

  return (
    <div className={`nlp-insights-panel ${containerClassName}`}>
      <div className="panel-header" onClick={toggleExpand}>
        <h3>Analisi NLP</h3>
        <span className={`expand-icon ${isExpanded ? 'expanded' : 'collapsed'}`}>
          {isExpanded ? '▼' : '►'}
        </span>
      </div>

      {isExpanded && (
        <div className="panel-content">
          {sentimentComponents.length > 0 && (
            <div className="insights-section">
              <h4>Analisi del Sentiment</h4>
              {sentimentComponents.map(comp => (
                <div key={comp.id} className="insight-item">
                  {componentFactory.createReactElement(comp, onAction)}
                </div>
              ))}
            </div>
          )}

          {intentComponents.length > 0 && (
            <div className="insights-section">
              <h4>Intenti rilevati</h4>
              {intentComponents.map(comp => (
                <div key={comp.id} className="insight-item">
                  {componentFactory.createReactElement(comp, onAction)}
                </div>
              ))}
            </div>
          )}

          {userTopicComponents.length > 0 && (
            <div className="insights-section">
              <h4>Argomenti nei tuoi messaggi</h4>
              {userTopicComponents.map(comp => (
                <div key={comp.id} className="insight-item">
                  {componentFactory.createReactElement(comp, onAction)}
                </div>
              ))}
            </div>
          )}

          {aiTopicComponents.length > 0 && (
            <div className="insights-section">
              <h4>Argomenti nelle risposte dell'assistente</h4>
              {aiTopicComponents.map(comp => (
                <div key={comp.id} className="insight-item">
                  {componentFactory.createReactElement(comp, onAction)}
                </div>
              ))}
            </div>
          )}

          {nlpInsightComponents.length > 0 && (
            <div className="insights-section">
              <h4>Insights avanzati</h4>
              {nlpInsightComponents.map(comp => (
                <div key={comp.id} className="insight-item">
                  {componentFactory.createReactElement(comp, onAction)}
                </div>
              ))}
            </div>
          )}

          <div className="insights-help">
            <p>
              Queste analisi ti aiutano a capire meglio la conversazione. 
              Puoi cliccare su qualsiasi elemento per esplorare l'argomento.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};