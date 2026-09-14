# Cossa AI OS — Phase 1 P0 Revenue Audit

Date: 2026-09-12
Branch: `audit/phase1-safe-repair-20260912`
Base: `main`

## Scope

P0 means revenue generation, revenue protection, cash-flow support, or major CEO time savings. This document is audit-only. It does not enable schedules, mutate production queues, change customer records, alter Store pricing/publication, or introduce paid services.

Global rule:

`existing -> repair -> connect -> expose -> upgrade -> create only if genuinely missing`

## 1. Lead Hunter

Classification: **EXISTS / PARTIAL — P0**

Confirmed existing capability:

- canonical workforce employee `lead-hunter`
- authenticated `/api/lead-hunter/search` server workflow
- Tavily, SerpAPI and NewsAPI provider support
- evidence verification and source trust logic
- competitor, directory, recruitment and weak-source rejection
- South African government/procurement verification logic
- Hot/Warm/Cold/Research priority model
- tender/RFQ/RFP/supplier-registration/subcontracting/partnership discovery
- CRM duplicate checking and CRM save functions
- persistent search caching
- retained hunt/prospect/lead identifiers
- provider diagnostics in the search response
- durable runtime support for scheduled Lead Hunter tasks

Confirmed gaps/repair targets:

- daily operational dashboard is not yet the primary Lead Hunter experience
- Today / 7d / 30d hunted, verified, Hot, Warm, Cold, rejected, duplicate and procurement counters are not yet exposed as required
- provider diagnostics exist but are not yet surfaced as a simple operational health/zero-result explanation for the CEO
- pipeline-stage counts such as raw candidates -> filtered -> verified -> retained are not yet clearly surfaced
- automatic execution depends on a hosted runtime tick that is still unverified
- Lead Hunter results do not yet publish into the common owner notification/event experience
- CEO brief inclusion is not yet a verified automated outcome

## 2. Lead Hunter schedule and background execution

Classification: **ENGINE EXISTS / SCHEDULE EXISTS / PRODUCTION TRIGGER NEEDS VERIFICATION — P0/P1**

The runtime migration already creates `agent_triggers` and seeds a schedule named `Lead Hunter scheduled research`.

Seed state:

- trigger type: `schedule`
- status: `paused`
- interval: `1440` minutes
- default target: Cossa Facility Services commercial cleaning in Gauteng
- default result count: 10

The normal runtime API can activate/pause the schedule and update its configuration.

The durable runtime function `enqueue_due_agent_triggers` advances due schedules and creates idempotent queued tasks. `runAgentRuntimeTick()` calls that function before claiming work.

The protected `/api/agent-runtime/execute` endpoint can execute a runtime tick when called by an authenticated hosted worker.

Important production finding:

- repository `vercel.json` has no cron entries
- no indexed repository match was found for `cron.schedule`, `pg_cron` or `net.http_post`
- the current server entry does not contain an internal recurring runtime loop

Therefore do **not** enable the Lead Hunter schedule yet. First verify whether another external/hosting mechanism is already calling `/api/agent-runtime/execute` in production.

## 3. Runtime observability

Classification: **EXISTS / HIDDEN / PARTIAL — P1**

The runtime already writes immutable `agent_execution_events` and records `runtime_worker_heartbeat` after an authenticated worker tick.

The orchestration dashboard considers the worker deployment verified only if the latest worker heartbeat is less than five minutes old.

This means we should reuse the existing heartbeat/event model rather than invent a second worker-health table.

Required UI exposure:

- worker configured?
- worker last seen
- deployment verified?
- last tick claimed/completed/retried/failed
- scheduled triggers queued
- latest runtime failure
- affected agents/capabilities

## 4. Capability truth registry

Classification: **EXISTS / HIDDEN / PARTIAL — P1**

The existing `capability_registry` already stores:

- business unit
- responsible employee
- capability key/name/module/purpose
- data sources
- required integration
- operational status
- automation status
- approval requirement
- business impact
- last success
- last failure
- last error
- verification time

This is already close to the capability-health registry we planned. It should be upgraded and surfaced rather than replaced.

Seeded capabilities already include:

- Growth CRM
- Store catalogue
- Lead Hunter
- Cossa Orchestrator
- model provider router
- outreach drafting
- social publishing

Required upgrade:

- map provider/tool dependency health
- expose last success/failure in Integration Center and Agent Workspace
- include free-tier/quota/capacity posture only where verifiable
- connect current execution events to capability outcome updates consistently

## 5. Agent event stream and notifications

Classification: **EVENT STORE EXISTS / NOTIFICATION CONSUMPTION PARTIAL — P1**

Do not create a duplicate generic agent-event table.

Existing layers:

- `agent_execution_events`: immutable runtime/agent events
- `notification_interactions`: immutable owner actions such as opened/resolved/dismissed/snoozed/escalated
- current Notifications page: derives alerts from tasks, follow-ups, appointments, quotations and recent leads

Required repair:

Create a unified read model that can consume both business alerts and selected `agent_execution_events` without changing the immutable source records.

Examples that should become owner-facing events:

- Lead Hunter completed with Hot/Warm opportunities
- Lead Hunter returned zero verified results with reason
- provider authentication/rate/quota failure
- fallback provider used
- employee mission failed or recovered
- approval required
- CEO brief published
- Store/supplier/customer critical operational event

## 6. CRM / Leads

Classification: **EXISTS / WORKING FOUNDATION / COMPANY OWNERSHIP PARTIAL — P0**

Existing:

- production `salesLeads` CRUD
- lead scoring
- Hot threshold in current UI
- lead qualification
- conversion to opportunity
- source/company/contact context preservation
- Lead Hunter CRM save and duplicate handling

Current issue:

The stable `SalesLead` UI model does not expose a dedicated canonical business-unit/company ownership field. `company` currently represents prospect/company context, not necessarily which Cossa subsidiary owns the lead.

Before creating separate company CRMs, audit the underlying lead schema and ownership migrations. Preferred repair is a single canonical CRM with business-unit ownership/filtering.

## 7. Sales journey / opportunities

Classification: **EXISTS / PARTIAL — P0**

The current sales journey supports:

`Lead -> Qualify -> Opportunity`

Opportunity UI stages include prospect, qualified, proposal, negotiation, won and lost, while the production database currently collapses proposal/negotiation into `engaged` with an internal UI-stage marker.

Repair focus:

- verify lead-to-opportunity source traceability end to end
- company/business-unit ownership
- next-action/follow-up visibility
- Lead Hunter-to-Lead Intake-to-Sales handoff evidence
- avoid duplicate opportunity creation
- ensure dashboard counts are derived from canonical records

## 8. Quotations

Classification: **EXISTS / PARTIAL — P0**

Existing quotation workspace supports:

- quote number
- service/business division
- description/scope
- customer
- linked opportunity
- amount
- status
- validity date
- open and accepted quotation value

The current UI correctly distinguishes accepted quotation value from cash received.

Repair/verification focus:

- `service / business division` is currently free text in the UI; verify whether canonical business-unit ownership exists underneath
- verify opportunity linkage and customer linkage
- verify quotation-to-follow-up notification flow
- ensure company workspaces can open pre-filtered quotations without creating duplicate quotation systems

## 9. Construction revenue workspace

Classification: **EXISTS / NAVIGATION PARTIAL — P0/P2**

Construction already links to Lead Hunter, CRM, quotations, tender research, documents, projects, marketing, SEO, content, analytics and workflows.

Problem:

- `Construction AI Team` routes to generic `/ai/workforce`
- `Tender Research` also routes to generic `/ai/workforce`

Repair direction:

Use canonical workforce with company/department/employee context, e.g. Construction AI Team -> filtered relevant employees; Tender Research -> Procurement Intelligence employee/workspace or workforce view focused on procurement. Do not create duplicate Construction employees solely for navigation.

## 10. Facility Services revenue workspace

Classification: **EXISTS / NAVIGATION PARTIAL — P0/P2**

Facility Services already links customer acquisition, CRM, quotations, projects, tasks, calendar, documents, marketing, SEO, content, analytics, workflows and business intelligence.

Problem:

- `Facility Services AI Team` routes to generic `/ai/workforce`

Repair direction:

Open canonical shared revenue/growth/operations employees pre-filtered for Facility Services rather than creating a duplicate AI team.

## 11. CEO revenue intelligence

Classification: **REASONING EXISTS / AUTOMATIC BRIEF PARTIAL OR MISSING — P0/P1**

The AI CEO specialist exists and the revenue workflow already ends with AI CEO review.

What is not yet verified:

- automatic scheduled executive brief generation
- persisted daily brief record
- latest brief on Command Center
- event-triggered brief updates for material revenue/runtime changes

Repair should reuse verified CRM, runtime, agent events and capability truth. No invented revenue or performance figures.

## 12. P0 safe repair order

1. Verify hosted runtime trigger/heartbeat in a non-destructive way.
2. Expose existing runtime/capability/provider truth before enabling automation.
3. Repair Lead Hunter diagnostics and zero-result explanation.
4. Add Lead Hunter Today / 7d / 30d operational counters from canonical data/events.
5. Verify CRM ownership/source traceability and add business-unit filtering rather than duplicate CRMs.
6. Connect Lead Hunter outcomes to selected immutable agent events and Notifications read model.
7. Expose canonical employee activity and direct employee navigation.
8. Add CEO revenue brief generation/persistence from verified evidence.
9. Only after worker/provider/quota/cost verification, enable a controlled Lead Hunter schedule in preview/test and then production with CEO approval.
10. Complete company-filtered navigation and full click-by-click QA.

## Production guardrails

- Never enable paid fallback automatically.
- Never automatically contact Lead Hunter prospects.
- Never submit bids or tenders automatically.
- Never create duplicate CRM records for activity metrics.
- Never treat an API 200 as task success without verifying the requested outcome.
- Never enable a schedule until worker health and provider capacity are visible.
- Never mutate Store Smart Intake, product prices, payment records or publication gates as part of this revenue audit.
- Any production migration must be additive, idempotent and separately reviewed.
