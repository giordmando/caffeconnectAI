# CafeConnect AI Gateway

This is the first server-side AI foundation for CafeConnect AI.

It moves the AI orchestration path out of the browser and creates a place for secure model calls, tool execution, tracing, consent checks, rate limits, and future Agents/MCP integrations.

## Run

```bash
npm run gateway:start
```

Default URL: `http://localhost:8787`.

Without `OPENAI_API_KEY`, the gateway runs in deterministic demo mode and uses the local mock catalog files.

## Endpoints

- `GET /health`: gateway mode, model, registered tools.
- `GET /v1/tools`: tool schemas exposed to the model.
- `POST /v1/chat`: chat orchestration endpoint.
- `POST /v1/events`: store one or more business analytics events.
- `GET /v1/events/summary`: aggregate business analytics for the merchant dashboard.
- `POST /v1/orders`: validate and forward checkout orders to the merchant webhook.
- `GET /v1/orders?limit=25`: recent gateway order submissions and failures.

## Current tools

- `search_menu`
- `search_products`
- `get_item_detail`
- `create_order_draft`

## Next architecture step

Replace the single orchestrator with an agent router: Triage, Menu Advisor, Product Sales, Order, Business Config, Analytics, Support, Privacy/Consent, and Campaign Agent.

MCP integrations should attach below the tool registry, not directly in the React UI.

## Merchant Analytics Events

The React app records local business events and mirrors them to the gateway when available.

Supported events include:

- `message_sent`
- `gateway_result`
- `ui_action`
- `item_viewed`
- `add_to_cart`
- `cart_opened`
- `cart_cleared`
- `checkout_started`
- `order_submitted`
- `order_failed`

Runtime analytics are stored in:

```text
server/ai-gateway/data/businessEvents.json
```

This file is intentionally ignored by git.

## Order Webhook Gateway

The React checkout sends webhook orders to:

```text
POST /v1/orders
```

The gateway validates the order, forwards it to the merchant webhook, and records success/failure in merchant analytics.

You can configure a server-side default webhook:

```bash
AI_GATEWAY_ORDER_WEBHOOK_URL=https://example.com/orders
AI_GATEWAY_MAX_ORDERS=500
```

If this variable is omitted, the endpoint can still receive `webhookUrl` in the request body from the merchant UI configuration.

Recent order records are stored in:

```text
server/ai-gateway/data/orders.json
```

This file is intentionally ignored by git.

## Merchant Knowledge Sources

The gateway can search merchant-provided knowledge through the `knowledge_search` tool.

Default demo data lives in:

```text
server/ai-gateway/data/defaultKnowledge.json
```

Remote sources can be configured with comma-separated URLs:

```bash
AI_GATEWAY_KNOWLEDGE_URLS=https://example.com/knowledge.json,https://example.com/faq.txt
```

Inline JSON can also be provided:

```bash
AI_GATEWAY_KNOWLEDGE_INLINE='[{"title":"Offerta del giorno","content":"Oggi cappuccino e cornetto a 3.50 euro","tags":["offerte","colazione"]}]'
```

Supported JSON shapes:

```json
[
  { "title": "Orari", "content": "Aperti dalle 7 alle 20", "tags": ["orari"] }
]
```

or:

```json
{ "knowledgeBase": [{ "key": "orari", "facts": ["Aperti dalle 7 alle 20"] }] }
```
