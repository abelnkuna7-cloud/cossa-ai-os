# Cossa AI OS — Phase 1 Safe Repair Plan

Date: 2026-09-12
Audit branch: `audit/phase1-safe-repair-20260912`
Production branch: `main`

## Finish-line definition

Phase 1 is complete only when the CEO can open GROWTH and immediately answer:

1. Which AI employees worked today?
2. What did each employee actually accomplish?
3. What revenue opportunities were found?
4. What failed and why?
5. Which provider/integration caused or recovered from the failure?
6. What needs CEO approval?
7. What will run next and when?
8. Can the CEO click directly into the responsible canonical employee and issue a tracked command?

No screen may claim an employee is working, an integration is healthy, a task succeeded, or an external action occurred without supporting records.

## Safety model

All behavioural work follows:

`audit -> classify -> repair branch -> minimal change -> unit tests -> build -> preview -> click QA -> CEO checkpoint -> merge -> production verify`

Production rules:

- no direct experimental edits on `main`
- no destructive migrations
- no bulk product publication
- no Store price changes
- no supplier orders
- no external outreach from Lead Hunter
- no automatic tender submission
- no paid service or billable fallback without explicit CEO approval
- no weakening of RLS, approval gates or credential boundaries
- no silent replacement of working production integrations

## Batch 0 — Full audit and recovery map

Status: IN PROGRESS

Deliverables:

- architecture map
- workforce ownership map
- P0 revenue audit
- route/company ownership map
- scheduler/runtime map
- provider/integration map
- hidden branch recovery map
- 404/dead-route QA plan

No production behaviour changes in Batch 0.

## Batch 1 — Operational truth and runtime visibility

Goal: expose what already exists before enabling more automation.

Reuse:

- `agent_execution_events`
- `agent_circuit_breakers`
- `agent_triggers`
- `capability_registry`
- runtime worker heartbeat
- mission/run/handoff/approval records

Add/repair only where needed:

- runtime health summary
- worker last-seen and verified state
- trigger status and next-run visibility
- provider/tool status from real circuit/capability evidence
- latest success/failure and error reason
- safe free-tier/capacity state where actually observable

Finish gate:

The UI can truthfully distinguish Configured, Healthy, Degraded, Failed, Quota/Rate Limited, Not Configured and Worker Not Verified without exposing secrets.

## Batch 2 — Lead Hunter repair and zero-result diagnostics

Goal: make Lead Hunter explain and prove each hunt.

Reuse existing Lead Hunter search, verification, provider diagnostics, CRM duplicate protection and cache.

Required operational stages:

- search plans generated
- provider requests attempted
- provider raw results
- normalized candidates
- filtered/rejected candidates
- verified candidates
- retained prospects
- CRM created
- CRM duplicate
- CRM save failure

Required rejection/failure explanation:

- provider auth failure
- rate/quota limit
- timeout/provider unavailable
- no provider results
- filtered as competitor/directory/job/informational source
- insufficient evidence
- missing public contact route
- below score
- expired/unverified procurement
- duplicate CRM record

Finish gate:

A zero-result hunt tells the CEO whether the problem was provider, search coverage, filters, evidence, duplicates or genuine lack of verified opportunity.

## Batch 3 — Lead Hunter daily revenue intelligence

Goal: Lead Hunter becomes a daily operating surface rather than only a manual form.

Required periods:

- Today
- 7 days
- 30 days

Required counters:

- hunts
- candidates researched
- verified
- Hot
- Warm
- Cold
- Research
- Rejected
- Duplicates
- CRM-created
- tenders/RFQs
- supplier/partner opportunities
- follow-ups due where traceable

Each retained prospect must preserve evidence, classification reason, confidence/score, recommended Cossa company/service and legitimate next action.

Finish gate:

The CEO can see what Lead Hunter accomplished without opening raw search results.

## Batch 4 — Agent activity reporting and canonical Agent Workspace

Goal: one reusable employee workspace, not duplicated custom pages.

Route pattern should use a canonical employee key/ID and support authorised company context.

Workspace sections:

`Overview | Current Work | Results | Chat / Command | Activity | Approvals | Tools | History`

Informational chat does not create a mission.

Action command creates a mission/run/handoff record and is therefore trackable.

Finish gate:

Every employee card/highlight can open the real employee and show current task, last activity, real results, failures, next run, tools and approvals.

## Batch 5 — AI Company view repair

Goal: make the existing six workforce views actually different and useful.

- Company Center / Command: company-wide summary and orchestration
- Departments: departments with employee/activity summaries
- Employees: complete clickable canonical employee directory
- Workflows: real missions, workflow stages and handoffs
- Activity: real run/event history
- Control: approvals, runtime health, failed/retry work and operational controls

Finish gate:

Clicking a different view changes the information purpose, not only the selected tab styling.

## Batch 6 — Unified Notifications read model

Goal: keep existing business notifications and add selected operational events.

Do not create a duplicate immutable event store when `agent_execution_events` already exists.

Combine owner-facing read models from:

- tasks
- follow-ups
- appointments
- quotations
- leads
- approvals
- selected agent execution events
- provider/integration failures
- Lead Hunter material results
- CEO brief publication

Preserve `notification_interactions` for resolve/dismiss/snooze/escalate actions.

Finish gate:

Important AI/runtime activity appears in Notifications with evidence and a direct route to the responsible record/agent.

## Batch 7 — CEO Executive Intelligence

Goal: turn AI CEO from mainly chat/reasoning into a verified executive reporting process.

Inputs:

- CRM and revenue records
- Lead Hunter verified outcomes
- quotation/pipeline facts
- Store operational facts
- workforce missions/runs/events
- provider/integration health
- approvals and critical failures

Output:

- timestamped executive brief
- revenue opportunities
- risks/blockers
- completed work
- failures
- approvals needed
- next recommended actions

No fabricated revenue, sales, customer activity, system health or completed actions.

Finish gate:

Latest verified CEO brief is visible from Command Center and AI CEO workspace.

## Batch 8 — Company-first navigation

Goal: put capabilities where the CEO expects them without duplicating records or employees.

Rules:

- Store-only features live under Cossa Store
- Tech-only features live under Cossa Tech
- Construction-only features live under Construction
- Facility-only features live under Facility Services
- NexDocs-only features live under NexDocs
- shared canonical employees/capabilities can be entered from multiple company contexts

Company AI Team links should open the workforce pre-filtered to that company/context.

Finish gate:

The CEO does not need to search around the platform for a company-specific tool or employee.

## Batch 9 — Controlled Lead Hunter automation

Do this only after Batches 1–3 verify runtime/provider truth.

Preconditions:

- hosted worker heartbeat verified
- free-tier/provider availability visible
- search caching and dedup working
- no paid fallback
- no external outreach
- failures visible
- schedule can be paused immediately

Start in preview/test or a controlled low-frequency configuration. Production activation requires CEO checkpoint.

Finish gate:

Scheduled hunts run device-independently, respect cost/quotas, produce verifiable results/events, and fail visibly rather than silently.

## Batch 10 — Full click-by-click QA

Run only on preview/non-production where actions could mutate records. Production smoke tests remain read-only or explicitly controlled.

Check:

- every sidebar link
- company cards
- AI Company tabs
- employee cards
- Agent Workspace tabs
- workflow links
- notification links
- approval links
- Lead Hunter actions
- CRM transitions
- quotation links
- Store operational links
- browser back/forward navigation
- direct URL loads
- mobile navigation

Classify defects:

- 404
- blank route
- runtime error
- wrong destination
- stale/duplicate page
- dead button
- misleading success
- missing loading/error state
- broken mobile interaction

Finish gate:

No known P0/P1 navigation/runtime errors remain, and all P2/P3 defects are either fixed or explicitly documented with priority.

## Batch 11 — Controlled production release

Release sequence:

1. branch current with latest `main`
2. tests pass
3. build passes
4. preview QA passes
5. migrations reviewed and additive only
6. CEO checkpoint
7. merge
8. deployment verification
9. runtime heartbeat/provider health verification
10. Lead Hunter/CRM/Notifications/CEO brief smoke verification
11. Store Smart Intake and payment/publication regression check
12. production incident rollback path confirmed

## Stop conditions

Stop and do not merge when:

- tests/build fail
- production schema assumptions are unverified
- a change needs destructive migration
- a provider could start billing unexpectedly
- a schedule can run without observable health/failure state
- RLS or approval boundaries would be weakened
- Store publication/pricing/payment behaviour changes unintentionally
- a feature reports success without outcome verification

## Current conclusion

Cossa AI OS already contains most of the structural foundations needed for Phase 1: canonical employees, missions, handoffs, approvals, durable agent tasks, triggers, execution events, circuit breakers, capability truth registry, Lead Hunter, CRM and company workspaces.

The first engineering objective is therefore not new-agent creation. It is to recover, repair, connect, expose and operationalise those foundations safely.
