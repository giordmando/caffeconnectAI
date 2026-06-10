import React from 'react';
import type { IConfigSection } from '../../interfaces/IConfigSection';
import type { AppConfig } from '../../../../config/interfaces/IAppConfig';

type KnowledgeBase = AppConfig['knowledgeBase'];
type KnowledgeSources = AppConfig['knowledgeSources'];
type KnowledgeEntry = NonNullable<KnowledgeBase>[number];

const KNOWLEDGE_TEMPLATES: KnowledgeEntry[] = [
  {
    key: 'orari e contatti',
    scope: 'global',
    facts: [
      'Siamo aperti dal lunedi al venerdi dalle 7:30 alle 19:30 e il sabato dalle 8:00 alle 13:00.',
      'Per prenotazioni o ordini urgenti il cliente puo contattarci via telefono o WhatsApp.'
    ]
  },
  {
    key: 'allergeni e intolleranze',
    scope: 'global',
    facts: [
      'Il cliente deve sempre segnalare allergie o intolleranze prima di ordinare.',
      'Sono disponibili alternative senza lattosio e bevande vegetali su richiesta.'
    ]
  },
  {
    key: 'promozioni del giorno',
    scope: 'global',
    facts: [
      'La promozione del giorno puo essere aggiornata dall esercente in questo pannello.',
      'Quando il cliente chiede offerte o promozioni, proponi prima le offerte attive.'
    ]
  },
  {
    key: 'ordini e ritiro',
    scope: 'global',
    facts: [
      'Gli ordini possono essere preparati per il ritiro in negozio.',
      'Prima di confermare un ordine raccogli nome, telefono ed eventuali note del cliente.'
    ]
  },
  {
    key: 'servizi del locale',
    scope: 'global',
    facts: [
      'Il locale offre WiFi per i clienti e tavoli per consumazione sul posto.',
      'Per gruppi numerosi e richieste speciali e consigliata la prenotazione.'
    ]
  }
];

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
  const entries = config || [];
  const validUrls = (sources.urls || []).filter(url => /^https?:\/\//i.test(url));
  const invalidUrls = (sources.urls || []).filter(url => url && !/^https?:\/\//i.test(url));

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

  const handleAddTemplate = (template: KnowledgeEntry) => {
    const exists = entries.some(entry => entry.key.trim().toLowerCase() === template.key.trim().toLowerCase());
    if (exists) return;

    onChange('_self', [
      ...entries,
      {
        ...template,
        facts: [...template.facts]
      }
    ]);
  };

  const handleAddDemoPack = () => {
    const existingKeys = new Set(entries.map(entry => entry.key.trim().toLowerCase()));
    const newEntries = KNOWLEDGE_TEMPLATES
      .filter(template => !existingKeys.has(template.key.trim().toLowerCase()))
      .map(template => ({
        ...template,
        facts: [...template.facts]
      }));

    if (newEntries.length > 0) {
      onChange('_self', [...entries, ...newEntries]);
    }
  };

  const handleClearInlineText = () => {
    onSourcesChange?.({
      ...sources,
      inlineText: ''
    });
  };

  const handleAddEntry = () => {
    const newEntry = { key: '', facts: [''], scope: 'global' as const };
    onChange('_self', [...entries, newEntry]);
  };
  
  const handleRemoveEntry = (index: number) => {
    const newKnowledgeBase = entries.filter((_, i) => i !== index);
    onChange('_self', newKnowledgeBase);
  };
  
  const handleEntryChange = (index: number, field: string, value: any) => {
    const newKnowledgeBase = [...entries];
    (newKnowledgeBase[index] as any)[field] = value;
    onChange('_self', newKnowledgeBase);
  };
  
  const handleFactChange = (entryIndex: number, factIndex: number, value: string) => {
    const newKnowledgeBase = [...entries];
    newKnowledgeBase[entryIndex].facts[factIndex] = value;
    onChange('_self', newKnowledgeBase);
  };
  
  const handleAddFact = (entryIndex: number) => {
    const newKnowledgeBase = [...entries];
    newKnowledgeBase[entryIndex].facts.push('');
    onChange('_self', newKnowledgeBase);
  };
  
  const handleRemoveFact = (entryIndex: number, factIndex: number) => {
    const newKnowledgeBase = [...entries];
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
        <h4>Stato knowledge</h4>
        <p className="form-text">
          Fonti configurate: {validUrls.length} URL validi, {entries.length} voci strutturate, {(sources.inlineText || '').trim().length} caratteri di testo libero.
          {invalidUrls.length > 0 ? ` URL non validi: ${invalidUrls.length}.` : ''}
        </p>
      </div>

      <div className="knowledge-entry-card">
        <h4>Template rapidi esercente</h4>
        <p className="form-text">
          Aggiungi blocchi pronti e poi personalizzali con le informazioni reali del locale.
        </p>
        <div className="template-actions">
          <button type="button" className="add-btn-small" onClick={handleAddDemoPack}>
            Aggiungi pack demo
          </button>
          {KNOWLEDGE_TEMPLATES.map(template => {
            const exists = entries.some(entry => entry.key.trim().toLowerCase() === template.key.trim().toLowerCase());
            return (
              <button
                key={template.key}
                type="button"
                className="add-btn-small"
                onClick={() => handleAddTemplate(template)}
                disabled={exists}
              >
                {exists ? `${template.key} gia presente` : template.key}
              </button>
            );
          })}
        </div>
      </div>

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
          {(sources.inlineText || '').trim().length > 0 && (
            <button
              type="button"
              className="remove-btn-small"
              onClick={handleClearInlineText}
            >
              Svuota testo
            </button>
          )}
        </div>
      </div>
      
      {entries.map((entry, entryIndex) => (
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
