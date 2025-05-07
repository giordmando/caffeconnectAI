import React, { useState } from 'react';
import { UIComponent } from '../../../types/UI';
import { uiComponentRegistry } from '../registry/UIComponentRegistry';

interface NLPInsightsPanelProps {
  components: UIComponent[];
  onAction?: (action: string, payload: any) => void;
}

/**
 * Pannello dedicato che organizza e presenta tutti i componenti di analisi NLP
 * in una maniera strutturata e user-friendly
 */
export const NLPInsightsPanel: React.FC<NLPInsightsPanelProps> = ({ 
  components, 
  onAction 
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  if (components.length === 0) {
    return null;
  }

  // Organizza i componenti per tipo
  const sentimentComponents = components.filter(comp => comp.type === 'sentimentIndicator');
  const intentComponents = components.filter(comp => comp.type === 'intentSuggestions');
  const topicComponents = components.filter(comp => comp.type === 'topicTags');
  const nlpInsightComponents = components.filter(comp => comp.type === 'nlpInsights');

  // Identifica componenti AI vs utente per i topic
  const userTopicComponents = topicComponents.filter(comp => !comp.data.isAI);
  const aiTopicComponents = topicComponents.filter(comp => comp.data.isAI);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="nlp-insights-panel">
      <div className="panel-header" onClick={toggleExpand}>
        <h3>Analisi NLP</h3>
        <span className={`expand-icon ${isExpanded ? 'expanded' : 'collapsed'}`}>
          {isExpanded ? '▼' : '►'}
        </span>
      </div>

      {isExpanded && (
        <div className="panel-content">
          {/* Sezione sentiment */}
          {sentimentComponents.length > 0 && (
            <div className="insights-section">
              <h4>Analisi del Sentiment</h4>
              {sentimentComponents.map(comp => (
                <div key={comp.id} className="insight-item">
                  {uiComponentRegistry.createComponent(comp, onAction)}
                </div>
              ))}
            </div>
          )}

          {/* Sezione intenti */}
          {intentComponents.length > 0 && (
            <div className="insights-section">
              <h4>Intenti rilevati</h4>
              {intentComponents.map(comp => (
                <div key={comp.id} className="insight-item">
                  {uiComponentRegistry.createComponent(comp, onAction)}
                </div>
              ))}
            </div>
          )}

          {/* Sezione topic per messaggi utente */}
          {userTopicComponents.length > 0 && (
            <div className="insights-section">
              <h4>Argomenti nei tuoi messaggi</h4>
              {userTopicComponents.map(comp => (
                <div key={comp.id} className="insight-item">
                  {uiComponentRegistry.createComponent(comp, onAction)}
                </div>
              ))}
            </div>
          )}

          {/* Sezione topic per messaggi AI */}
          {aiTopicComponents.length > 0 && (
            <div className="insights-section">
              <h4>Argomenti nelle risposte dell'assistente</h4>
              {aiTopicComponents.map(comp => (
                <div key={comp.id} className="insight-item">
                  {uiComponentRegistry.createComponent(comp, onAction)}
                </div>
              ))}
            </div>
          )}

          {/* Insights NLP generali */}
          {nlpInsightComponents.length > 0 && (
            <div className="insights-section">
              <h4>Insights avanzati</h4>
              {nlpInsightComponents.map(comp => (
                <div key={comp.id} className="insight-item">
                  {uiComponentRegistry.createComponent(comp, onAction)}
                </div>
              ))}
            </div>
          )}

          {/* Sezione aiuto */}
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