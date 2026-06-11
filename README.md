# CafeConnect AI

CafeConnect AI e un commerce copilot per bar, caffetterie e piccoli locali: aiuta i clienti a scegliere, fare domande su menu e allergeni, aggiungere prodotti al carrello e preparare ordini via WhatsApp o integrazioni future.

Il progetto combina una web app React/PWA con un AI Gateway server-side. Il gateway custodisce le credenziali AI, orchestra tool di catalogo e knowledge base, e prepara la base per agenti specializzati, integrazioni POS/CRM e analytics per l'esercente.

## Perche e diverso da un chatbot generico

- **Verticale per locali**: menu, prodotti acquistabili, allergeni, orari, promozioni, carrello e ordini.
- **AI con dati reali del merchant**: catalogo JSON/CSV, knowledge base configurabile e sorgenti remote pubbliche.
- **Componenti dinamici**: la chat mostra card, carousel e dettagli prodotto invece di solo testo.
- **Gateway server-side**: le chiamate al modello e i tool vivono fuori dal browser.
- **Demo mode**: funziona anche senza `OPENAI_API_KEY`, usando dati locali deterministici.
- **Pronto per evolvere in SaaS**: multi-agente, dashboard, tracciamento conversioni e integrazioni operative sono gia nella direzione architetturale.

## Esperienza demo

Flussi consigliati per mostrare valore in pochi minuti:

1. Chiedi: `Cosa mi consigli per colazione?`
2. Chiedi: `Avete alternative senza lattosio?`
3. Chiedi: `Mostrami prodotti da comprare`
4. Apri una card prodotto e aggiungila al carrello.
5. Prepara un ordine WhatsApp.
6. Apri **Impostazioni Business** e personalizza nome locale, catalogo, knowledge base e privacy.

## Architettura

```text
React PWA
  -> Chat UI, componenti dinamici, carrello, configuratore
  -> AI Gateway Client

AI Gateway
  -> Responses API / demo mode
  -> Tool registry
  -> Catalog tools
  -> Knowledge tools
  -> futuro router multi-agente
```

## Tool AI Gateway

- `search_menu`: cerca voci menu per query, categoria o momento della giornata.
- `search_products`: cerca prodotti acquistabili.
- `get_item_detail`: recupera dettaglio prodotto o voce menu.
- `create_order_draft`: prepara una bozza ordine senza inviarla.
- `knowledge_search`: risponde da knowledge base dell'esercente.

## Avvio locale

Installa le dipendenze:

```bash
npm install
```

Avvia il gateway:

```bash
npm run gateway:start
```

Avvia la web app:

```bash
npm start
```

URL principali:

- App: `http://localhost:3000`
- Gateway: `http://localhost:8787`
- Gateway health: `http://localhost:8787/health`
- Gateway harness: `http://localhost:8787/`
- Analytics summary: `http://localhost:8787/v1/events/summary`

Senza `OPENAI_API_KEY`, il gateway usa la modalita demo.

## Variabili ambiente utili

```bash
OPENAI_API_KEY=...
AI_GATEWAY_MODEL=gpt-4.1-mini
AI_GATEWAY_PORT=8787
AI_GATEWAY_ALLOWED_ORIGINS=http://localhost:3000
REACT_APP_AI_GATEWAY_URL=http://localhost:8787
REACT_APP_ENABLE_AI_GATEWAY=true
```

## Catalogo e knowledge base

La demo usa dati locali in `src/api/mockData`.

Per collegare dati reali:

- pubblica un Google Sheet come CSV;
- usa i template in `public/template-json`;
- incolla l'URL negli endpoint catalogo dentro **Impostazioni Business > Catalogo**;
- aggiungi FAQ, orari, policy allergeni e offerte in **Knowledge Base**.

## Roadmap prodotto

Priorita consigliate:

1. Demo commerciale verticale con dati e immagini realistiche.
2. Router multi-agente: triage, menu advisor, sales, order, campaign, analytics.
3. Dashboard esercente con conversioni, domande frequenti, prodotti richiesti e richieste senza risposta.
4. Integrazioni: Google Sheets, webhook ordine, WhatsApp Business, pagamenti, POS.
5. Multi-tenant SaaS con configurazioni server-side, sicurezza, rate limit e cost tracking AI.

## Script

```bash
npm start          # web app React
npm run build      # build produzione
npm test           # test runner CRA
npm run gateway:start
npm run gateway:dev
```
