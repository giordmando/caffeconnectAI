# AI Gateway Roadmap

## First implementation step

Start from branch `main` and introduce a server-side AI Gateway before adding visible agent features.

The gateway owns server-side model credentials, Responses API calls, tool/function execution, business context injection, demo mode fallback, and future tracing, consent, rate limits, and cost controls.

## Target agent ecosystem

1. Triage Agent
2. Menu Advisor Agent
3. Product Sales Agent
4. Order Agent
5. Business Config Agent
6. Analytics Agent
7. Support Agent
8. Privacy/Consent Agent
9. Campaign Agent

## MCP/SCP note

The protocol to prioritize is MCP. MCP servers should be connected behind the gateway/tool registry for POS, CRM, Google Sheets, inventory, documents, or analytics. The React app should consume one product API, not direct AI/MCP integrations.
