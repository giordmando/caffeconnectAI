# Webhook ordini

CafeConnect AI puo inviare gli ordini a un endpoint HTTP esterno, utile per collegare CRM, POS, e-commerce, fogli di lavoro o automazioni no-code.

Il flusso consigliato e:

```text
Checkout React -> AI Gateway /v1/orders -> Webhook gestionale
```

In questo modo il browser non chiama direttamente il gestionale, si riducono i problemi CORS e il gateway puo tracciare successo o fallimento dell'invio.

## Configurazione

1. Apri **Impostazioni Business**.
2. Vai nella sezione **Business > Informazioni di Contatto**.
3. Compila **Webhook ordini** con un endpoint `https://`.
4. Salva la configurazione.
5. Nel checkout comparira il metodo **Gestionale**.
6. Usa **Test webhook** per inviare un ordine demo prima di andare live.

Il checkout chiama il gateway con metodo `POST` su `/v1/orders`. Il gateway inoltra poi il webhook finale con header `Content-Type: application/json`.

In produzione puoi configurare il webhook lato server:

```bash
AI_GATEWAY_ORDER_WEBHOOK_URL=https://tuo-gestionale.example.com/orders
```

Se questa variabile non e presente, il gateway usa il valore configurato nella UI merchant.

## Payload

Esempio:

```json
{
  "event": "order.created",
  "source": "cafeconnect-ai",
  "business": {
    "name": "CafeConnect Roastery",
    "type": "cafe",
    "phone": "+39 02 1234567",
    "email": "info@cafeconnect.example.com"
  },
  "order": {
    "id": "ORD-1718123456789-ab12c",
    "businessId": "CafeConnect Roastery",
    "userId": "user-demo",
    "method": "webhook",
    "subtotal": 18.5,
    "createdAt": "2026-06-12T10:15:30.000Z",
    "timestamp": 1781268930000,
    "userInfo": {
      "name": "Mario Rossi",
      "phone": "+39 333 1234567",
      "notes": "Ritiro alle 18:00"
    },
    "items": [
      {
        "id": "ethiopia-yirgacheffe",
        "name": "Etiopia Yirgacheffe",
        "price": 18.5,
        "quantity": 1,
        "type": "product"
      }
    ]
  }
}
```

## Risposte attese

Il checkout considera l'ordine inviato quando l'endpoint risponde con uno status HTTP `2xx`.

Risposte `4xx` o `5xx` vengono mostrate all'utente come errore di invio e tracciate negli analytics come `order_failed`.

## Storico gateway

Il gateway espone gli ultimi invii ordine su:

```text
GET /v1/orders?limit=25
```

La dashboard esercente mostra questo storico per verificare rapidamente ordini inviati e falliti. In locale i record sono salvati in:

```text
server/ai-gateway/data/orders.json
```

## Note operative

- Usa endpoint HTTPS in produzione.
- Se colleghi strumenti no-code, crea uno scenario che riceve JSON via webhook e poi scrive su CRM, email, foglio ordini o gestionale.
- Per ambienti serverless, rispondi rapidamente con `200` o `202` e gestisci eventuali lavorazioni lente in background.
