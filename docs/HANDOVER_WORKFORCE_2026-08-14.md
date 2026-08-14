# Cossa Growth Workforce — priority handover

**Date:** 14 August 2026  
**Priority chosen by owner:** Workforce employees first. Website Watch is deliberately paused.

## What was completed

A GitHub change was made to the live GROWTH source:

- Commit: `4f768f3f11f36d2245cac6e37561e0585605583f`
- File: `src/lib/workforce-data.ts`
- No existing employees, Lead Hunter records, missions, handoffs or CRM data were deleted or replaced.

Three missing workforce profiles were added:

1. **Customer Reactivation Analyst** — reviews only authorised records and consent status; prepares an internal reactivation brief.
2. **Broker & Deal Intelligence Analyst** — prepares source-labelled B2B opportunity and partner research; never contacts or represents Cossa.
3. **Procurement Intelligence Analyst** — prepares tender, RFQ, eligibility and deadline briefs; never submits a bid or contacts a procuring entity.

The existing **Lead Intake Coordinator** and **Product Intelligence Analyst** remain untouched. Product Intelligence already covers the experimental commerce/product-intelligence area, so no duplicate “Agentic Commerce” worker was created.

## Safety state

The three new roles are intentionally created as **draft / awaiting configuration**.

They may prepare internal, evidence-labelled briefs only after they are assigned through a future approved workflow. They cannot:

- send WhatsApps, emails or other messages;
- contact customers, partners, suppliers or procuring entities;
- create duplicate leads or alter CRM records;
- spend money, make pricing promises, submit bids or sign documents;
- claim consent, a deal, eligibility, an award or an outcome without verified evidence.

Existing workforce workflows use active employees only, so these draft roles will not silently run.

## One small action after the deployment completes

Open [GROWTH Workforce](https://growth.cossanexusholdings.co.za/ai/workforce), then click **Set up Cossa growth workforce** once.

That button safely inserts only workforce profiles that are missing. It will add the three new draft employees to the existing Cossa Growth database. It does not overwrite existing profiles.

Expected result:

- GROWTH source-team count: **10/10**.
- Actual database roster: **12 employees total** (the original 9 plus these 3).
- The three new profiles remain draft/awaiting configuration until assigned later.

## What to do on the next working session

1. Confirm the Vercel deployment for the commit above succeeded.
2. Click **Set up Cossa growth workforce** once and refresh the Workforce page.
3. Confirm the three new names appear.
4. Decide the first controlled use case:
   - customer reactivation (requires an approved CRM source plus recorded consent/opt-out rules);
   - broker/deal intelligence (requires owner-approved lawful data sources and a no-contact policy);
   - procurement intelligence (requires approved tender/RFQ source and owner review).
5. Build only the chosen controlled workflow. Keep the employee in draft until its evidence source, approval step and handoff destination are confirmed.
6. Preserve the existing Lead Hunter and `lead_id`; do not create a second CRM.

## Explicitly paused

- Website Watch and the protected Google Analytics connection troubleshooting.
- Any real outbound messaging, publishing, advertising, bidding, payment or CRM modification.
- Any claim that a connection is live before it is actually authorised and tested.

## Resume prompt

```
Continue the Cossa Growth Workforce upgrade from docs/HANDOVER_WORKFORCE_2026-08-14.md.

First verify the Vercel deployment for GitHub commit 4f768f3f11f36d2245cac6e37561e0585605583f and confirm that the owner clicked “Set up Cossa growth workforce” once at /ai/workforce.

Do not rebuild the workforce, delete records, replace Lead Hunter, create a second CRM or activate any external action.

The new draft employees are:
- Customer Reactivation Analyst
- Broker & Deal Intelligence Analyst
- Procurement Intelligence Analyst

Keep them in draft until we choose one use case and connect an authorised source with explicit approvals. Start by showing which 12 employees exist, their status and the safe next assignment options. Website Watch is paused unless the owner explicitly brings it back into scope.
```
