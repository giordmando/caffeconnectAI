import React from 'react';
import { AnalysisType } from '../services/analytics/nlp/interfaces/INLPService';

interface MetricsProps {
  analysis: Record<AnalysisType, any[]>;
  showDetails?: boolean;
}

/**
 * Componente per la visualizzazione avanzata delle metriche di sentiment
 */
export const SentimentMetrics: React.FC<MetricsProps> = ({ analysis, showDetails = true }) => {
  if (!analysis || !analysis[AnalysisType.SENTIMENT] || analysis[AnalysisType.SENTIMENT].length === 0) {
    return null;
  }

  const sentiment = analysis[AnalysisType.SENTIMENT][0];
  const compound = sentiment.compound || 0;
  
  // Determina il colore in base al sentiment
  const getColor = () => {
    if (compound > 0.3) return '#48bb78'; // verde per positivo
    if (compound < -0.3) return '#e53e3e'; // rosso per negativo
    return '#a0aec0'; // grigio per neutro
  };
  
  // Determina la larghezza della barra
  const getWidth = () => {
    return `${Math.abs(compound * 100)}%`;
  };
  
  // Determina la posizione della barra
  const getPosition = () => {
    return compound >= 0 ? 'right' : 'left';
  };
  
  // Determina la label del sentiment
  const getSentimentLabel = () => {
    if (compound > 0.3) return 'Positivo';
    if (compound < -0.3) return 'Negativo';
    return 'Neutro';
  };

  return (
    <div className="sentiment-metrics">
      <div className="sentiment-value">
        <span className="sentiment-label">{getSentimentLabel()}</span>
        <span className="sentiment-score">{(Math.abs(compound) * 100).toFixed(0)}%</span>
      </div>
      
      <div className="sentiment-gauge">
        <div className="sentiment-scale">
          <span className="scale-negative">Negativo</span>
          <span className="scale-neutral">Neutro</span>
          <span className="scale-positive">Positivo</span>
        </div>
        
        <div className="gauge-container">
          <div 
            className={`gauge-bar ${getPosition()}`}
            style={{ 
              width: getWidth(),
              backgroundColor: getColor()
            }}
          ></div>
          <div className="gauge-center-mark"></div>
        </div>
      </div>
      
      {showDetails && (
        <div className="sentiment-details">
          <div className="detail-item">
            <span className="detail-label">Positivo:</span>
            <span className="detail-value">{(sentiment.positive * 100).toFixed(0)}%</span>
            <div className="detail-bar" style={{ width: `${sentiment.positive * 100}%`, backgroundColor: '#48bb78' }}></div>
          </div>
          
          <div className="detail-item">
            <span className="detail-label">Neutro:</span>
            <span className="detail-value">{(sentiment.neutral * 100).toFixed(0)}%</span>
            <div className="detail-bar" style={{ width: `${sentiment.neutral * 100}%`, backgroundColor: '#a0aec0' }}></div>
          </div>
          
          <div className="detail-item">
            <span className="detail-label">Negativo:</span>
            <span className="detail-value">{(sentiment.negative * 100).toFixed(0)}%</span>
            <div className="detail-bar" style={{ width: `${sentiment.negative * 100}%`, backgroundColor: '#e53e3e' }}></div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Componente per la visualizzazione degli intenti rilevati
 */
export const IntentMetrics: React.FC<MetricsProps> = ({ analysis, showDetails = true }) => {
  if (!analysis || !analysis[AnalysisType.INTENT] || analysis[AnalysisType.INTENT].length === 0) {
    return null;
  }

  // Ordina gli intenti per confidenza
  const intents = [...analysis[AnalysisType.INTENT]]
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
    .slice(0, 5); // Mostra solo i primi 5

  return (
    <div className="intent-metrics">
      <ul className="intent-list">
        {intents.map((intent, index) => (
          <li key={index} className="intent-item">
            <div className="intent-header">
              <span className="intent-name">{intent.name || intent.category || 'Intent'}</span>
              <span className="intent-confidence">{(intent.confidence * 100).toFixed(0)}%</span>
            </div>
            
            {showDetails && (
              <div className="intent-bar-container">
                <div 
                  className="intent-bar" 
                  style={{ width: `${intent.confidence * 100}%` }}
                ></div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

/**
 * Componente per la visualizzazione delle entità rilevate
 */
export const EntityMetrics: React.FC<MetricsProps> = ({ analysis }) => {
  if (!analysis || !analysis[AnalysisType.ENTITY] || analysis[AnalysisType.ENTITY].length === 0) {
    return null;
  }

  // Raggruppa entità per tipo
  const entityTypes = analysis[AnalysisType.ENTITY].reduce((acc: Record<string, any[]>, entity) => {
    const type = entity.type || 'other';
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(entity);
    return acc;
  }, {});

  return (
    <div className="entity-metrics">
      {Object.entries(entityTypes).map(([type, entities], typeIndex) => (
        <div key={typeIndex} className="entity-type">
          <h5 className="entity-type-name">{type}</h5>
          <div className="entity-tags">
            {entities.map((entity, entityIndex) => (
              <span 
                key={entityIndex} 
                className="entity-tag"
                style={{ opacity: entity.confidence || 0.8 }}
              >
                {entity.text}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Componente per la visualizzazione dei topic rilevati
 */
export const TopicMetrics: React.FC<MetricsProps> = ({ analysis }) => {
  if (!analysis || !analysis[AnalysisType.TOPIC] || analysis[AnalysisType.TOPIC].length === 0) {
    return null;
  }

  // Ordina i topic per confidenza
  const topics = [...analysis[AnalysisType.TOPIC]]
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

  return (
    <div className="topic-metrics">
      <div className="topic-cloud">
        {topics.map((topic, index) => (
          <span 
            key={index} 
            className="topic-tag"
            style={{ 
              fontSize: `${Math.max(14, 16 + (topic.confidence || 0.5) * 8)}px`,
              opacity: 0.7 + (topic.confidence || 0.3) * 0.3
            }}
          >
            {topic.name}
          </span>
        ))}
      </div>
    </div>
  );
};

/**
 * Dashboard completo delle metriche NLP
 */
export const NLPMetricsDashboard: React.FC<{ analysis: Record<AnalysisType, any[]> }> = ({ analysis }) => {
  if (!analysis) return null;
  
  const hasSentiment = analysis[AnalysisType.SENTIMENT]?.length > 0;
  const hasIntents = analysis[AnalysisType.INTENT]?.length > 0;
  const hasEntities = analysis[AnalysisType.ENTITY]?.length > 0;
  const hasTopics = analysis[AnalysisType.TOPIC]?.length > 0;
  
  if (!hasSentiment && !hasIntents && !hasEntities && !hasTopics) {
    return <div className="no-metrics">Nessuna metrica NLP disponibile</div>;
  }

  return (
    <div className="nlp-metrics-dashboard">
      {hasSentiment && (
        <div className="dashboard-section">
          <h4>Sentiment</h4>
          <SentimentMetrics analysis={analysis} />
        </div>
      )}
      
      {hasIntents && (
        <div className="dashboard-section">
          <h4>Intenti</h4>
          <IntentMetrics analysis={analysis} />
        </div>
      )}
      
      {hasTopics && (
        <div className="dashboard-section">
          <h4>Argomenti</h4>
          <TopicMetrics analysis={analysis} />
        </div>
      )}
      
      {hasEntities && (
        <div className="dashboard-section">
          <h4>Entità</h4>
          <EntityMetrics analysis={analysis} />
        </div>
      )}
    </div>
  );
};