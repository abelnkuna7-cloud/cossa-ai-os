# Phase 1 — Visibility and Navigation Rules

Date: 2026-09-12
Branch: `fix/phase1-operational-truth`

## CEO requirement

Capabilities, employees, AI agents and company tools that already exist must not remain hidden simply because navigation does not expose them.

Visibility work is mandatory, but it must happen only after the capability has been audited, repaired where necessary, assigned to the correct company/department and verified not to be a duplicate.

## Required sequence

`audit -> classify -> repair/connect -> verify -> assign ownership -> expose -> click-test`

Do not expose a broken or misleading page merely to make the sidebar look complete.
Do not create a replacement page because an existing route is hidden.
Do not duplicate a canonical employee just to show it inside more than one company.

## Sidebar ownership rules

- Company-exclusive tools belong under that company.
- Cossa Store-only capabilities belong under Cossa Store.
- Cossa Tech-only capabilities belong under Cossa Tech.
- Construction-only capabilities belong under Cossa Nexus Construction.
- Facility Services-only capabilities belong under Cossa Facility Services.
- NexDocs-only capabilities belong under NexDocs.
- Group-wide/shared capabilities remain canonical group capabilities and may be linked from authorised company workspaces without cloning the underlying employee or tool.

## AI Company rules

`/ai/workforce` must provide genuinely distinct views:

- Company Center / Command — concise operational overview
- Departments — departments with owned/shared employees and current activity
- Employees — complete clickable canonical employee directory
- Workflows — real executable/controlled workflows and mission state
- Activity — real mission/run/event history
- Control — approvals, worker health, provider/integration health, retries and failures

Every employee card/highlight must eventually open the employee's canonical Agent Workspace rather than a duplicate employee page.

## Hidden capability rule

When the audit discovers an existing capability that is functional but hidden, classify it `HIDDEN`, determine its owner, then expose it at the correct navigation level after verification.

When the audit discovers an existing capability that is hidden and broken, classify it `BROKEN + HIDDEN`; repair first, then expose.

When the capability is partial, extend the existing capability before exposing it as complete.

Only a genuinely absent capability may be created.

## Safety

Navigation changes must not alter production data, prices, queues, publication gates, supplier records, payment processing, RLS, credentials or external execution permissions.

All navigation changes remain branch/preview changes until route checks and click-by-click QA pass.
