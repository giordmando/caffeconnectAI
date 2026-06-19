# Demo produzione CafeConnect AI

## Obiettivo

Presentare CafeConnect AI come concierge commerciale agentico per food retail e hospitality: risponde usando fonti merchant reali, consiglia menu e prodotti, prepara ordini, invia al gestionale e produce insight.

## Fonti demo pronte

Menu:

```text
https://caffeconnectai-1.onrender.com/demo-data/cafeconnect-menu.json
```

Catalogo prodotti:

```text
https://caffeconnectai-1.onrender.com/demo-data/cafeconnect-products.json
```

Knowledge merchant:

```text
https://caffeconnectai-1.onrender.com/merchant-knowledge/cafeconnect.json
```

Config production-demo da importare nel pannello Admin:

```text
https://caffeconnectai-1.onrender.com/demo-data/cafeconnect-production-config.json
```

## Setup Render

Gateway Node:

```env
OPENAI_API_KEY=<openai-key>
OPENAI_MODEL=gpt-4o-mini
AI_GATEWAY_DEMO_MODE=false
AI_GATEWAY_ALLOWED_ORIGINS=https://caffeconnectai-1.onrender.com,https://caffeconnectai.onrender.com
AI_GATEWAY_DEFAULT_MERCHANT_ID=cafeconnect-roastery
AI_GATEWAY_TENANT_ISOLATION_MODE=schema-per-tenant
AI_GATEWAY_MERCHANT_CONFIG_READ_KEY=<viewer-key>
AI_GATEWAY_MERCHANT_CONFIG_WRITE_KEY=<admin-key>
AI_GATEWAY_MERCHANT_CONFIG_OWNER_KEY=<owner-key>
AI_GATEWAY_MAX_AUDIT_EVENTS=5000
AI_GATEWAY_MAX_BUSINESS_EVENTS=5000
AI_GATEWAY_MAX_ORDERS=500
```

Frontend pubblico:

```env
REACT_APP_AI_GATEWAY_URL=https://caffeconnectai.onrender.com
REACT_APP_MERCHANT_ID=cafeconnect-roastery
REACT_APP_MERCHANT_CONFIG_READ_KEY=<viewer-key>
```

Frontend admin interno:

```env
REACT_APP_ENABLE_ADMIN_PANEL=true
REACT_APP_AI_GATEWAY_URL=https://caffeconnectai.onrender.com
REACT_APP_MERCHANT_ID=cafeconnect-roastery
REACT_APP_MERCHANT_CONFIG_READ_KEY=<viewer-key>
```

## Integrazione Make/Zapier

1. Crea un webhook custom in Make o Zapier.
2. Copia l'URL webhook.
3. Apri Admin Control Plane.
4. Carica la config merchant.
5. Inserisci l'URL in uno di questi campi:

```json
{
  "integrations": {
    "makeWebhookUrl": "https://hook.eu1.make.com/...",
    "zapierWebhookUrl": ""
  }
}
```

In alternativa usa:

```json
{
  "business": {
    "orderWebhook": "https://hook.eu1.make.com/..."
  }
}
```

6. Salva con owner key se modifichi `integrations`.

Payload inviato al webhook:

```json
{
  "event": "order.created",
  "source": "cafeconnect-ai-gateway",
  "business": {
    "name": "CafeConnect Roastery",
    "type": "cafe"
  },
  "order": {
    "id": "ORD-...",
    "items": [],
    "subtotal": 0,
    "userInfo": {
      "name": "Cliente Demo",
      "phone": "+39..."
    }
  }
}
```

## Conversazioni demo

### Pranzo naturale

Cliente:

```text
Avete qualcosa per pranzo oggi? Vorrei qualcosa di leggero.
```

Atteso:

```text
Propone bowl pollo e cereali o insalata quinoa avocado, non solo caffe o dessert.
```

### Allergeni

Cliente:

```text
Sono intollerante al lattosio, cosa posso prendere a colazione?
```

Atteso:

```text
Chiede conferma della restrizione, propone cappuccino con bevanda d'avena, evita prodotti con latte/burro.
```

### Regalo

Cliente:

```text
Mi serve un regalo per una persona che ama il caffe filtro.
```

Atteso:

```text
Propone Etiopia Yirgacheffe o Box degustazione, chiede se vuole formato regalo o prodotto singolo.
```

### Ordine

Cliente:

```text
Vorrei ordinare una bowl pollo e cereali per ritiro alle 13:15.
```

Atteso:

```text
Raccoglie nome e telefono, conferma ordine, poi permette checkout/invio webhook.
```

### Operativita merchant

Cliente:

```text
Avete WiFi e posso prenotare un tavolo per 7 persone?
```

Atteso:

```text
Risponde da knowledge: WiFi gratuito, per gruppi sopra 6 consiglia prenotazione telefonica, non conferma booking se non collegato.
```

## Racconto commerciale

CafeConnect AI non e un chatbot generico. E un sistema agentico per merchant: Triage Agent capisce l'intento, Knowledge Agent recupera fonti reali, Menu Advisor consiglia in base a momento e allergeni, Sales Agent converte su prodotti e bundle, Order Agent porta al checkout, Analytics Agent trasforma conversazioni in insight.

Valore per il merchant:

- meno domande ripetitive;
- piu conversione su menu, prodotti e box regalo;
- ordini collegabili a Make, Zapier, POS o CRM;
- conoscenza merchant aggiornata da fonti esterne;
- privacy by design e separazione tenant;
- audit log e ruoli admin per readiness enterprise.
