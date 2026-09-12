# Cossa AI OS — Phase 1 Full Audit

Date: 2026-09-12
Branch: `audit/phase1-safe-repair-20260912`
Base: `main`

## Production safety rule

This branch is intentionally isolated from `main`. Audit work must not alter live production behaviour, Supabase production data, Store publication gates, Astrum Smart Intake queues, payments, customer records, credentials, or production integrations.

Required sequence for all remediation:

`inspect -> classify -> change minimally -> test -> preview -> verify -> CEO checkpoint -> merge -> production verify`

No feature is considered working merely because a route, UI, employee profile, API key, or database table exists.

## Classification

Every capability is classified as one of:

- WORKING
- HIDDEN
- PARTIAL
- BROKEN
- DISCONNECTED
- MISSING
- DUPLICATED
- NEEDS VERIFICATION

Priority order:

- P0 — revenue generation, revenue protection, money saved, major CEO time saved
- P1 — runtime, automation, notifications, provider health, agent visibility, approvals
- P2 — company ownership, sidebar, discoverability, agent workspaces, information architecture
- P3 — click-by-click QA, 404s, dead controls, stale copy, duplicate screens, UX defects

## Confirmed architecture

### Agent runtime — EXISTS

The repository contains a substantial server-side agent runtime, browser runtime adapter, workforce data layer, AI streaming gateway, capability router, capability matrix, connected business data, and consolidated intelligence. This architecture must be preserved and upgraded rather than rebuilt.

### Workforce — EXISTS / PARTIAL

`/ai/workforce` already has employee, mission, handoff, run and approval concepts, plus six intended views: command, departments, employees, workflows, activity and control.

The employee operational model already tracks current task, last activity, assigned/pending/running/failed counts, approvals, provider/model, latest failure and retry readiness.

Observed product issue reported by CEO: the six AI Company views do not present sufficiently distinct information. This must be treated as a repair/UX separation problem, not grounds for a replacement workforce application.

### Specialist AI routes — EXISTS / PARTIAL

Several AI routes are owner-facing specialist chat workspaces. They are distinct from executable workforce employees. The existing architecture explicitly states that a specialist route must not claim execution unless workforce/system records verify it.

AI CEO currently has an owner-facing SpecialistChat route. This supports reasoning/chat but does not by itself implement an automatically published executive brief. CEO briefing automation remains a capability gap to verify and repair.

### Capability matrix — EXISTS / PARTIAL

The current capability matrix distinguishes live-data, draft-only, controlled execution and not-connected states. It correctly warns that UI presence is not proof of real external execution.

Upgrade required: operational provider health, dependency ownership, company/department ownership, last success, last failure, free-tier/quota state when verifiable, and execution evidence.

### Background workforce — PARTIAL / DISCONNECTED until verified

`vercel.json` currently has no Vercel cron entries. The capability matrix itself marks unattended background workforce execution as not connected. Other scheduler mechanisms (Supabase cron, Edge Functions, external workers or queues) must be audited before concluding that no background worker exists.

### Provider health — EXISTS / PARTIAL

The current provider-status client primarily exposes OpenAI configuration/connection state. It is not yet a common operational health layer for Groq, Gemini, OpenAI, Tavily, SerpAPI, NewsAPI, OpenRouteService or other production dependencies.

### Lead Hunter — EXISTS / PARTIAL — P0

Lead Hunter already exists and includes evidence-backed provider search, verification/filtering, revenue/service inference and CRM save paths. It must not be recreated.

Audit focus:

- provider auth/health
- raw candidate counts
- filtering/rejection causes
- verification counts
- CRM-save result
- duplicate handling
- zero-result diagnosis
- automatic scheduled execution
- daily/7d/30d counters
- Hot/Warm/Cold/Rejected classification
- notification/event publishing
- CEO briefing inclusion
- outcome verification

### Notifications — EXISTS / PARTIAL — P1

The Notifications route currently derives alerts from tasks, follow-ups, appointments, quotations and recent leads, with resolve/dismiss/snooze/escalate interaction records.

Gap: it is not yet a unified operational event stream receiving agent-run, provider-health, integration-failure, Lead Hunter, approval and CEO-brief events.

### Command Center — EXISTS / PARTIAL — P1/P2

The Command Center reads real CRM/business/workforce records on a refresh interval and intentionally avoids fabricated business-health scores.

Gap: it does not yet expose the required concise per-agent operational matrix with direct navigation into each canonical agent workspace and verified latest outcomes.

### Integration Center — EXISTS / PARTIAL — P1

The Integration Center contains a broad catalogue, but much of it is descriptive/planned rather than live health-backed. OpenAI has a concrete status check; most other integrations do not.

The operational rule must be:

`configured != healthy != recently successful`

### OpenRouteService — NEEDS VERIFICATION

No default-branch indexed match was found for `OpenRouteService` / `OPENROUTE` during the initial code search. Do not classify as missing yet. Check alternate naming, environment-only wiring, recent branches and server adapters before deciding.

### Store Smart Intake — EXISTS — PROTECT

`/businesses/store-smart-intake` is a real read-only control room backed by `astrum_intake_v13_queue`. It intentionally states that the server remains the engine and the UI must not publish, change CEO-approved prices or bypass gates.

Important verification gap: the screen currently displays `Automation active · every 10 min`, while Vercel cron is empty. Verify the actual scheduler source before changing either the worker or the label. Do not interrupt the queue.

### Navigation — EXISTS / PARTIAL — P2

The sidebar currently exposes Store-specific capabilities such as Product Manager, Digital Deliverables and Store Smart Intake at the same top navigation level as the five businesses. These Store-only capabilities should eventually be grouped under Cossa Store after ownership mapping is complete.

Do not reorganise navigation before capability ownership and route health are fully mapped.

## Revenue-first audit order

1. Lead Hunter / revenue acquisition / tenders / RFQs / CRM save path
2. CRM, leads, quotations, follow-ups, sales pipeline and opportunity radar
3. Store Smart Intake, Product Manager, inventory, suppliers, catalogue/publication and payment/order visibility
4. Construction revenue surfaces
5. Facility Services revenue surfaces
6. Cossa Tech revenue/client delivery surfaces
7. Marketing acquisition and conversion surfaces
8. CEO intelligence and revenue briefing
9. Runtime/worker/provider health and notifications
10. Navigation/agent workspaces
11. Full click-by-click route/action QA

## Global engineering rule

Existing first -> repair -> connect -> expose -> upgrade -> create only if genuinely missing.

Do not create a new AI employee merely because an existing employee lacks one capability. First determine whether the capability belongs to the existing role and can be added safely to that canonical employee.

## Cost rule

`PAID_SPEND_ALLOWED = false`

No new monthly subscription, paid SaaS plan, automatic billable API fallback or silent paid upgrade without explicit CEO approval. Prefer existing infrastructure, free tiers, caching, deduplication and shared verified intelligence.

## Next audit work

- Map every workforce employee and specialist route to company/department/role
- Inspect runtime execution and scheduler/worker pathways
- Inspect Lead Hunter end-to-end and provider diagnostics
- Inspect all P0 revenue routes and their real data source
- Inspect Store execution paths without touching Smart Intake queue
- Inspect provider/integration adapters and environment expectations
- Inspect notification/event storage schemas
- Inspect workforce/mission/run/approval Supabase migrations
- Compare active upgrade branches with `main` to identify hidden/unmerged capabilities
- Produce route ownership map before sidebar changes
- Run build/test/lint on the isolated branch before any behavioural PR
- Perform browser click-by-click QA only on preview/deployed non-production surface where available
