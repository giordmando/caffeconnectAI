import React from 'react';
import type { IConfigSection } from '../../interfaces/IConfigSection';
import type { AppConfig } from '../../../../config/interfaces/IAppConfig';
import { AIGatewayClient, AIGatewayChatResponse } from '../../../../services/ai/gateway/AIGatewayClient';

type KnowledgeBase = AppConfig['knowledgeBase'];
type KnowledgeSources = AppConfig['knowledgeSources'];
type MerchantKnowledge = AppConfig['merchantKnowledge'];
type KnowledgeEntry = NonNullable<KnowledgeBase>[number];
type MerchantKnowledgeSource = NonNullable<MerchantKnowledge>['sources'][number];

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
  appConfig?: AppConfig;
  knowledgeSources?: KnowledgeSources;
  merchantKnowledge?: MerchantKnowledge;
  onSourcesChange?: (value: KnowledgeSources) => void;
  onMerchantKnowledgeChange?: (value: MerchantKnowledge) => void;
}

export const KnowledgeBasePanel: React.FC<KnowledgeBasePanelProps> = ({
  config,
  onChange,
  appConfig,
  knowledgeSources,
  merchantKnowledge,
  onSourcesChange,
  onMerchantKnowledgeChange,
  className = ''
}) => {
  const gatewayClient = React.useMemo(() => new AIGatewayClient(), []);
  const [testQuestion, setTestQuestion] = React.useState('Avete WiFi e posso prenotare per 7 persone?');
  const [testResult, setTestResult] = React.useState<AIGatewayChatResponse | null>(null);
  const [testError, setTestError] = React.useState('');
  const [isTestingKnowledge, setIsTestingKnowledge] = React.useState(false);
  const sources = knowledgeSources || { urls: [], inlineText: '' };
  const merchantSources = merchantKnowledge?.sources || [];
  const entries = config || [];
  const activeMerchantSources = merchantSources.filter(source => source.enabled && /^https?:\/\//i.test(source.url));
  const invalidMerchantSources = merchantSources.filter(source => source.enabled && source.url && !/^https?:\/\//i.test(source.url));

  const handleUrlsChange = (value: string) => {
    onSourcesChange?.({
      ...sources,
      urls: value.split('\n').map(url => url.trim()).filter(Boolean)
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

  const handleAddMerchantSource = () => {
    onMerchantKnowledgeChange?.({
      sources: [
        ...merchantSources,
        {
          id: `source-${Date.now()}`,
          label: '',
          type: 'url',
          url: '',
          enabled: true
        }
      ]
    });
  };

  const handleMerchantSourceChange = (index: number, field: keyof MerchantKnowledgeSource, value: any) => {
    const nextSources = [...merchantSources];
    nextSources[index] = {
      ...nextSources[index],
      [field]: value
    };
    onMerchantKnowledgeChange?.({ sources: nextSources });
  };

  const handleRemoveMerchantSource = (index: number) => {
    onMerchantKnowledgeChange?.({
      sources: merchantSources.filter((_, sourceIndex) => sourceIndex !== index)
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

  const handleTestKnowledge = async () => {
    if (!testQuestion.trim()) {
      setTestError('Inserisci una domanda di prova.');
      return;
    }

    if (!appConfig) {
      setTestError('Configurazione completa non disponibile per il test.');
      return;
    }

    setIsTestingKnowledge(true);
    setTestError('');
    setTestResult(null);

    try {
      const effectiveConfig: AppConfig = {
        ...appConfig,
        knowledgeBase: entries,
        knowledgeSources: sources,
        merchantKnowledge: { sources: merchantSources }
      };

      const response = await gatewayClient.sendMessage({
        message: testQuestion,
        conversationId: `knowledge_test_${Date.now()}`,
        business: effectiveConfig.business,
        tenant: effectiveConfig.tenant,
        dataGovernance: effectiveConfig.dataGovernance,
        agents: effectiveConfig.agents,
        integrations: effectiveConfig.integrations,
        knowledgeBase: effectiveConfig.knowledgeBase || [],
        knowledgeSources: effectiveConfig.knowledgeSources || { urls: [], inlineText: '' },
        merchantKnowledge: effectiveConfig.merchantKnowledge || { sources: [] }
      });

      setTestResult(response);
    } catch (error) {
      setTestError(error instanceof Error ? error.message : 'Test knowledge non riuscito.');
    } finally {
      setIsTestingKnowledge(false);
    }
  };
  
  return (
    <div className={`config-section ${className}`}>
      <h3>Knowledge Base</h3>
      <p className="form-text">
        Collega fonti merchant reali e aggiungi solo i fatti strutturati che vuoi governare direttamente.
      </p>

      <div className="knowledge-entry-card">
        <h4>Stato knowledge</h4>
        <p className="form-text">
          Fonti merchant attive: {activeMerchantSources.length}. Voci strutturate: {entries.length}.
          {invalidMerchantSources.length > 0 ? ` Fonti non valide: ${invalidMerchantSources.length}.` : ''}
        </p>
      </div>

      <div className="knowledge-entry-card knowledge-test-card">
        <div className="knowledge-test-header">
          <div>
            <h4>Test domanda</h4>
            <p className="form-text">
              Prova subito come l AI usera fonti merchant, fatti strutturati e regole privacy configurate.
            </p>
          </div>
          <span>{activeMerchantSources.length + entries.length} fonti valutate</span>
        </div>
        <div className="knowledge-test-controls">
          <input
            type="text"
            value={testQuestion}
            onChange={(event) => setTestQuestion(event.target.value)}
            placeholder="Es. Avete WiFi e posso prenotare per 7 persone?"
          />
          <button
            type="button"
            className="catalog-apply-btn"
            onClick={handleTestKnowledge}
            disabled={isTestingKnowledge || !testQuestion.trim()}
          >
            {isTestingKnowledge ? 'Test in corso...' : 'Testa risposta AI'}
          </button>
        </div>
        {testError && (
          <div className="knowledge-test-result knowledge-test-error">
            {testError}
          </div>
        )}
        {testResult && (
          <div className="knowledge-test-result">
            <div className="knowledge-test-meta">
              <span>{testResult.agent?.label || 'Agente non indicato'}</span>
              <span>{testResult.mode}</span>
              <span>{testResult.toolCalls?.length || 0} tool call</span>
            </div>
            <p>{testResult.message}</p>
            {Boolean(testResult.toolCalls?.length) && (
              <div className="knowledge-test-tools">
                {testResult.toolCalls?.map((toolCall, index) => (
                  <span key={`${toolCall.name}-${index}`}>{toolCall.name}</span>
                ))}
              </div>
            )}
          </div>
        )}
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
        <h4>Fonti merchant esterne</h4>
        <p className="form-text">
          Usa fonti pubbliche o pubblicate dal merchant: FAQ JSON, export menu, pagine sito, documenti pubblicati o endpoint Make/Zapier.
        </p>

        {merchantSources.map((source, index) => (
          <div key={source.id || index} className="merchant-source-row">
            <label className="config-toggle merchant-source-toggle">
              <input
                type="checkbox"
                checked={source.enabled}
                onChange={(event) => handleMerchantSourceChange(index, 'enabled', event.target.checked)}
              />
              <span>Attiva</span>
            </label>
            <input
              type="text"
              value={source.label}
              onChange={(event) => handleMerchantSourceChange(index, 'label', event.target.value)}
              placeholder="FAQ allergeni"
            />
            <select
              value={source.type}
              onChange={(event) => handleMerchantSourceChange(index, 'type', event.target.value)}
            >
              <option value="url">URL</option>
              <option value="json">JSON</option>
              <option value="faq">FAQ</option>
              <option value="sheet">Sheet</option>
              <option value="site">Sito</option>
            </select>
            <input
              type="url"
              value={source.url}
              onChange={(event) => handleMerchantSourceChange(index, 'url', event.target.value)}
              placeholder="https://..."
            />
            <button
              type="button"
              className="remove-btn-small"
              onClick={() => handleRemoveMerchantSource(index)}
            >
              Rimuovi
            </button>
          </div>
        ))}

        <button type="button" className="add-btn-small" onClick={handleAddMerchantSource}>
          Aggiungi fonte merchant
        </button>

        {(sources.urls || []).length > 0 && (
          <div className="form-group legacy-source-block">
            <label>URL legacy importati</label>
            <textarea
              rows={3}
              value={(sources.urls || []).join('\n')}
              onChange={(e) => handleUrlsChange(e.target.value)}
              placeholder="https://example.com/faq.json"
            />
            <p className="form-text">
              Questi URL restano supportati per compatibilita, ma la demo usa le fonti merchant sopra.
            </p>
          </div>
        )}
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
