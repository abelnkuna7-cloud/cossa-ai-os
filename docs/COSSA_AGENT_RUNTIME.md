# Cossa Agent Runtime

The Agent Runtime extends the existing Growth application. It does not replace Cossa Store, NexDocs, Growth CRM, Supabase, CJ, Printify/POD, digital products or affiliate features.

## Operating model

```text
Business employee (accountability)
  -> specialist agent (execution)
  -> permission and tool router (what is allowed)
  -> durable Supabase task queue (what persists)
  -> hosted worker (when execution happens)
  -> approvals and audit events (what a human can review)
```

- An **employee** owns a business outcome, KPIs, scope and reporting line.
- An **agent** is a specialist execution capability working for that employee.
- Cossa Orchestrator assigns safe tasks, applies policies, records evidence and requests human approval when an action crosses a boundary.

## Lead Hunter proof

The first complete workflow is intentionally safe:

1. Cossa Orchestrator creates a mission and six dependent durable tasks.
2. Lead Research uses the existing evidence-validated Lead Hunter route.
3. Lead Enrichment uses permitted public evidence and, when configured, Hunter.
4. Lead Qualification uses the protected provider router: Groq, OpenAI, then Gemini by default.
5. CRM Safe Save uses the existing `leads` table, duplicate checks and a durable source identity before inserting verified prospects.
6. Outreach Drafting creates internal drafts and a pending owner review.

No stage sends email, WhatsApp, social posts, tenders, quotes or proposals. Approving a draft records a human review only; it does not become a send permission.

## Safety boundaries

- All provider and integration secrets are server/worker environment variables; none are `VITE_*`, database values or UI output.
- Unknown actions are denied by default. Policies explicitly require approval for communication, publishing, production deployment, DNS and payments; banking and production deletion are denied.
- Permission policies include READ, SEARCH, ANALYZE, DRAFT, WRITE_INTERNAL, WRITE_EXTERNAL, SEND, PUBLISH, DELETE, DEPLOY, FINANCIAL, PAYMENT, DNS_CHANGE, SECURITY_CHANGE and PRODUCTION_CHANGE classes. A mismatched or unclassified action is denied.
- The runtime leases tasks atomically, uses dependency checks and retry delay, opens circuit breakers after repeated provider/tool failures, and writes immutable execution events.
- Every queue RPC is organisation-scoped. A worker cannot claim another organisation's tasks.
- Browser users can read their organisation's runtime state but cannot directly change runtime agents, tool routes, policies, triggers, task leases, circuit state or audit records.
- Composio, Firecrawl, E2B and Browserbase are registered as prepared adapters. AgentMail is disabled until email migration and a separate owner approval. Hunter enrichment is implemented only for research use.

## Provider failure rules

The model router records provider, model and error category. It only tries the next configured provider for recoverable conditions: rate limiting, quota exhaustion, temporary provider failures, model unavailability, timeouts and transient network failures.

Malformed requests, authentication or permission failures, safety refusals and malformed provider output stop the route rather than replaying the same request with another provider. Authentication and permission failures keep that provider circuit open for a longer configuration-repair interval.

## 24/7 execution and connectivity

The browser is a control room, not a worker. After the application and `workers/cossa-agent-runtime` are deployed and the Cloudflare cron trigger has been verified, Cloudflare Cron wakes the protected Growth endpoint every minute. Tasks continue while the CEO laptop/phone is offline.

This does **not** make external APIs work without a network. Supabase, search providers, Hunter, Firecrawl and model providers still require internet connectivity from the hosted Worker/server. The CEO's local Wi-Fi is not part of that dependency.

## Safe activation checklist

1. Review and apply `20260826000000_cossa_agent_runtime.sql` through the normal Supabase migration process.
2. Add protected server environment values. At minimum: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PUBLIC_SITE_URL` and `AGENT_RUNTIME_WORKER_TOKEN`; add search and model keys appropriate to the enabled adapters.
3. Deploy Growth so `/api/agent-runtime` and `/api/agent-runtime/execute` are available.
4. Set the same runtime token as a Cloudflare Worker secret, deploy `workers/cossa-agent-runtime`, and verify its logs.
5. Open **AI Tools → Cossa Orchestrator**, queue a manual Lead Hunter proof, review the CRM records and approve/reject the internal outreach drafts.
6. Only then choose whether to enable the paused daily Lead Hunter trigger.

The worker health route deliberately reports deployment verification as required until Cloudflare has been checked. No deployment, migration, secret write, email migration, DNS action, payment, banking action or customer communication occurs merely by merging this code.
