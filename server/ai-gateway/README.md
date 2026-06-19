# CafeConnect AI Gateway

This is the first server-side AI foundation for CafeConnect AI.

It moves the AI orchestration path out of the browser and creates a place for secure model calls, tool execution, tracing, consent checks, rate limits, and future Agents/MCP integrations.

## Run

```bash
npm run gateway:start
```

Default URL: `http://localhost:8787`.

Without `OPENAI_API_KEY`, the gateway runs in deterministic demo mode.
Local mock catalog and default knowledge are used only for demo-like tenants.
For `tenant.environment=production` or `tenant.plan=pro|enterprise`, the gateway does not silently fall back to demo catalog or default knowledge.

## Endpoints

- `GET /health`: gateway mode, model, registered tools.
- `GET /v1/tools`: tool schemas exposed to the model.
- `POST /v1/chat`: chat orchestration endpoint.
- `POST /v1/events`: store one or more business analytics events.
- `GET /v1/events/summary`: aggregate business analytics for the merchant dashboard.
- `POST /v1/orders`: validate and forward checkout orders to the merchant webhook.
- `GET /v1/orders?limit=25`: recent gateway order submissions and failures.
- `GET /v1/merchants/:merchantId/config`: read server-side merchant configuration.
- `PUT /v1/merchants/:merchantId/config`: save server-side merchant configuration.

## Current tools

- `search_menu`
- `search_products`
- `get_item_detail`
- `customer_profile`
- `create_order_draft`
- `knowledge_search`

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

## Merchant Configuration Store

Enterprise merchant configuration can be stored server-side instead of relying only on browser `localStorage`:

```text
GET /v1/merchants/cafeconnect/config
PUT /v1/merchants/cafeconnect/config
```

The store persists only allowlisted merchant settings: business, catalog, knowledge, tenant, agents, integrations, UI, privacy, and data governance.
It strips API keys, secrets, customer profiles, user context, conversation messages, and transcripts before writing to disk.

The React app can load and mirror merchant config through the gateway when these frontend environment variables are set:

```bash
REACT_APP_AI_GATEWAY_URL=https://caffeconnectai.onrender.com
REACT_APP_MERCHANT_ID=cafeconnect-roastery
REACT_APP_MERCHANT_CONFIG_READ_KEY=read-only-key
```

Alternatively, point the app at an explicit config endpoint:

```bash
REACT_APP_MERCHANT_CONFIG_URL=https://caffeconnectai.onrender.com/v1/merchants/cafeconnect-roastery/config
```

Protect the gateway endpoints on Render by setting these variables on the Node web service:

```bash
AI_GATEWAY_MERCHANT_CONFIG_READ_KEY=read-only-key
AI_GATEWAY_MERCHANT_CONFIG_WRITE_KEY=admin-write-key
```

If the keys are omitted, the gateway keeps demo-compatible open access. For enterprise deployments, configure both keys.
Only expose the read key in the public React app. Do not expose the write key in a customer-facing build; keep writes behind an authenticated admin surface or a backend control plane.

For the temporary admin control plane in the React app, enable the panel only on an internal/admin deployment:

```bash
REACT_APP_ENABLE_ADMIN_PANEL=true
```

The admin enters the write key at runtime in the panel; it should not be compiled into the public frontend bundle.

Runtime config files are stored in:

```text
server/ai-gateway/data/merchant-configs/
```

This directory is intentionally ignored by git. Customer taste/preference storage remains controlled by `dataGovernance.customerProfileStorage` and defaults to local-only.

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

This file is ignored for production/pro/enterprise tenant requests. Production knowledge must come from runtime merchant knowledge, `AI_GATEWAY_KNOWLEDGE_URLS`, or `AI_GATEWAY_KNOWLEDGE_INLINE`.

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
