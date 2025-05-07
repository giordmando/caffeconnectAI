import React from 'react';
import { AnalysisType } from '../../../services/analytics/nlp/interfaces/INLPService';
import CollapsibleComponent from '../shared/CollapsibleComponent';

/**
 * Componente per visualizzare l'analisi del sentiment
 * Rispetta il Single Responsibility Principle gestendo solo la visualizzazione del sentiment
 */
export const SentimentIndicator: React.FC<{
  sentiment: any;
  message: string;
  id: string;
  placement?: string;
  onAction?: (action: string, payload: any) => void;
}> = ({ sentiment, message, id, placement = 'sidebar', onAction }) => {
  // Determina il colore in base al sentiment
  const getColorFromSentiment = () => {
    const compound = sentiment.compound || 0;
    if (compound > 0.3) return '#48bb78'; // verde per positivo
    if (compound < -0.3) return '#e53e3e'; // rosso per negativo
    return '#a0aec0'; // grigio per neutro
  };

  // Determina il sentiment prevalente
  const getDominantSentiment = () => {
    if (sentiment.positive > sentiment.negative && sentiment.positive > sentiment.neutral) {
      return 'positivo';
    } else if (sentiment.negative > sentiment.positive && sentiment.negative > sentiment.neutral) {
      return 'negativo';
    } else {
      return 'neutro';
    }
  };

  const sentimentContent = (
    <div className="sentiment-content">
      <div className="sentiment-gauge">
        <div 
          className="sentiment-level" 
          style={{ 
            background: getColorFromSentiment(),
            width: `${Math.abs((sentiment.compound || 0) * 100)}%`
          }}
        ></div>
      </div>
      <div className="sentiment-labels">
        <span className="sentiment-negative">Negativo</span>
        <span className="sentiment-neutral">Neutro</span>
        <span className="sentiment-positive">Positivo</span>
      </div>
      <div className="sentiment-details">
        <div className="sentiment-score">
          <span>Positivo: {(sentiment.positive * 100).toFixed(0)}%</span>
        </div>
        <div className="sentiment-score">
          <span>Neutro: {(sentiment.neutral * 100).toFixed(0)}%</span>
        </div>
        <div className="sentiment-score">
          <span>Negativo: {(sentiment.negative * 100).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );

  return (
    <CollapsibleComponent 
      title={`Analisi del sentiment: ${getDominantSentiment()}`}
      className="sentiment-indicator"
      placement={placement}
      initialExpanded={placement === 'sidebar'}
    >
      {sentimentContent}
    </CollapsibleComponent>
  );
};

/**
 * Componente per visualizzare gli intenti rilevati
 */
export const IntentSuggestions: React.FC<{
  intents: any[];
  message: string;
  id: string;
  placement?: string;
  onAction?: (action: string, payload: any) => void;
}> = ({ intents, message, id, placement = 'inline', onAction }) => {
  if (!intents || intents.length === 0) return null;
  
  // Filtra solo gli intenti con alta confidenza (> 50%)
  const highConfidenceIntents = intents.filter(intent => intent.confidence > 0.5);
  
  if (highConfidenceIntents.length === 0) return null;

  const handleIntentClick = (intent: any) => {
    if (onAction) {
      onAction('intent_selected', { intent, message });
    }
  };

  const intentsContent = (
    <div className="intent-list">
      {highConfidenceIntents.map((intent, index) => (
        <div 
          key={index} 
          className="intent-item"
          onClick={() => handleIntentClick(intent)}
        >
          <span className="intent-name">{intent.name || intent.category}</span>
          <span className="intent-confidence">
            {(intent.confidence * 100).toFixed(0)}%
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <CollapsibleComponent 
      title="Intenti rilevati"
      className="intent-suggestions"
      placement={placement}
      initialExpanded={false}
    >
      {intentsContent}
    </CollapsibleComponent>
  );
};

/**
 * Componente per visualizzare i topic rilevati come tag
 */
export const TopicTags: React.FC<{
  topics: any[];
  message: string;
  id: string;
  placement?: string;
  isAI?: boolean;
  onAction?: (action: string, payload: any) => void;
}> = ({ topics, message, id, placement = 'bottom', isAI = false, onAction }) => {
  if (!topics || topics.length === 0) return null;

  const handleTopicClick = (topic: any) => {
    if (onAction) {
      onAction('topic_selected', { topic, message });
    }
  };

  const topicsContent = (
    <div className="topic-list">
      {topics.map((topic, index) => (
        <span 
          key={index} 
          className="topic-tag"
          onClick={() => handleTopicClick(topic)}
          style={{ opacity: topic.confidence || 0.8 }}
        >
          {topic.name}
        </span>
      ))}
    </div>
  );

  return (
    <CollapsibleComponent 
      title={isAI ? "Argomenti nella risposta" : "Argomenti rilevati"}
      className="topic-tags"
      placement={placement}
      initialExpanded={placement === 'sidebar'}
    >
      {topicsContent}
    </CollapsibleComponent>
  );
};

/**
 * Componente di insight completo NLP
 * Combina vari tipi di analisi in un'unica visualizzazione
 */
export const NLPInsightsCard: React.FC<{
  analysis: Record<AnalysisType, any[]>;
  message: string;
  id: string;
  placement?: string;
  onAction?: (action: string, payload: any) => void;
}> = ({ analysis, message, id, placement = 'sidebar', onAction }) => {
  const hasSentiment = analysis[AnalysisType.SENTIMENT]?.length > 0;
  const hasIntents = analysis[AnalysisType.INTENT]?.length > 0;
  const hasTopics = analysis[AnalysisType.TOPIC]?.length > 0;
  const hasEntities = analysis[AnalysisType.ENTITY]?.length > 0;
  
  if (!hasSentiment && !hasIntents && !hasTopics && !hasEntities) {
    return null;
  }

  const insightsContent = (
    <div className="insights-content">
      {hasSentiment && (
        <div className="insight-section">
          <SentimentIndicator 
            sentiment={analysis[AnalysisType.SENTIMENT][0]} 
            message={message}
            id={`${id}-sentiment`}
            placement={placement}
            onAction={onAction}
          />
        </div>
      )}
      
      {hasIntents && (
        <div className="insight-section">
          <IntentSuggestions 
            intents={analysis[AnalysisType.INTENT]} 
            message={message}
            id={`${id}-intents`}
            placement={placement}
            onAction={onAction}
          />
        </div>
      )}
      
      {hasTopics && (
        <div className="insight-section">
          <TopicTags 
            topics={analysis[AnalysisType.TOPIC]} 
            message={message}
            id={`${id}-topics`}
            placement={placement}
            onAction={onAction}
          />
        </div>
      )}
      
      {hasEntities && (
        <div className="insight-section">
          <h4>Entità rilevate</h4>
          <div className="entity-list">
            {analysis[AnalysisType.ENTITY].map((entity, index) => (
              <div key={index} className="entity-item">
                <span className="entity-text">{entity.text}</span>
                <span className="entity-type">{entity.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <CollapsibleComponent 
      title="Insights NLP"
      className="nlp-insights-card"
      placement={placement}
      initialExpanded={false}
    >
      {insightsContent}
    </CollapsibleComponent>
  );
};