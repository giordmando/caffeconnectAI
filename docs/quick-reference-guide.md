# CaféConnect AI - Guida di Riferimento Rapido

## Per Sviluppatori

### Architettura
- **Pattern**: Architettura modulare basata su singleton e registry
- **Stato**: Gestito con React Context API e localStorage
- **Configurazione**: Centralizzata tramite ConfigManager

### Componenti Principali
1. **ConfigManager**: Gestione configurazione centralizzata
2. **AppInitializer**: Inizializzazione ordinata servizi
3. **AIProviderRegistry**: Registrazione provider AI
4. **FunctionRegistry**: Gestione funzioni personalizzabili
5. **CatalogService**: Gestione menu e prodotti
6. **ThemeService**: Personalizzazione aspetto

### Estensibilità
- Nuovi provider AI: Implementare interfaccia IAIProvider e registrare
- Nuove funzioni: Registrare tramite functionRegistry.registerFunction()
- Nuovi componenti UI: Creare componente React e registrare in UIComponentRegistry

### Comandi CLI Utili
```bash
# Installazione
npm install

# Sviluppo
npm start

# Build
npm run build

# Test
npm test
```

### File di Configurazione
```json
{
  "business": { "name": "...", "type": "...", ... },
  "ai": { "defaultProvider": "...", ... },
  "catalog": { ... },
  "functions": { ... },
  "ui": { ... }
}
```

## Per Business

### Setup Rapido
1. Accedere al pannello admin
2. Inserire informazioni business e caricare logo
3. Configurare catalogo (menu e prodotti)
4. Personalizzare tema (colori, stile)
5. Attivare funzioni desiderate
6. Testare l'assistente
7. Implementare nella location

### Personalizzazione AI
- **Prompt di sistema**: Adattare al brand e stile comunicativo
- **Tono di voce**: Informale/professionale/amichevole
- **Catalogo**: Dettagliare prodotti con descrizioni ricche

### Integrazioni Supportate
- Sistemi POS: [Elenco supportato]
- CRM: [Elenco supportato]
- Siti web: Codice embed disponibile
- App mobile: API RESTful

### Metriche Chiave
- Tasso di engagement (% clienti che usano l'assistente)
- Tasso di conversione (% conversazioni che portano a ordini)
- Soddisfazione cliente (punteggio medio feedback)
- Tempo risparmiato al personale

### Contatti Supporto
- Email: support@cafeconnect.ai
- Telefono: [Numero]
- Portale: admin.cafeconnect.ai/support

## Per Utenti

### Cosa Puoi Chiedere
- Informazioni su menu e prodotti
- Consigli personalizzati
- Gestione punti fedeltà
- Orari e servizi
- Ordinazioni (dove disponibile)

### Comandi Utili
- "Cosa mi consigli...": Per raccomandazioni
- "Quali sono...": Per informazioni su categoria
- "Ho un'allergia a...": Per filtrare allergeni
- "Quanti punti ho": Per programma fedeltà
- "Vorrei ordinare...": Per effettuare ordini

### Personalizzazione
- Comunica preferenze e gusti
- Crea un profilo per esperienze personalizzate
- Fornisci feedback per migliorare i consigli

### In Caso di Problemi
- Riavvia conversazione
- Cerca aiuto del personale
- Usa "Segnala problema" nel menu

## Glossario

- **Provider AI**: Sistema di intelligenza artificiale sottostante (OpenAI, Claude, etc.)
- **Prompt di sistema**: Istruzioni base che definiscono comportamento AI
- **Componente UI dinamico**: Elemento interattivo generato dalla conversazione
- **Registry**: Sistema di registrazione componenti modulari
- **Funzione**: Capacità specifica che l'AI può utilizzare
- **Catalogo**: Database di menu e prodotti disponibili
- **Contesto utente**: Informazioni sull'utente e preferenze

## Risorse

### Per Sviluppatori
- GitHub: [URL repository]
- Documentazione API: [URL docs]
- Community: [Forum URL]

### Per Business
- Portale Admin: admin.cafeconnect.ai
- Knowledge Base: support.cafeconnect.ai/kb
- Webinar formazione: [URL calendario]

### Per Utenti
- Video tutorial: [URL]
- FAQ: [URL]
- Centro assistenza: [URL]