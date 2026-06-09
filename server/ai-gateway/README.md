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

## Current tools

- `search_menu`
- `search_products`
- `get_item_detail`
- `create_order_draft`

## Next architecture step

Replace the single orchestrator with an agent router: Triage, Menu Advisor, Product Sales, Order, Business Config, Analytics, Support, Privacy/Consent, and Campaign Agent.

MCP integrations should attach below the tool registry, not directly in the React UI.
