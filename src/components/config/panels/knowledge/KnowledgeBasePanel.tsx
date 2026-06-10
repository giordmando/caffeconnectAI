import React from 'react';
import type { IConfigSection } from '../../interfaces/IConfigSection';
import type { AppConfig } from '../../../../config/interfaces/IAppConfig';

type KnowledgeBase = AppConfig['knowledgeBase'];
type KnowledgeSources = AppConfig['knowledgeSources'];

interface KnowledgeBasePanelProps extends IConfigSection<KnowledgeBase> {
  // Override per gestire l'array direttamente
  onChange: (field: string, value: KnowledgeBase) => void;
  knowledgeSources?: KnowledgeSources;
  onSourcesChange?: (value: KnowledgeSources) => void;
}

export const KnowledgeBasePanel: React.FC<KnowledgeBasePanelProps> = ({
  config,
  onChange,
  knowledgeSources,
  onSourcesChange,
  className = ''
}) => {
  const sources = knowledgeSources || { urls: [], inlineText: '' };

  const handleUrlsChange = (value: string) => {
    onSourcesChange?.({
      ...sources,
      urls: value.split('\n').map(url => url.trim()).filter(Boolean)
    });
  };

  const handleInlineTextChange = (value: string) => {
    onSourcesChange?.({
      ...sources,
      inlineText: value
    });
  };

  const handleAddEntry = () => {
    const newEntry = { key: '', facts: [''], scope: 'global' as const };
    onChange('_self', [...(config || []), newEntry]);
  };
  
  const handleRemoveEntry = (index: number) => {
    const newKnowledgeBase = (config || []).filter((_, i) => i !== index);
    onChange('_self', newKnowledgeBase);
  };
  
  const handleEntryChange = (index: number, field: string, value: any) => {
    const newKnowledgeBase = [...(config || [])];
    (newKnowledgeBase[index] as any)[field] = value;
    onChange('_self', newKnowledgeBase);
  };
  
  const handleFactChange = (entryIndex: number, factIndex: number, value: string) => {
    const newKnowledgeBase = [...(config || [])];
    newKnowledgeBase[entryIndex].facts[factIndex] = value;
    onChange('_self', newKnowledgeBase);
  };
  
  const handleAddFact = (entryIndex: number) => {
    const newKnowledgeBase = [...(config || [])];
    newKnowledgeBase[entryIndex].facts.push('');
    onChange('_self', newKnowledgeBase);
  };
  
  const handleRemoveFact = (entryIndex: number, factIndex: number) => {
    const newKnowledgeBase = [...(config || [])];
    if (newKnowledgeBase[entryIndex].facts.length > 1) {
      newKnowledgeBase[entryIndex].facts.splice(factIndex, 1);
      onChange('_self', newKnowledgeBase);
    }
  };
  
  return (
    <div className={`config-section ${className}`}>
      <h3>Knowledge Base</h3>
      <p className="form-text">
        Aggiungi informazioni specifiche che l'AI deve conoscere.
      </p>

      <div className="knowledge-entry-card">
        <h4>Sorgenti aperte</h4>
        <p className="form-text">
          Collega fonti pubbliche dell'esercente: JSON, FAQ, testo, export o documenti pubblicati come URL.
        </p>

        <div className="form-group">
          <label>URL sorgenti knowledge</label>
          <textarea
            rows={3}
            value={(sources.urls || []).join('\n')}
            onChange={(e) => handleUrlsChange(e.target.value)}
            placeholder="https://example.com/faq.json&#10;https://example.com/menu-info.txt"
          />
        </div>

        <div className="form-group">
          <label>Testo libero esercente</label>
          <textarea
            rows={5}
            value={sources.inlineText || ''}
            onChange={(e) => handleInlineTextChange(e.target.value)}
            placeholder="Es. Offerta del giorno, policy allergeni, storia del locale, regole per il ritiro..."
          />
        </div>
      </div>
      
      {(config || []).map((entry, entryIndex) => (
        <div key={entryIndex} className="knowledge-entry-card">
          <div className="form-group">
            <label>Chiave / Contesto</label>
            <input
              type="text"
              value={entry.key}
              onChange={(e) => handleEntryChange(entryIndex, 'key', e.target.value)}
              placeholder="Es. orari, wifi, cornetto"
            />
          </div>
          
          <div className="form-group">
            <label>Fatti / Risposte</label>
            {entry.facts.map((fact, factIndex) => (
              <div key={factIndex} className="fact-item">
                <textarea
                  rows={2}
                  value={fact}
                  onChange={(e) => handleFactChange(entryIndex, factIndex, e.target.value)}
                  placeholder={`Fatto ${factIndex + 1}`}
                />
                <button
                  type="button"
                  className="remove-btn-small"
                  onClick={() => handleRemoveFact(entryIndex, factIndex)}
                  disabled={entry.facts.length <= 1}
                >
                  -
                </button>
              </div>
            ))}
            <button
              type="button"
              className="add-btn-small"
              onClick={() => handleAddFact(entryIndex)}
            >
              Aggiungi Fatto
            </button>
          </div>
          
          <div className="form-group">
            <label>Ambito</label>
            <select
              value={entry.scope || 'global'}
              onChange={(e) => handleEntryChange(entryIndex, 'scope', e.target.value)}
            >
              <option value="global">Globale</option>
              <option value="product">Prodotto Specifico</option>
              <option value="category">Categoria Specifica</option>
            </select>
          </div>
          
          {entry.scope === 'product' && (
            <div className="form-group">
              <label>ID Prodotto</label>
              <input
                type="text"
                value={entry.itemId || ''}
                onChange={(e) => handleEntryChange(entryIndex, 'itemId', e.target.value)}
                placeholder="ID dell'item"
              />
            </div>
          )}
          
          <button
            type="button"
            className="remove-btn"
            onClick={() => handleRemoveEntry(entryIndex)}
          >
            Rimuovi Voce
          </button>
        </div>
      ))}
      
      <button
        type="button"
        className="add-btn"
        onClick={handleAddEntry}
      >
        Aggiungi Nuova Voce
      </button>
    </div>
  );
};
