# Lead Hunter production diagnostic — 2026-09-12

## Scope

Read-only production diagnosis plus immediate containment of a failing scheduled Lead Hunter workflow. No Store product, pricing, payment, supplier, customer, or publication data was changed.

## Confirmed production state

The hosted runtime worker is active and reaches `/api/agent-runtime/execute` independently of the browser.

The existing Lead Hunter schedule was already **ACTIVE** in production with a 1440-minute interval. It had fired daily and created the `lead_hunter_proof_v1` workflow.

This contradicted the earlier branch-only assumption that the schedule was still paused. Production data is authoritative.

## Latest observed hunt

The 2026-09-12 scheduled research stage completed with:

- workflow outcome: `PARTIAL_PROVIDER_FAILURE`
- Tavily: succeeded, 20 candidates
- SerpAPI: timed out after ~25 seconds
- NewsAPI: HTTP 401 / invalid API key
- accepted prospects: 0
- rejected prospects: 20
- verified prospects: 0

The quality-control layer rejected directories/aggregators, informational/sector-mismatched and unsupported evidence rather than inventing leads. Returning zero was therefore safer than promoting weak evidence.

## Downstream failure

The qualification stage failed after three attempts because no configured model provider could complete the task.

Confirmed provider circuit evidence:

- Groq: `model_unavailable`; configured default `llama-3.3-70b-versatile` is retired for free/developer-tier usage.
- OpenAI: `quota_exhausted`; production reports no API credits remaining.
- Gemini did not appear as a successful fallback in the observed run and therefore remains **NEEDS VERIFICATION**.

No paid OpenAI credits were purchased or enabled.

## Containment performed

1. Paused the existing production trigger `Lead Hunter scheduled research` so it cannot continue consuming search/model quota while the chain is degraded.
2. Cancelled only queued `lead_hunter_proof_v1` downstream CRM-save/outreach tasks whose upstream dependency had already failed or been cancelled. These tasks could not legitimately complete and no external action was sent.
3. Verified the remaining queued Lead Hunter proof-task count is zero.
4. Added a branch-only Vercel runtime override:
   `AGENT_GROQ_MODEL=openai/gpt-oss-120b`
   using Groq's currently recommended replacement path for the retired Llama 3.3 70B free/developer model.
5. Added a regression test so the retired Groq model cannot silently return as the Vercel runtime override.

## Current classification

- Hosted worker: **EXISTS & WORKING**
- Scheduled Lead Hunter trigger: **PAUSED BY SAFETY CONTAINMENT**
- Tavily: **WORKING in latest production hunt**
- SerpAPI: **DEGRADED / TIMEOUT observed**
- NewsAPI: **BROKEN / AUTH ERROR**
- Groq runtime model: **BROKEN IN PRODUCTION / REPAIR PREPARED ON BRANCH**
- OpenAI model fallback: **UNAVAILABLE / NO CREDITS**
- Gemini fallback: **NEEDS VERIFICATION**
- Evidence filtering: **WORKING / FAIL-CLOSED**
- Automatic external outreach: **DISABLED**
- Blocked queued CRM/outreach tasks: **CLEANED**

## Re-enable gate

Do not reactivate the Lead Hunter production schedule until all of the following are true:

1. replacement Groq model is deployed and verified with a controlled task;
2. model fallback truth (including Gemini) is visible;
3. NewsAPI is repaired or intentionally disabled without being treated as healthy;
4. provider timeout/auth failures remain visible;
5. the trusted durable-history path is deployed;
6. one controlled Lead Hunter run completes without fabricated prospects;
7. zero verified prospects remains an acceptable, explicit outcome;
8. schedule can still be paused immediately and no external outreach is automatic.
